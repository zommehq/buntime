import { decrypt, encrypt, isVaultConfigured } from "@/helpers/crypto.ts";
import { resolveReferences } from "@/helpers/secret-resolver.ts";
import { getParameterTypeName, getParameterTypeValue } from "@/shared/enums/vault-enum.ts";
import type { ClusterSpaceClientRepository } from "../repositories/cluster-space-client.repository.ts";
import type { ParameterVersionRepository } from "../repositories/parameter-version.repository.ts";
import type { VaultRepository } from "../repositories/vault.repository.ts";
import type { clusterSpaceParameters, NewParameter } from "../routes/vault/vault.schema.ts";
import type { AuditLogService } from "./audit-log.service.ts";

type Parameter = typeof clusterSpaceParameters.$inferSelect;

function computeExpirationStatus(expiresAt: Date | null | undefined): string {
  if (!expiresAt) return "active";
  const now = new Date();
  if (expiresAt < now) return "expired";
  const daysLeft = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  if (daysLeft <= 30) return "expiring_soon";
  return "active";
}

export type ActorInfo = {
  actorEmail?: string;
  actorUsername?: string;
  ipAddress?: string;
};

export class VaultService {
  constructor(
    private parametersRepository: VaultRepository,
    private clusterSpaceClientRepository: ClusterSpaceClientRepository,
    private auditLogService?: AuditLogService,
    private parameterVersionRepository?: ParameterVersionRepository,
  ) {}

  async getParameters(clusterSpaceUUID: string, onlyRoots: boolean, path?: string) {
    const clusterSpaceClientId = await this.getClusterSpaceClientId(clusterSpaceUUID);

    let parameters: Parameter[];

    if (path != null && path.trim() !== "") {
      const keys = path.split(".");
      const currentNode = await this.parametersRepository.findParametersByPath(
        clusterSpaceClientId,
        keys,
      );

      if (currentNode == null) {
        throw new Error("ParameterNotFoundException");
      }

      const descendants = [currentNode];
      const children = await this.parametersRepository.findDescendants(
        clusterSpaceClientId,
        currentNode.clusterSpaceParameterId,
      );
      descendants.push(...children);

      parameters = descendants.sort((a, b) =>
        (a.description || "").localeCompare(b.description || ""),
      );
    } else if (!onlyRoots) {
      parameters = await this.parametersRepository.findAllParameters(clusterSpaceClientId);
    } else {
      parameters = await this.parametersRepository.findRootParameters(clusterSpaceClientId);
    }

    return this.buildTree(parameters);
  }

  async getChildrenById(clusterSpaceUUID: string, id: number) {
    const clusterSpaceClientId = await this.getClusterSpaceClientId(clusterSpaceUUID);
    const children = await this.parametersRepository.findChildrenByParentId(
      clusterSpaceClientId,
      id,
    );
    return this.buildTree(children);
  }

  async createParameter(
    clusterSpaceUUID: string,
    parameterData: {
      description: string;
      key: string;
      value?: string | null;
      type: string;
      parentId?: number | null;
      children?: any[];
      expiresAt?: string | null;
      rotationIntervalDays?: number | null;
    },
    actor?: ActorInfo,
  ) {
    const clusterSpaceClientId = await this.getClusterSpaceClientId(clusterSpaceUUID);
    const createdParameters = await this.createParameterRecursive(
      clusterSpaceClientId,
      parameterData,
      parameterData.parentId,
      actor,
    );
    return this.buildTree(createdParameters);
  }

