import { desc, eq, max } from "drizzle-orm";
import type { Db } from "../helpers/drizzle.ts";
import {
  type NewParameterVersion,
  type ParameterVersionEntry,
  parameterVersion,
} from "../routes/vault/parameter-version.schema.ts";

export class ParameterVersionRepository {
  constructor(private db: Db) {}

  async createVersion(data: NewParameterVersion): Promise<ParameterVersionEntry> {
    const result = await this.db.insert(parameterVersion).values(data).returning();
    return result[0];
  }

  async findByParameterId(
    parameterId: number,
    limit = 20,
    offset = 0,
  ): Promise<ParameterVersionEntry[]> {
    return this.db
      .select()
      .from(parameterVersion)
      .where(eq(parameterVersion.clusterSpaceParameterId, parameterId))
      .orderBy(desc(parameterVersion.version))
      .limit(limit)
      .offset(offset);
  }

  async findByVersionId(versionId: number): Promise<ParameterVersionEntry | null> {
    const result = await this.db
      .select()
      .from(parameterVersion)
      .where(eq(parameterVersion.versionId, versionId))
      .limit(1);
    return result[0] || null;
  }

  async getLatestVersion(parameterId: number): Promise<number> {
    const result = await this.db
      .select({ maxVersion: max(parameterVersion.version) })
      .from(parameterVersion)
      .where(eq(parameterVersion.clusterSpaceParameterId, parameterId));
    return result[0]?.maxVersion ?? 0;
  }
}
