import type { Context } from "hono";
import { AuditLogRepository } from "../repositories/audit-log.repository.ts";
import { ClusterSpaceClientRepository } from "../repositories/cluster-space-client.repository.ts";
import { ParameterVersionRepository } from "../repositories/parameter-version.repository.ts";
import { VaultRepository } from "../repositories/vault.repository.ts";
import { AuditLogService } from "../services/audit-log.service.ts";
import { type ActorInfo, VaultService } from "../services/vault.service.ts";

export class VaultController {
  private service: VaultService;

  constructor() {
    const db = {};
    const parametersRepository = new VaultRepository(db as any);
    const clusterSpaceClientRepository = new ClusterSpaceClientRepository(db as any);
    this.service = new VaultService(parametersRepository, clusterSpaceClientRepository);
  }

  private initService(ctx: Context) {
    const db = ctx.get("db");
    const parametersRepository = new VaultRepository(db);
    const clusterSpaceClientRepository = new ClusterSpaceClientRepository(db);
    const auditLogRepository = new AuditLogRepository(db);
    const auditLogService = new AuditLogService(auditLogRepository);
    const parameterVersionRepository = new ParameterVersionRepository(db);
    this.service = new VaultService(
      parametersRepository,
      clusterSpaceClientRepository,
      auditLogService,
      parameterVersionRepository,
    );
  }

  private getActorInfo(ctx: Context): ActorInfo {
    return {
      actorEmail: ctx.get("actorEmail"),
      actorUsername: ctx.get("actorUsername"),
      ipAddress: ctx.req.header("x-forwarded-for") || ctx.req.header("x-real-ip") || "unknown",
    };
  }

  async listParameters(ctx: Context) {
    try {
      this.initService(ctx);

      const clusterSpaceUUID = ctx.get("hyperClusterSpace");

      if (!clusterSpaceUUID) {
        return ctx.json({ error: "Cluster Space UUID is required" }, 400);
      }

      const onlyRoots = ctx.req.query("onlyRoots") === "true";
      const path = ctx.req.query("path");

      const parameters = await this.service.getParameters(clusterSpaceUUID, onlyRoots, path);
      return ctx.json(parameters);
    } catch (error: any) {
      if (error.message === "ParameterNotFoundException") {
        return ctx.json({ error: "Parameter not found" }, 404);
      }
      if (error.message === "Cluster space not found") {
        return ctx.json({ error: "Cluster space not found" }, 404);
      }
      console.error("Error fetching cluster space parameters:", error);
      return ctx.json({ error: "Internal server error" }, 500);
    }
  }

  async getChildrenById(ctx: Context) {
    try {
      this.initService(ctx);

      const clusterSpaceUUID = ctx.get("hyperClusterSpace");
      const id = parseInt(ctx.req.param("id"));

      if (!clusterSpaceUUID) {
        return ctx.json({ error: "Cluster Space UUID is required" }, 400);
      }

      const children = await this.service.getChildrenById(clusterSpaceUUID, id);
      return ctx.json(children);
    } catch (error: any) {
      if (error.message === "Cluster space not found") {
        return ctx.json({ error: "Cluster space not found" }, 404);
      }
      console.error("Error fetching parameter children:", error);
      return ctx.json({ error: "Internal server error" }, 500);
    }
  }

  async createParameter(ctx: Context) {
    try {
      this.initService(ctx);

      const clusterSpaceUUID = ctx.get("hyperClusterSpace");

      if (!clusterSpaceUUID) {
        return ctx.json({ error: "Cluster Space UUID is required" }, 400);
      }

      const body = await ctx.req.json();
      const actor = this.getActorInfo(ctx);

      const parameter = await this.service.createParameter(clusterSpaceUUID, body, actor);
      return ctx.json(parameter, 201);
    } catch (error: any) {
      if (error.message === "DuplicatedParameterException") {
        return ctx.json({ error: "Parameter with this key already exists" }, 400);
      }
      if (error.message === "ParameterParentNotFoundException") {
        return ctx.json({ error: "Parent parameter not found" }, 404);
      }
      if (error.message === "VaultNotConfiguredException") {
        return ctx.json({ error: "Vault not configured" }, 503);
      }
      if (error.message === "Cluster space not found") {
        return ctx.json({ error: "Cluster space not found" }, 404);
      }
      console.error("Error creating parameter:", error);
      return ctx.json({ error: "Internal server error" }, 500);
    }
  }