  async deleteParameter(clusterSpaceUUID: string, id: number, actor?: ActorInfo): Promise<void> {
    const clusterSpaceClientId = await this.getClusterSpaceClientId(clusterSpaceUUID);
    const parameter = await this.parametersRepository.findParameterById(id);

    if (!parameter) {
      throw new Error("ParameterNotFoundException");
    }

    await this.parametersRepository.deleteParameter(id);

    // Log deletion for SECRET parameters
    const typeName = getParameterTypeName(parameter.parameterType);
    if (typeName === "SECRET" && this.auditLogService) {
      await this.auditLogService.log({
        parameterId: null, // FK set to null on delete
        clientId: clusterSpaceClientId,
        parameterKey: parameter.parameterKey,
        action: "deleted",
        ...actor,
      });
    }
  }

  async revealParameter(clusterSpaceUUID: string, id: number, actor?: ActorInfo): Promise<string> {
    const clusterSpaceClientId = await this.getClusterSpaceClientId(clusterSpaceUUID);
    const param = await this.parametersRepository.findParameterById(id);
    if (!param) throw new Error("ParameterNotFoundException");
    if (getParameterTypeName(param.parameterType) !== "SECRET") {
      throw new Error("ParameterNotSecretException");
    }
    if (!isVaultConfigured()) throw new Error("VaultNotConfiguredException");

    const value = await decrypt(param.parameterValue || "");

    // Log reveal action
    if (this.auditLogService) {
      await this.auditLogService.log({
        parameterId: param.clusterSpaceParameterId,
        clientId: clusterSpaceClientId,
        parameterKey: param.parameterKey,
        action: "revealed",
        ...actor,
      });
    }

    return value;
  }

  async updateParameter(
    clusterSpaceUUID: string,
    id: number,
    parameterData: {
      description: string;
      key: string;
      value?: string | null;
      type: string;
      parentId?: number | null;
      expiresAt?: string | null;
      rotationIntervalDays?: number | null;
    },
    actor?: ActorInfo,
  ) {
    const clusterSpaceClientId = await this.getClusterSpaceClientId(clusterSpaceUUID);

    const existingParameter = await this.parametersRepository.findParameterById(id);
    if (!existingParameter) {
      throw new Error("ParameterNotFoundException");
    }

    await this.checkDuplicatedKeyParameter(
      clusterSpaceClientId,
      parameterData.key,
      parameterData.parentId,
      id,
    );

    if (parameterData.parentId) {
      const parentExists = await this.parametersRepository.findParameterById(
        parameterData.parentId,
      );
      if (!parentExists) {
        throw new Error("ParameterParentNotFoundException");
      }
    }

    const typeValue = getParameterTypeValue(parameterData.type);
    if (typeValue === undefined) {
      throw new Error(`Invalid parameter type: ${parameterData.type}`);
    }

    const isSecret = parameterData.type.toUpperCase() === "SECRET";
    const wasSecret = getParameterTypeName(existingParameter.parameterType) === "SECRET";

    const updateData = {
      clusterSpaceParameterId: id,
      clusterSpaceClientId,
      clusterSpaceParameterParentId: parameterData.parentId || null,
      description: parameterData.description,
      parameterKey: parameterData.key,
      parameterValue: parameterData.value || null,
      parameterType: typeValue.toString(),
      expiresAt: isSecret && parameterData.expiresAt ? new Date(parameterData.expiresAt) : null,
      rotationIntervalDays: isSecret ? (parameterData.rotationIntervalDays ?? null) : null,
    };

    if (isSecret) {
      if (!isVaultConfigured()) throw new Error("VaultNotConfiguredException");
      // If value is empty/null, keep the existing encrypted value (user didn't change it)
      if (!parameterData.value) {
        updateData.parameterValue = existingParameter.parameterValue;
      } else {
        updateData.parameterValue = await encrypt(parameterData.value);
      }
    } else if (wasSecret && !isSecret) {
      // SECRET -> non-SECRET: decrypt and store as plaintext
      if (existingParameter.parameterValue && isVaultConfigured()) {
        updateData.parameterValue = await decrypt(existingParameter.parameterValue);
      }
    }

    const updatedParameter = await this.parametersRepository.updateParameter(id, updateData);

    // Log update for SECRET parameters
    if ((isSecret || wasSecret) && this.auditLogService) {
      await this.auditLogService.log({
        parameterId: updatedParameter.clusterSpaceParameterId,
        clientId: clusterSpaceClientId,
        parameterKey: updatedParameter.parameterKey,
        action: "updated",
        oldValue: existingParameter.parameterValue ?? undefined,
        ...actor,
      });
    }

    // Auto-version on SECRET update with new value
    if (
      isSecret &&
      parameterData.value &&
      this.parameterVersionRepository &&
      updatedParameter.parameterValue
    ) {
      const latestVersion = await this.parameterVersionRepository.getLatestVersion(
        updatedParameter.clusterSpaceParameterId,
      );
      await this.parameterVersionRepository.createVersion({
        clusterSpaceParameterId: updatedParameter.clusterSpaceParameterId,
        encryptedValue: updatedParameter.parameterValue,
        version: latestVersion + 1,
        createdBy: actor?.actorEmail ?? null,
      });
    }

    return this.buildTree([updatedParameter]);
  }

