import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { VaultController } from "@/controllers/vault.controller.ts";
import { insertParameterSchema, updateParameterSchema } from "@/routes/vault/vault.schema.ts";
import { ParameterType } from "@/shared/enums/vault-enum.ts";

const controller = new VaultController();

export default new Hono()
  .get(
    "/",
    describeRoute({
      tags: ["Cluster Space Parameters"],
      summary: "List cluster space parameters",
      description: "Returns cluster space parameters based on query parameters.",
      parameters: [
        {
          name: "onlyRoots",
          in: "query",
          required: false,
          schema: {
            type: "boolean",
            default: false,
          },
          description: "Return only root parameters (without parent)",
        },
        {
          name: "path",
          in: "query",
          required: false,
          schema: {
            type: "string",
          },
          description: "Path to specific parameter (dot-separated keys)",
        },
      ],
      responses: {
        200: {
          description: "List of cluster space parameters retrieved successfully",
          content: {
            "application/json": {
              schema: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: {
                      type: "number",
                      description: "Unique identifier",
                    },
                    parentId: {
                      type: ["number", "null"],
                      description: "Parent parameter ID",
                    },
                    children: {
                      type: "array",
                      description: "Child parameters",
                      items: { type: "object" },
                    },
                    description: {
                      type: "string",
                      description: "Parameter description",
                    },
                    key: {
                      type: "string",
                      description: "Parameter key",
                    },
                    value: {
                      type: ["string", "null"],
                      description: "Parameter value",
                    },
                    type: {
                      type: "string",
                      enum: Object.values(ParameterType),
                      description: "Parameter type",
                    },
                  },
                },
              },
            },
          },
        },
        400: {
          description: "Bad request - Invalid path parameter",
        },
        404: {
          description: "Parameter not found",
        },
      },
    }),
    (ctx) => controller.listParameters(ctx),
  )

  .get(
    "/audit-log",
    describeRoute({
      tags: ["Audit Log"],
      summary: "List audit log entries",
      description:
        "Returns audit log entries for all SECRET parameters in the tenant, with optional filters.",
      parameters: [
        {
          name: "limit",
          in: "query",
          required: false,
          schema: { type: "integer", default: 25 },
          description: "Maximum number of entries to return",
        },
        {
          name: "offset",
          in: "query",
          required: false,
          schema: { type: "integer", default: 0 },
          description: "Number of entries to skip",
        },
        {
          name: "action",
          in: "query",
          required: false,
          schema: {
            type: "string",
            enum: ["created", "updated", "deleted", "revealed", "rotated"],
          },
          description: "Filter by action type",
        },
        {
          name: "actorEmail",
          in: "query",
          required: false,
          schema: { type: "string" },
          description: "Filter by actor email (partial match)",
        },
        {
          name: "parameterKey",
          in: "query",
          required: false,
          schema: { type: "string" },
          description: "Filter by parameter key (partial match)",
        },
      ],
      responses: {
        200: {
          description: "Audit log entries retrieved successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  entries: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        auditLogId: { type: "number" },
                        clusterSpaceParameterId: { type: ["number", "null"] },
                        parameterKey: { type: "string" },
                        action: { type: "string" },
                        actorEmail: { type: ["string", "null"] },
                        actorUsername: { type: ["string", "null"] },
                        ipAddress: { type: ["string", "null"] },
                        oldValueHash: { type: ["string", "null"] },
                        createdAt: { type: "string", format: "date-time" },
                      },
                    },
                  },
                  total: { type: "number" },
                },
              },
            },
          },
        },
      },
    }),
    (ctx) => controller.getAuditLog(ctx),
  )

  .get(
    "/secrets/expiring",
    describeRoute({
      tags: ["Secret Expiration"],
      summary: "List expiring secrets",
      description: "Returns SECRET parameters expiring within the specified number of days.",
      parameters: [
        {
          name: "days",
          in: "query",
          required: false,
          schema: { type: "integer", default: 30 },
          description: "Number of days to look ahead for expiration",
        },
      ],
      responses: {
        200: {
          description: "Expiring secrets retrieved successfully",
          content: {
            "application/json": {
              schema: {
                type: "array",
                items: { type: "object" },
              },
            },
          },
        },
      },
    }),
    (ctx) => controller.getExpiringSecrets(ctx),
  )

  .get(
    "/resolve",
    describeRoute({
      tags: ["Secret References"],
      summary: "Resolve secret references",
      description:
        "Returns the parameter tree with ${secret:path.to.key} references replaced by decrypted values. SECRET values themselves remain masked.",
      parameters: [
        {
          name: "path",
          in: "query",
          required: false,
          schema: { type: "string" },
          description: "Path to specific subtree (dot-separated keys)",
        },
      ],
      responses: {
        200: {
          description: "Resolved parameter tree",
          content: {
            "application/json": {
              schema: {
                type: "array",
                items: { type: "object" },
              },
            },
          },
        },
        404: { description: "Parameter path not found" },
        503: { description: "Vault not configured" },
      },
    }),
    (ctx) => controller.resolveParameters(ctx),
  )

  .get(
    "/:id/children",
    describeRoute({
      tags: ["Cluster Space Parameters"],
      summary: "Get parameter children by ID",
      description: "Returns children of a specific parameter by ID.",
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: {
            type: "string",
          },
          description: "Parameter ID",
        },
      ],
      responses: {
        200: {
          description: "Children parameters retrieved successfully",
          content: {
            "application/json": {
              schema: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: {
                      type: "number",
                      description: "Unique identifier",
                    },
                    parentId: {
                      type: ["number", "null"],
                      description: "Parent parameter ID",
                    },
                    children: {
                      type: "array",
                      description: "Child parameters",
                      items: { type: "object" },
                    },
                    description: {
                      type: "string",
                      description: "Parameter description",
                    },
                    key: {
                      type: "string",
                      description: "Parameter key",
                    },
                    value: {
                      type: ["string", "null"],
                      description: "Parameter value",
                    },
                    type: {
                      type: "string",
                      enum: Object.values(ParameterType),
                      description: "Parameter type",
                    },
                  },
                },
              },
            },
          },
        },
        404: {
          description: "Parameter not found",
        },
      },
    }),
    (ctx) => controller.getChildrenById(ctx),
  )

  .post(
    "/",
    describeRoute({
      tags: ["Cluster Space Parameters"],
      summary: "Create cluster space parameter",
      description: "Creates a new cluster space parameter.",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["description", "key", "type"],
              properties: {
                description: {
                  type: "string",
                  description: "Parameter description",
                  minLength: 1,
                },
                key: {
                  type: "string",
                  description: "Parameter key",
                  minLength: 1,
                },
                value: {
                  type: ["string", "null"],
                  description: "Parameter value",
                },
                type: {
                  type: "string",
                  enum: Object.values(ParameterType),
                  description: "Parameter type",
                },
                parentId: {
                  type: ["number", "null"],
                  description: "Parent parameter ID",
                },
                children: {
                  type: "array",
                  description: "Child parameters",
                  items: {
                    type: "object",
                    properties: {
                      description: {
                        type: "string",
                        description: "Parameter description",
                      },
                      key: {
                        type: "string",
                        description: "Parameter key",
                      },
                      value: {
                        type: ["string", "null"],
                        description: "Parameter value",
                      },
                      type: {
                        type: "string",
                        enum: Object.values(ParameterType),
                        description: "Parameter type",
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      responses: {
        201: {
          description: "Parameter created successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  id: {
                    type: "number",
                    description: "Unique identifier",
                  },
                  parentId: {
                    type: ["number", "null"],
                    description: "Parent parameter ID",
                  },
                  children: {
                    type: "array",
                    description: "Child parameters",
                    items: { type: "object" },
                  },
                  description: {
                    type: "string",
                    description: "Parameter description",
                  },
                  key: {
                    type: "string",
                    description: "Parameter key",
                  },
                  value: {
                    type: ["string", "null"],
                    description: "Parameter value",
                  },
                  type: {
                    type: "string",
                    enum: Object.values(ParameterType),
                    description: "Parameter type",
                  },
                },
              },
            },
          },
        },
        400: {
          description: "Bad request - Invalid parameter data or duplicated key",
        },
        404: {
          description: "Parent parameter not found",
        },
      },
    }),
    zValidator("json", insertParameterSchema),
    (ctx) => controller.createParameter(ctx),
  )

  .delete(
    "/:id",
    describeRoute({
      tags: ["Cluster Space Parameters"],
      summary: "Delete cluster space parameter",
      description: "Deletes a cluster space parameter by ID.",
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: {
            type: "string",
          },
          description: "Parameter ID to delete",
        },
      ],
      responses: {
        204: {
          description: "Parameter deleted successfully",
        },
        404: {
          description: "Parameter not found",
        },
      },
    }),
    (ctx) => controller.deleteParameter(ctx),
  )

  .put(
    "/:id",
    describeRoute({
      tags: ["Cluster Space Parameters"],
      summary: "Update cluster space parameter",
      description: "Updates an existing cluster space parameter by ID.",
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: {
            type: "string",
          },
          description: "Parameter ID to update",
        },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["description", "key", "type"],
              properties: {
                description: {
                  type: "string",
                  description: "Parameter description",
                  minLength: 1,
                },
                key: {
                  type: "string",
                  description: "Parameter key",
                  minLength: 1,
                },
                value: {
                  type: ["string", "null"],
                  description: "Parameter value",
                },
                type: {
                  type: "string",
                  enum: Object.values(ParameterType),
                  description: "Parameter type",
                },
                parentId: {
                  type: ["number", "null"],
                  description: "Parent parameter ID",
                },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: "Parameter updated successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  id: {
                    type: "number",
                    description: "Unique identifier",
                  },
                  parentId: {
                    type: ["number", "null"],
                    description: "Parent parameter ID",
                  },
                  description: {
                    type: "string",
                    description: "Parameter description",
                  },
                  key: {
                    type: "string",
                    description: "Parameter key",
                  },
                  value: {
                    type: ["string", "null"],
                    description: "Parameter value",
                  },
                  type: {
                    type: "string",
                    enum: Object.values(ParameterType),
                    description: "Parameter type",
                  },
                },
              },
            },
          },
        },
        400: {
          description: "Bad request - Invalid parameter data or duplicated key",
        },
        404: {
          description: "Parameter or parent parameter not found",
        },
      },
    }),
    zValidator("json", updateParameterSchema),
    (ctx) => controller.updateParameter(ctx),
  )

  .get(
    "/:id/reveal",
    describeRoute({
      tags: ["Cluster Space Parameters"],
      summary: "Reveal secret value",
      description: "Decrypts and returns the plaintext value of a SECRET parameter.",
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: {
            type: "string",
          },
          description: "Parameter ID to reveal",
        },
      ],
      responses: {
        200: {
          description: "Secret value revealed successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  value: {
                    type: "string",
                    description: "Decrypted secret value",
                  },
                },
              },
            },
          },
        },
        400: {
          description: "Parameter is not a secret",
        },
        404: {
          description: "Parameter not found",
        },
        503: {
          description: "Vault not configured",
        },
      },
    }),
    (ctx) => controller.revealParameter(ctx),
  )

  .get(
    "/:id/audit-log",
    describeRoute({
      tags: ["Audit Log"],
      summary: "Get parameter audit log",
      description: "Returns audit log entries for a specific parameter.",
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string" },
          description: "Parameter ID",
        },
        {
          name: "limit",
          in: "query",
          required: false,
          schema: { type: "integer", default: 20 },
          description: "Maximum number of entries to return",
        },
        {
          name: "offset",
          in: "query",
          required: false,
          schema: { type: "integer", default: 0 },
          description: "Number of entries to skip",
        },
      ],
      responses: {
        200: {
          description: "Audit log entries retrieved successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  entries: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        auditLogId: { type: "number" },
                        clusterSpaceParameterId: { type: ["number", "null"] },
                        parameterKey: { type: "string" },
                        action: { type: "string" },
                        actorEmail: { type: ["string", "null"] },
                        actorUsername: { type: ["string", "null"] },
                        ipAddress: { type: ["string", "null"] },
                        oldValueHash: { type: ["string", "null"] },
                        createdAt: { type: "string", format: "date-time" },
                      },
                    },
                  },
                  total: { type: "number" },
                },
              },
            },
          },
        },
        400: { description: "Invalid parameter ID" },
      },
    }),
    (ctx) => controller.getParameterAuditLog(ctx),
  )

  .get(
    "/:id/versions",
    describeRoute({
      tags: ["Secret Versioning"],
      summary: "Get parameter version history",
      description: "Returns version history for a SECRET parameter.",
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string" },
          description: "Parameter ID",
        },
        {
          name: "limit",
          in: "query",
          required: false,
          schema: { type: "integer", default: 20 },
        },
        {
          name: "offset",
          in: "query",
          required: false,
          schema: { type: "integer", default: 0 },
        },
      ],
      responses: {
        200: {
          description: "Version history retrieved successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  versions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        versionId: { type: "number" },
                        clusterSpaceParameterId: { type: "number" },
                        version: { type: "number" },
                        createdAt: { type: "string", format: "date-time" },
                        createdBy: { type: ["string", "null"] },
                      },
                    },
                  },
                  total: { type: "number" },
                },
              },
            },
          },
        },
        400: { description: "Parameter is not a secret" },
        404: { description: "Parameter not found" },
      },
    }),
    (ctx) => controller.getVersions(ctx),
  )

  .post(
    "/:id/rollback/:versionId",
    describeRoute({
      tags: ["Secret Versioning"],
      summary: "Rollback to a previous version",
      description:
        "Rolls back a SECRET parameter to a previous version, creating a new version entry.",
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string" },
          description: "Parameter ID",
        },
        {
          name: "versionId",
          in: "path",
          required: true,
          schema: { type: "string" },
          description: "Version ID to rollback to",
        },
      ],
      responses: {
        200: { description: "Parameter rolled back successfully" },
        400: { description: "Parameter is not a secret" },
        404: { description: "Parameter or version not found" },
      },
    }),
    (ctx) => controller.rollbackToVersion(ctx),
  );