  async deleteParameter(ctx: Context) {
    try {
      this.initService(ctx);

      const clusterSpaceUUID = ctx.get("hyperClusterSpace");
      const id = parseInt(ctx.req.param("id"));

      if (!clusterSpaceUUID) {
        return ctx.json({ error: "Cluster Space UUID is required" }, 400);
      }

      if (isNaN(id)) {
        return ctx.json({ error: "Invalid parameter ID" }, 400);
      }

      const actor = this.getActorInfo(ctx);
      await this.service.deleteParameter(clusterSpaceUUID, id, actor);
      return ctx.body(null, 204);
    } catch (error: any) {
      if (error.message === "ParameterNotFoundException") {
        return ctx.json({ error: "Parameter not found" }, 404);
      }
      if (error.message === "Cluster space not found") {
        return ctx.json({ error: "Cluster space not found" }, 404);
      }
      console.error("Error deleting parameter:", error);
      return ctx.json({ error: "Internal server error" }, 500);
    }
  }

  async revealParameter(ctx: Context) {
    try {
      this.initService(ctx);

      const clusterSpaceUUID = ctx.get("hyperClusterSpace");
      const id = parseInt(ctx.req.param("id"));

      if (!clusterSpaceUUID) {
        return ctx.json({ error: "Cluster Space UUID is required" }, 400);
      }

      if (isNaN(id)) {
        return ctx.json({ error: "Invalid parameter ID" }, 400);
      }

      const actor = this.getActorInfo(ctx);
      const value = await this.service.revealParameter(clusterSpaceUUID, id, actor);
      return ctx.json({ value });
    } catch (error: any) {
      if (error.message === "ParameterNotFoundException") {
        return ctx.json({ error: "Parameter not found" }, 404);
      }
      if (error.message === "ParameterNotSecretException") {
        return ctx.json({ error: "Parameter is not a secret" }, 400);
      }
      if (error.message === "VaultNotConfiguredException") {
        return ctx.json({ error: "Vault not configured" }, 503);
      }
      if (error.message === "Cluster space not found") {
        return ctx.json({ error: "Cluster space not found" }, 404);
      }
      console.error("Error revealing parameter:", error);
      return ctx.json({ error: "Internal server error" }, 500);
    }
  }

  async updateParameter(ctx: Context) {
    try {
      this.initService(ctx);

      const clusterSpaceUUID = ctx.get("hyperClusterSpace");
      const id = parseInt(ctx.req.param("id"));

      if (!clusterSpaceUUID) {
        return ctx.json({ error: "Cluster Space UUID is required" }, 400);
      }

      if (isNaN(id)) {
        return ctx.json({ error: "Invalid parameter ID" }, 400);
      }

      const body = await ctx.req.json();
      const actor = this.getActorInfo(ctx);

      const parameter = await this.service.updateParameter(clusterSpaceUUID, id, body, actor);
      return ctx.json(parameter);
    } catch (error: any) {
      if (error.message === "ParameterNotFoundException") {
        return ctx.json({ error: "Parameter not found" }, 404);
      }
      if (error.message === "DuplicatedParameterException") {
        return ctx.json({ error: "Parameter with this key already exists" }, 400);
      }
      if (error.message === "ParameterParentNotFoundException") {
        return ctx.json({ error: "Parent parameter not found" }, 404);
      }
      if (error.message === "VaultNotConfiguredException") {
        return ctx.json({ error: "Vault not configured" }, 503);
      }
      if (error.message === "Cluster space not found") {
        return ctx.json({ error: "Cluster space not found" }, 404);
      }
      console.error("Error updating parameter:", error);
      return ctx.json({ error: "Internal server error" }, 500);
    }
  }

  async getParameterAuditLog(ctx: Context) {
    try {
      this.initService(ctx);

      const id = parseInt(ctx.req.param("id"));
      const limit = parseInt(ctx.req.query("limit") || "20");
      const offset = parseInt(ctx.req.query("offset") || "0");

      if (isNaN(id)) {
        return ctx.json({ error: "Invalid parameter ID" }, 400);
      }

      const db = ctx.get("db");
      const auditLogRepository = new AuditLogRepository(db);
      const auditLogService = new AuditLogService(auditLogRepository);

      const entries = await auditLogService.getParameterActivity(id, limit, offset);
      return ctx.json({ entries, total: entries.length });
    } catch (error: any) {
      console.error("Error fetching parameter audit log:", error);
      return ctx.json({ error: "Internal server error" }, 500);
    }
  }

  async getAuditLog(ctx: Context) {
    try {
      this.initService(ctx);

      const clusterSpaceUUID = ctx.get("hyperClusterSpace");

      if (!clusterSpaceUUID) {
        return ctx.json({ error: "Cluster Space UUID is required" }, 400);
      }

      const db = ctx.get("db");
      const clusterSpaceClientRepository = new ClusterSpaceClientRepository(db);
      const clusterSpaceClient =
        await clusterSpaceClientRepository.getClusterSpaceClient(clusterSpaceUUID);
      if (clusterSpaceClient.length === 0) {
        return ctx.json({ error: "Cluster space not found" }, 404);
      }
      const clientId = clusterSpaceClient[0].clusterSpaceClientId;

      const auditLogRepository = new AuditLogRepository(db);
      const auditLogService = new AuditLogService(auditLogRepository);

      const result = await auditLogService.getAuditLog(clientId, {
        limit: parseInt(ctx.req.query("limit") || "25"),
        offset: parseInt(ctx.req.query("offset") || "0"),
        action: ctx.req.query("action") || undefined,
        actorEmail: ctx.req.query("actorEmail") || undefined,
        parameterKey: ctx.req.query("parameterKey") || undefined,
      });

      return ctx.json(result);
    } catch (error: any) {
      if (error.message === "Cluster space not found") {
        return ctx.json({ error: "Cluster space not found" }, 404);
      }
      console.error("Error fetching audit log:", error);
      return ctx.json({ error: "Internal server error" }, 500);
    }
  }