  private async createParameterRecursive(
    clusterSpaceClientId: number,
    parameterData: any,
    parentId?: number | null,
    actor?: ActorInfo,
  ): Promise<Parameter[]> {
    await this.checkDuplicatedKeyParameter(clusterSpaceClientId, parameterData.key, parentId);

    if (parentId) {
      const parentExists = await this.parametersRepository.findParameterById(parentId);
      if (!parentExists) {
        throw new Error("ParameterParentNotFoundException");
      }
    }

    const typeValue = getParameterTypeValue(parameterData.type);
    if (typeValue === undefined) {
      throw new Error(`Invalid parameter type: ${parameterData.type}`);
    }

    const isSecretType = parameterData.type.toUpperCase() === "SECRET";

    let parameterValue: string | null = parameterData.value || null;
    if (isSecretType) {
      if (!isVaultConfigured()) throw new Error("VaultNotConfiguredException");
      parameterValue = await encrypt(parameterData.value || "");
    }

    const newParameterData = {
      clusterSpaceClientId,
      clusterSpaceParameterParentId: parentId || null,
      description: parameterData.description,
      parameterKey: parameterData.key,
      parameterValue,
      parameterType: typeValue.toString(),
      expiresAt: isSecretType && parameterData.expiresAt ? new Date(parameterData.expiresAt) : null,
      rotationIntervalDays: isSecretType ? (parameterData.rotationIntervalDays ?? null) : null,
    };

    const createdParameter = await this.parametersRepository.createParameter(
      newParameterData as NewParameter,
    );
    const allCreatedParameters = [createdParameter];

    // Log creation for SECRET parameters
    if (isSecretType) {
      if (this.auditLogService) {
        await this.auditLogService.log({
          parameterId: createdParameter.clusterSpaceParameterId,
          clientId: clusterSpaceClientId,
          parameterKey: createdParameter.parameterKey,
          action: "created",
          ...actor,
        });
      }
      // Create version 1
      if (this.parameterVersionRepository && createdParameter.parameterValue) {
        await this.parameterVersionRepository.createVersion({
          clusterSpaceParameterId: createdParameter.clusterSpaceParameterId,
          encryptedValue: createdParameter.parameterValue,
          version: 1,
          createdBy: actor?.actorEmail ?? null,
        });
      }
    }

    if (parameterData.children && parameterData.children.length > 0) {
      for (const child of parameterData.children) {
        const createdChildren = await this.createParameterRecursive(
          clusterSpaceClientId,
          child,
          createdParameter.clusterSpaceParameterId,
          actor,
        );
        allCreatedParameters.push(...createdChildren);
      }
    }

    return allCreatedParameters;
  }

