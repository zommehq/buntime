import { and, eq, isNull } from "drizzle-orm";
import type { Db } from "../helpers/drizzle.ts";
import { clusterSpaceParameters, type NewParameter } from "../routes/vault/vault.schema.ts";

export class VaultRepository {
  constructor(private db: Db) {}

  async findParametersByPath(clusterSpaceClientId: number, keys: string[]) {
    let currentNode: typeof clusterSpaceParameters.$inferSelect | null | undefined = null;
    for (let i = 0; i < keys.length; i++) {
      const currentKey = keys[i];

      if (!currentKey || currentKey.trim() === "") {
        throw new Error("ParameterNotFoundException");
      }

      const candidates = await this.db
        .select()
        .from(clusterSpaceParameters)
        .where(
          and(
            eq(clusterSpaceParameters.clusterSpaceClientId, clusterSpaceClientId),
            eq(clusterSpaceParameters.parameterKey, currentKey.trim()),
          ),
        );

      currentNode = candidates.find((param) => {
        if (i === 0 && param.clusterSpaceParameterParentId !== null) {
          return false;
        }
        if (i > 0 && param.clusterSpaceParameterParentId === null) {
          return false;
        }
        if (i === 0) {
          return param.clusterSpaceParameterParentId === null;
        } else {
          return param.clusterSpaceParameterParentId === currentNode?.clusterSpaceParameterId;
        }
      });

      if (currentNode == null) {
        throw new Error("ParameterNotFoundException");
      }

      if (currentNode.clusterSpaceParameterParentId !== null && i > 0) {
        const parent = await this.db
          .select()
          .from(clusterSpaceParameters)
          .where(
            eq(
              clusterSpaceParameters.clusterSpaceParameterId,
              currentNode.clusterSpaceParameterParentId,
            ),
          );

        if (parent.length > 0 && parent[0].parameterKey !== keys[i - 1]) {
          throw new Error("ParameterNotFoundException");
        }
      }
    }
    return currentNode;
  }

  async findDescendants(clusterSpaceClientId: number, parentId: number) {
    const descendants = [];
    const toProcess = [parentId];
    const processed = new Set([parentId]);

    while (toProcess.length > 0) {
      const currentId = toProcess.shift();

      if (!currentId) {
        continue;
      }

      const children = await this.db
        .select()
        .from(clusterSpaceParameters)
        .where(
          and(
            eq(clusterSpaceParameters.clusterSpaceClientId, clusterSpaceClientId),
            eq(clusterSpaceParameters.clusterSpaceParameterParentId, currentId),
          ),
        );

      for (const child of children) {
        if (child.clusterSpaceParameterId && !processed.has(child.clusterSpaceParameterId)) {
          descendants.push(child);
          toProcess.push(child.clusterSpaceParameterId);
          processed.add(child.clusterSpaceParameterId);
        }
      }
    }
    return descendants;
  }

  async findAllParameters(clusterSpaceClientId: number) {
    return await this.db
      .select()
      .from(clusterSpaceParameters)
      .where(eq(clusterSpaceParameters.clusterSpaceClientId, clusterSpaceClientId))
      .orderBy(clusterSpaceParameters.description);
  }

  async findRootParameters(clusterSpaceClientId: number) {
    return await this.db
      .select()
      .from(clusterSpaceParameters)
      .where(
        and(
          eq(clusterSpaceParameters.clusterSpaceClientId, clusterSpaceClientId),
          isNull(clusterSpaceParameters.clusterSpaceParameterParentId),
        ),
      )
      .orderBy(clusterSpaceParameters.description);
  }

  async findChildrenByParentId(clusterSpaceClientId: number, parentId: number) {
    const descendants = await this.findDescendants(clusterSpaceClientId, parentId);

    return descendants.map((parameter) => ({
      ...parameter,
      clusterSpaceParameterParentId:
        parameter.clusterSpaceParameterParentId === parentId
          ? null
          : parameter.clusterSpaceParameterParentId,
    }));
  }

  async findParameterById(id: number) {
    const result = await this.db
      .select()
      .from(clusterSpaceParameters)
      .where(eq(clusterSpaceParameters.clusterSpaceParameterId, id))
      .limit(1);

    return result[0] || null;
  }

  async findByKeyAndParent(clusterSpaceClientId: number, key: string, parentId: number | null) {
    const conditions = [
      eq(clusterSpaceParameters.clusterSpaceClientId, clusterSpaceClientId),
      eq(clusterSpaceParameters.parameterKey, key),
    ];

    if (parentId === null) {
      conditions.push(isNull(clusterSpaceParameters.clusterSpaceParameterParentId));
    } else {
      conditions.push(eq(clusterSpaceParameters.clusterSpaceParameterParentId, parentId));
    }

    const result = await this.db
      .select()
      .from(clusterSpaceParameters)
      .where(and(...conditions))
      .limit(1);

    return result[0] || null;
  }

  async createParameter(parameter: NewParameter) {
    const result = await this.db.insert(clusterSpaceParameters).values(parameter).returning();

    return result[0];
  }

  async deleteParameter(id: number): Promise<void> {
    await this.db
      .delete(clusterSpaceParameters)
      .where(eq(clusterSpaceParameters.clusterSpaceParameterId, id));
  }

  async updateParameter(
    id: number,
    parameter: Partial<NewParameter> & { clusterSpaceParameterId: number },
  ) {
    const result = await this.db
      .update(clusterSpaceParameters)
      .set({
        clusterSpaceClientId: parameter.clusterSpaceClientId,
        clusterSpaceParameterParentId: parameter.clusterSpaceParameterParentId,
        description: parameter.description,
        parameterKey: parameter.parameterKey,
        parameterValue: parameter.parameterValue,
        parameterType: parameter.parameterType,
        expiresAt: parameter.expiresAt,
        rotationIntervalDays: parameter.rotationIntervalDays,
      })
      .where(eq(clusterSpaceParameters.clusterSpaceParameterId, id))
      .returning();

    return result[0];
  }
}
