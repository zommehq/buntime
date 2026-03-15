import { eq } from "drizzle-orm";
import type { Db } from "../helpers/drizzle.ts";
import { clusterSpaceClients } from "../routes/vault/vault.schema.ts";

export class ClusterSpaceClientRepository {
  constructor(private db: Db) {}

  async getClusterSpaceClient(clusterSpaceUUID: string) {
    return await this.db
      .select({ clusterSpaceClientId: clusterSpaceClients.clusterSpaceClientId })
      .from(clusterSpaceClients)
      .where(eq(clusterSpaceClients.clusterSpaceUuid, clusterSpaceUUID))
      .limit(1);
  }
}