  async getVersions(
    clusterSpaceUUID: string,
    parameterId: number,
    limit?: number,
    offset?: number,
  ) {
    await this.getClusterSpaceClientId(clusterSpaceUUID);
    const param = await this.parametersRepository.findParameterById(parameterId);
    if (!param) throw new Error("ParameterNotFoundException");
    if (getParameterTypeName(param.parameterType) !== "SECRET") {
      throw new Error("ParameterNotSecretException");
    }
    if (!this.parameterVersionRepository) {
      return { versions: [], total: 0 };
    }
    const versions = await this.parameterVersionRepository.findByParameterId(
      parameterId,
      limit,
      offset,
    );
    return { versions, total: versions.length };
  }

  async rollbackToVersion(
    clusterSpaceUUID: string,
    parameterId: number,
    versionId: number,
    actor?: ActorInfo,
  ) {
    const clusterSpaceClientId = await this.getClusterSpaceClientId(clusterSpaceUUID);
    const param = await this.parametersRepository.findParameterById(parameterId);
    if (!param) throw new Error("ParameterNotFoundException");
    if (getParameterTypeName(param.parameterType) !== "SECRET") {
      throw new Error("ParameterNotSecretException");
    }
    if (!this.parameterVersionRepository) {
      throw new Error("VersioningNotConfiguredException");
    }

    const targetVersion = await this.parameterVersionRepository.findByVersionId(versionId);
    if (!targetVersion) throw new Error("VersionNotFoundException");
    if (targetVersion.clusterSpaceParameterId !== parameterId) {
      throw new Error("VersionNotFoundException");
    }

    // Update the main parameter value with the rolled-back encrypted value
    await this.parametersRepository.updateParameter(parameterId, {
      clusterSpaceParameterId: parameterId,
      parameterValue: targetVersion.encryptedValue,
    });

    // Create a new version with the rolled-back value
    const latestVersion = await this.parameterVersionRepository.getLatestVersion(parameterId);
    await this.parameterVersionRepository.createVersion({
      clusterSpaceParameterId: parameterId,
      encryptedValue: targetVersion.encryptedValue,
      version: latestVersion + 1,
      createdBy: actor?.actorEmail ?? null,
    });

    // Log rotated action
    if (this.auditLogService) {
      await this.auditLogService.log({
        parameterId,
        clientId: clusterSpaceClientId,
        parameterKey: param.parameterKey,
        action: "rotated",
        oldValue: param.parameterValue ?? undefined,
        ...actor,
      });
    }

    const updatedParam = await this.parametersRepository.findParameterById(parameterId);
    return this.buildTree(updatedParam ? [updatedParam] : []);
  }

  async resolveParameterTree(clusterSpaceUUID: string, path?: string) {
    if (!isVaultConfigured()) throw new Error("VaultNotConfiguredException");

    const clusterSpaceClientId = await this.getClusterSpaceClientId(clusterSpaceUUID);
    const secretTypeValue = getParameterTypeValue("SECRET")?.toString();

    // Build a lookup map of all parameters by their full key path
    const allParameters = await this.parametersRepository.findAllParameters(clusterSpaceClientId);
    const paramMap = new Map<number, (typeof allParameters)[0]>();
    for (const p of allParameters) {
      paramMap.set(p.clusterSpaceParameterId, p);
    }

    // Build full path for each parameter
    const pathCache = new Map<number, string>();
    const getFullPath = (paramId: number): string => {
      if (pathCache.has(paramId)) return pathCache.get(paramId)!;
      const param = paramMap.get(paramId);
      if (!param) return "";
      let fullPath: string;
      if (param.clusterSpaceParameterParentId) {
        const parentPath = getFullPath(param.clusterSpaceParameterParentId);
        fullPath = parentPath ? `${parentPath}.${param.parameterKey}` : param.parameterKey;
      } else {
        fullPath = param.parameterKey;
      }
      pathCache.set(paramId, fullPath);
      return fullPath;
    };

    // Build secret lookup by full path
    const secretsByPath = new Map<string, (typeof allParameters)[0]>();
    for (const p of allParameters) {
      if (p.parameterType === secretTypeValue) {
        secretsByPath.set(getFullPath(p.clusterSpaceParameterId), p);
      }
    }

    // Resolver function: look up secret by path, decrypt its value
    const resolver = async (secretPath: string): Promise<string | null> => {
      const secret = secretsByPath.get(secretPath);
      if (!secret || !secret.parameterValue) return null;
      try {
        return await decrypt(secret.parameterValue);
      } catch {
        return null;
      }
    };

    // Get the tree (either filtered by path or all)
    const tree = await this.getParameters(clusterSpaceUUID, false, path);

    // Walk the tree and resolve references in non-SECRET leaf values
    const resolveNode = async (node: any): Promise<any> => {
      if (node.type !== "SECRET" && node.type !== "GROUP" && typeof node.value === "string") {
        node.value = await resolveReferences(node.value, resolver);
      }
      if (node.children && node.children.length > 0) {
        for (const child of node.children) {
          await resolveNode(child);
        }
      }
      return node;
    };

    for (const root of tree) {
      await resolveNode(root);
    }

    return tree;
  }