  async resolveParameters(ctx: Context) {
    try {
      this.initService(ctx);

      const clusterSpaceUUID = ctx.get("hyperClusterSpace");

      if (!clusterSpaceUUID) {
        return ctx.json({ error: "Cluster Space UUID is required" }, 400);
      }

      const path = ctx.req.query("path") || undefined;
      const result = await this.service.resolveParameterTree(clusterSpaceUUID, path);
      return ctx.json(result);
    } catch (error: any) {
      if (error.message === "VaultNotConfiguredException") {
        return ctx.json({ error: "Vault not configured" }, 503);
      }
      if (error.message === "ParameterNotFoundException") {
        return ctx.json({ error: "Parameter not found" }, 404);
      }
      if (error.message === "Cluster space not found") {
        return ctx.json({ error: "Cluster space not found" }, 404);
      }
      console.error("Error resolving parameters:", error);
      return ctx.json({ error: "Internal server error" }, 500);
    }
  }

  async getExpiringSecrets(ctx: Context) {
    try {
      this.initService(ctx);

      const clusterSpaceUUID = ctx.get("hyperClusterSpace");

      if (!clusterSpaceUUID) {
        return ctx.json({ error: "Cluster Space UUID is required" }, 400);
      }

      const days = parseInt(ctx.req.query("days") || "30");
      const result = await this.service.getExpiringSecrets(clusterSpaceUUID, days);
      return ctx.json(result);
    } catch (error: any) {
      if (error.message === "Cluster space not found") {
        return ctx.json({ error: "Cluster space not found" }, 404);
      }
      console.error("Error fetching expiring secrets:", error);
      return ctx.json({ error: "Internal server error" }, 500);
    }
  }

  async getVersions(ctx: Context) {
    try {
      this.initService(ctx);

      const clusterSpaceUUID = ctx.get("hyperClusterSpace");
      const id = parseInt(ctx.req.param("id"));
      const limit = parseInt(ctx.req.query("limit") || "20");
      const offset = parseInt(ctx.req.query("offset") || "0");

      if (!clusterSpaceUUID) {
        return ctx.json({ error: "Cluster Space UUID is required" }, 400);
      }

      if (isNaN(id)) {
        return ctx.json({ error: "Invalid parameter ID" }, 400);
      }

      const result = await this.service.getVersions(clusterSpaceUUID, id, limit, offset);
      return ctx.json(result);
    } catch (error: any) {
      if (error.message === "ParameterNotFoundException") {
        return ctx.json({ error: "Parameter not found" }, 404);
      }
      if (error.message === "ParameterNotSecretException") {
        return ctx.json({ error: "Parameter is not a secret" }, 400);
      }
      if (error.message === "Cluster space not found") {
        return ctx.json({ error: "Cluster space not found" }, 404);
      }
      console.error("Error fetching parameter versions:", error);
      return ctx.json({ error: "Internal server error" }, 500);
    }
  }

  async rollbackToVersion(ctx: Context) {
    try {
      this.initService(ctx);

      const clusterSpaceUUID = ctx.get("hyperClusterSpace");
      const id = parseInt(ctx.req.param("id"));
      const versionId = parseInt(ctx.req.param("versionId"));

      if (!clusterSpaceUUID) {
        return ctx.json({ error: "Cluster Space UUID is required" }, 400);
      }

      if (isNaN(id) || isNaN(versionId)) {
        return ctx.json({ error: "Invalid parameter or version ID" }, 400);
      }

      const actor = this.getActorInfo(ctx);
      const result = await this.service.rollbackToVersion(clusterSpaceUUID, id, versionId, actor);
      return ctx.json(result);
    } catch (error: any) {
      if (error.message === "ParameterNotFoundException") {
        return ctx.json({ error: "Parameter not found" }, 404);
      }
      if (error.message === "ParameterNotSecretException") {
        return ctx.json({ error: "Parameter is not a secret" }, 400);
      }
      if (error.message === "VersionNotFoundException") {
        return ctx.json({ error: "Version not found" }, 404);
      }
      if (error.message === "Cluster space not found") {
        return ctx.json({ error: "Cluster space not found" }, 404);
      }
      console.error("Error rolling back version:", error);
      return ctx.json({ error: "Internal server error" }, 500);
    }
  }
}