  async getExpiringSecrets(clusterSpaceUUID: string, days = 30) {
    const clusterSpaceClientId = await this.getClusterSpaceClientId(clusterSpaceUUID);
    const allParameters = await this.parametersRepository.findAllParameters(clusterSpaceClientId);
    const secretTypeValue = getParameterTypeValue("SECRET")?.toString();

    const expiringSecrets = allParameters.filter((param) => {
      if (param.parameterType !== secretTypeValue) return false;
      if (!param.expiresAt) return false;
      const now = new Date();
      const threshold = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
      return param.expiresAt <= threshold;
    });

    return this.buildTree(expiringSecrets);
  }

  private async getClusterSpaceClientId(clusterSpaceUUID: string): Promise<number> {
    const clusterSpaceClient =
      await this.clusterSpaceClientRepository.getClusterSpaceClient(clusterSpaceUUID);
    if (clusterSpaceClient.length === 0) {
      throw new Error("Cluster space not found");
    }
    return clusterSpaceClient[0].clusterSpaceClientId;
  }

  private async checkDuplicatedKeyParameter(
    clusterSpaceClientId: number,
    key: string,
    parentId?: number | null,
    excludeId?: number,
  ) {
    const existing = await this.parametersRepository.findByKeyAndParent(
      clusterSpaceClientId,
      key,
      parentId || null,
    );

    if (existing && existing.clusterSpaceParameterId !== excludeId) {
      throw new Error("DuplicatedParameterException");
    }
  }

  private buildTree(parameters: Parameter[]): any[] {
    if (!parameters || parameters.length === 0) {
      return [];
    }

    const nodeMap = new Map<number, any>();
    const nodes = parameters.map((param) => {
      const typeName = getParameterTypeName(param.parameterType);
      const isSecret = typeName === "SECRET";
      const node: any = {
        id: param.clusterSpaceParameterId,
        parentId: param.clusterSpaceParameterParentId,
        children: [],
        description: param.description,
        key: param.parameterKey,
        value: isSecret ? "••••••••" : param.parameterValue,
        type: typeName,
      };
      if (isSecret) {
        node.expiresAt = param.expiresAt?.toISOString() ?? null;
        node.rotationIntervalDays = param.rotationIntervalDays ?? null;
        node.status = computeExpirationStatus(param.expiresAt);
      }
      nodeMap.set(node.id, node);
      return node;
    });

    const roots: any[] = [];
    nodes.forEach((node) => {
      if (node.parentId === null || !nodeMap.has(node.parentId)) {
        roots.push(node);
      } else {
        const parent = nodeMap.get(node.parentId);
        if (parent) {
          parent.children.push(node);
        }
      }
    });

    return roots;
  }
}
