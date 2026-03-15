import type { PGlite } from "@electric-sql/pglite";
import { encrypt } from "../helpers/crypto.ts";

/**
 * Seeds ~100 parameters with nested groups covering all parameter types.
 * Also seeds audit log entries and version history for secrets.
 *
 * Structure:
 *
 * Application Configuration (GROUP) — already exists from prior seed
 * ├── apikey (SECRET) — already exists
 *
 * Database (GROUP)
 * ├── connection_string (SECRET)
 * ├── host (STRING)
 * ├── port (NUMBER)
 * ├── name (STRING)
 * ├── username (STRING)
 * ├── password (SECRET) — expired
 * ├── ssl_enabled (BOOLEAN)
 * ├── pool_config (JSON)
 * ├── init_script (CODE)
 * └── Replicas (GROUP)
 *     ├── replica_1_host (STRING)
 *     ├── replica_1_port (NUMBER)
 *     ├── replica_2_host (STRING)
 *     └── replica_2_port (NUMBER)
 *
 * Authentication (GROUP)
 * ├── jwt_secret (SECRET) — expiring soon
 * ├── jwt_expiry_seconds (NUMBER)
 * ├── oauth_enabled (BOOLEAN)
 * ├── OAuth Providers (GROUP)
 * │   ├── google_client_id (STRING)
 * │   ├── google_client_secret (SECRET)
 * │   ├── github_client_id (STRING)
 * │   ├── github_client_secret (SECRET)
 * │   └── azure_config (JSON)
 * ├── session_config (JSON)
 * ├── password_policy (JSON)
 * └── mfa_enabled (BOOLEAN)
 *
 * Email (GROUP)
 * ├── smtp_host (STRING)
 * ├── smtp_port (NUMBER)
 * ├── smtp_username (STRING)
 * ├── smtp_password (SECRET)
 * ├── smtp_tls (BOOLEAN)
 * ├── from_address (STRING)
 * ├── from_name (STRING)
 * └── Templates (GROUP)
 *     ├── welcome_subject (STRING)
 *     ├── welcome_body (CODE)
 *     ├── reset_subject (STRING)
 *     ├── reset_body (CODE)
 *     ├── invite_subject (STRING)
 *     └── invite_body (CODE)
 *
 * Storage (GROUP)
 * ├── provider (STRING)
 * ├── s3_bucket (STRING)
 * ├── s3_region (STRING)
 * ├── s3_access_key (SECRET)
 * ├── s3_secret_key (SECRET)
 * ├── max_upload_mb (NUMBER)
 * ├── allowed_extensions (JSON)
 * └── cdn_config (JSON)
 *
 * Monitoring (GROUP)
 * ├── log_level (STRING)
 * ├── sentry_dsn (SECRET)
 * ├── sentry_enabled (BOOLEAN)
 * ├── sentry_sample_rate (NUMBER)
 * ├── datadog_api_key (SECRET)
 * ├── Alerting (GROUP)
 * │   ├── slack_webhook_url (SECRET)
 * │   ├── pagerduty_key (SECRET)
 * │   ├── alert_threshold_cpu (NUMBER)
 * │   ├── alert_threshold_memory (NUMBER)
 * │   └── alert_channels (JSON)
 * ├── health_check_interval (NUMBER)
 * └── metrics_retention_days (NUMBER)
 *
 * Feature Flags (GROUP)
 * ├── dark_mode (BOOLEAN)
 * ├── beta_features (BOOLEAN)
 * ├── maintenance_mode (BOOLEAN)
 * ├── signup_enabled (BOOLEAN)
 * ├── max_users (NUMBER)
 * ├── rate_limit_rpm (NUMBER)
 * ├── feature_matrix (JSON)
 * └── custom_css (CODE)
 *
 * Integrations (GROUP)
 * ├── Stripe (GROUP)
 * │   ├── stripe_public_key (STRING)
 * │   ├── stripe_secret_key (SECRET)
 * │   ├── stripe_webhook_secret (SECRET)
 * │   └── stripe_config (JSON)
 * ├── Twilio (GROUP)
 * │   ├── twilio_account_sid (STRING)
 * │   ├── twilio_auth_token (SECRET)
 * │   ├── twilio_phone_number (STRING)
 * │   └── twilio_enabled (BOOLEAN)
 * └── OpenAI (GROUP)
 *     ├── openai_api_key (SECRET)
 *     ├── openai_model (STRING)
 *     ├── openai_max_tokens (NUMBER)
 *     └── openai_temperature (NUMBER)
 */

const TENANT_ID = 1;

// Parameter types matching the enum
const GROUP = "0";
const STRING = "1";
const NUMBER = "2";
const BOOLEAN = "3";
const JSON_TYPE = "4";
const CODE = "5";
const SECRET = "6";

interface Param {
  key: string;
  description: string;
  type: string;
  value?: string;
  expiresAt?: string;
  rotationIntervalDays?: number;
  children?: Param[];
}

export default async (db: PGlite) => {
  console.log("Seeding sample parameters...");

  // Clear existing parameters (except the tenant)
  await db.query(
    `DELETE FROM "parameters"."parameter_version" WHERE cluster_space_parameter_id IN (SELECT cluster_space_parameter_id FROM "parameters"."cluster_space_parameter" WHERE cluster_space_client_id = $1)`,
    [TENANT_ID],
  );
  await db.query(
    `DELETE FROM "parameters"."parameter_audit_log" WHERE cluster_space_client_id = $1`,
    [TENANT_ID],
  );
  await db.query(
    `DELETE FROM "parameters"."cluster_space_parameter" WHERE cluster_space_client_id = $1`,
    [TENANT_ID],
  );

  const now = new Date();
  const daysFromNow = (n: number) => new Date(now.getTime() + n * 86400000).toISOString();
  const daysAgo = (n: number) => new Date(now.getTime() - n * 86400000).toISOString();

  const tree: Param[] = [
    {
      key: "Application Configuration",
      description: "Application Configuration",
      type: GROUP,
      children: [
        {
          key: "app_name",
          description: "Application display name",
          type: STRING,
          value: "Vault Manager",
        },
        {
          key: "app_version",
          description: "Current application version",
          type: STRING,
          value: "2.4.1",
        },
        { key: "app_env", description: "Current environment", type: STRING, value: "development" },
        { key: "debug_mode", description: "Enable debug mode", type: BOOLEAN, value: "true" },
        {
          key: "default_locale",
          description: "Default locale for the app",
          type: STRING,
          value: "en-US",
        },
        {
          key: "apikey",
          description: "API Key",
          type: SECRET,
          value: "sk-live-abc123def456ghi789",
          rotationIntervalDays: 90,
          expiresAt: daysFromNow(60),
        },
      ],
    },
    {
      key: "Database",
      description: "Database configuration",
      type: GROUP,
      children: [
        {
          key: "connection_string",
          description: "Full connection string",
          type: SECRET,
          value: "postgresql://admin:s3cret@db.prod.internal:5432/vault_db?sslmode=require",
          rotationIntervalDays: 180,
          expiresAt: daysFromNow(120),
        },
        { key: "host", description: "Database host", type: STRING, value: "db.prod.internal" },
        { key: "port", description: "Database port", type: NUMBER, value: "5432" },
        { key: "name", description: "Database name", type: STRING, value: "vault_db" },
        { key: "username", description: "Database user", type: STRING, value: "admin" },
        {
          key: "password",
          description: "Database password (expired!)",
          type: SECRET,
          value: "old-expired-password-123",
          expiresAt: daysAgo(15),
        },
        { key: "ssl_enabled", description: "Enable SSL connections", type: BOOLEAN, value: "true" },
        {
          key: "pool_config",
          description: "Connection pool settings",
          type: JSON_TYPE,
          value: JSON.stringify(
            { min: 5, max: 20, idleTimeoutMs: 30000, acquireTimeoutMs: 10000 },
            null,
            2,
          ),
        },
        {
          key: "init_script",
          description: "Database initialization script",
          type: CODE,
          value:
            'CREATE SCHEMA IF NOT EXISTS app;\nSET search_path TO app, public;\n\n-- Create extensions\nCREATE EXTENSION IF NOT EXISTS "uuid-ossp";\nCREATE EXTENSION IF NOT EXISTS "pgcrypto";',
        },
        {
          key: "Replicas",
          description: "Read replica configuration",
          type: GROUP,
          children: [
            {
              key: "replica_1_host",
              description: "Primary read replica host",
              type: STRING,
              value: "replica-1.db.prod.internal",
            },
            {
              key: "replica_1_port",
              description: "Primary read replica port",
              type: NUMBER,
              value: "5432",
            },
            {
              key: "replica_2_host",
              description: "Secondary read replica host",
              type: STRING,
              value: "replica-2.db.prod.internal",
            },
            {
              key: "replica_2_port",
              description: "Secondary read replica port",
              type: NUMBER,
              value: "5433",
            },
          ],
        },
      ],
    },
    {
      key: "Authentication",
      description: "Auth and identity settings",
      type: GROUP,
      children: [
        {
          key: "jwt_secret",
          description: "JWT signing secret (expiring soon!)",
          type: SECRET,
          value: "whsec_super_secret_jwt_key_2024_rotation_needed",
          rotationIntervalDays: 30,
          expiresAt: daysFromNow(5),
        },
        {
          key: "jwt_expiry_seconds",
          description: "JWT token expiry in seconds",
          type: NUMBER,
          value: "3600",
        },
        { key: "oauth_enabled", description: "Enable OAuth login", type: BOOLEAN, value: "true" },
        {
          key: "OAuth Providers",
          description: "OAuth provider configurations",
          type: GROUP,
          children: [
            {
              key: "google_client_id",
              description: "Google OAuth client ID",
              type: STRING,
              value: "123456789-abcdef.apps.googleusercontent.com",
            },
            {
              key: "google_client_secret",
              description: "Google OAuth client secret",
              type: SECRET,
              value: "GOCSPX-abcdefghijklmnopqrstuvwxyz",
              rotationIntervalDays: 365,
              expiresAt: daysFromNow(200),
            },
            {
              key: "github_client_id",
              description: "GitHub OAuth client ID",
              type: STRING,
              value: "Iv1.a1b2c3d4e5f6g7h8",
            },
            {
              key: "github_client_secret",
              description: "GitHub OAuth client secret",
              type: SECRET,
              value: "ghsec_0123456789abcdef0123456789abcdef01234567",
              rotationIntervalDays: 180,
              expiresAt: daysFromNow(150),
            },
            {
              key: "azure_config",
              description: "Azure AD configuration",
              type: JSON_TYPE,
              value: JSON.stringify(
                {
                  tenantId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                  clientId: "12345678-abcd-efgh-ijkl-123456789012",
                  redirectUri: "https://app.example.com/auth/callback",
                },
                null,
                2,
              ),
            },
          ],
        },
        {
          key: "session_config",
          description: "Session management settings",
          type: JSON_TYPE,
          value: JSON.stringify(
            { maxAge: 86400, httpOnly: true, secure: true, sameSite: "lax", rolling: true },
            null,
            2,
          ),
        },
        {
          key: "password_policy",
          description: "Password requirements",
          type: JSON_TYPE,
          value: JSON.stringify(
            {
              minLength: 12,
              requireUppercase: true,
              requireLowercase: true,
              requireNumbers: true,
              requireSymbols: true,
              maxAge: 90,
            },
            null,
            2,
          ),
        },
        {
          key: "mfa_enabled",
          description: "Enable multi-factor authentication",
          type: BOOLEAN,
          value: "true",
        },
      ],
    },
    {
      key: "Email",
      description: "Email / SMTP settings",
      type: GROUP,
      children: [
        {
          key: "smtp_host",
          description: "SMTP server host",
          type: STRING,
          value: "smtp.mailgun.org",
        },
        { key: "smtp_port", description: "SMTP server port", type: NUMBER, value: "587" },
        {
          key: "smtp_username",
          description: "SMTP username",
          type: STRING,
          value: "postmaster@mail.example.com",
        },
        {
          key: "smtp_password",
          description: "SMTP password",
          type: SECRET,
          value: "mg-smtp-password-very-secret",
          rotationIntervalDays: 90,
          expiresAt: daysFromNow(45),
        },
        { key: "smtp_tls", description: "Use TLS for SMTP", type: BOOLEAN, value: "true" },
        {
          key: "from_address",
          description: "Default sender email",
          type: STRING,
          value: "noreply@example.com",
        },
        {
          key: "from_name",
          description: "Default sender display name",
          type: STRING,
          value: "Vault App",
        },
        {
          key: "Templates",
          description: "Email template configurations",
          type: GROUP,
          children: [
            {
              key: "welcome_subject",
              description: "Welcome email subject",
              type: STRING,
              value: "Welcome to {{app_name}}!",
            },
            {
              key: "welcome_body",
              description: "Welcome email HTML template",
              type: CODE,
              value:
                '<!DOCTYPE html>\n<html>\n<body>\n  <h1>Welcome, {{user_name}}!</h1>\n  <p>Your account has been created.</p>\n  <a href="{{verify_url}}">Verify Email</a>\n</body>\n</html>',
            },
            {
              key: "reset_subject",
              description: "Password reset subject",
              type: STRING,
              value: "Reset your password",
            },
            {
              key: "reset_body",
              description: "Password reset HTML template",
              type: CODE,
              value:
                '<!DOCTYPE html>\n<html>\n<body>\n  <h1>Password Reset</h1>\n  <p>Click below to reset your password:</p>\n  <a href="{{reset_url}}">Reset Password</a>\n  <p>This link expires in 1 hour.</p>\n</body>\n</html>',
            },
            {
              key: "invite_subject",
              description: "Invitation email subject",
              type: STRING,
              value: "You've been invited to {{app_name}}",
            },
            {
              key: "invite_body",
              description: "Invitation email HTML template",
              type: CODE,
              value:
                '<!DOCTYPE html>\n<html>\n<body>\n  <h1>You\'re Invited!</h1>\n  <p>{{inviter_name}} has invited you to join.</p>\n  <a href="{{invite_url}}">Accept Invitation</a>\n</body>\n</html>',
            },
          ],
        },
      ],
    },
    {
      key: "Storage",
      description: "File storage and CDN configuration",
      type: GROUP,
      children: [
        {
          key: "provider",
          description: "Storage provider (s3, gcs, azure)",
          type: STRING,
          value: "s3",
        },
        {
          key: "s3_bucket",
          description: "S3 bucket name",
          type: STRING,
          value: "vault-app-uploads-prod",
        },
        { key: "s3_region", description: "S3 region", type: STRING, value: "us-east-1" },
        {
          key: "s3_access_key",
          description: "AWS access key ID",
          type: SECRET,
          value: "AKIAIOSFODNN7EXAMPLE",
          rotationIntervalDays: 90,
          expiresAt: daysFromNow(75),
        },
        {
          key: "s3_secret_key",
          description: "AWS secret access key",
          type: SECRET,
          value: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
          rotationIntervalDays: 90,
          expiresAt: daysFromNow(75),
        },
        {
          key: "max_upload_mb",
          description: "Maximum upload size in MB",
          type: NUMBER,
          value: "50",
        },
        {
          key: "allowed_extensions",
          description: "Allowed file extensions",
          type: JSON_TYPE,
          value: JSON.stringify(
            [".jpg", ".jpeg", ".png", ".gif", ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".csv"],
            null,
            2,
          ),
        },
        {
          key: "cdn_config",
          description: "CDN configuration",
          type: JSON_TYPE,
          value: JSON.stringify(
            {
              enabled: true,
              domain: "cdn.example.com",
              ttl: 86400,
              invalidationPaths: ["/assets/*", "/uploads/*"],
            },
            null,
            2,
          ),
        },
      ],
    },
    {
      key: "Monitoring",
      description: "Observability and alerting",
      type: GROUP,
      children: [
        { key: "log_level", description: "Application log level", type: STRING, value: "info" },
        {
          key: "sentry_dsn",
          description: "Sentry DSN for error tracking",
          type: SECRET,
          value: "https://abc123@o123456.ingest.sentry.io/1234567",
          rotationIntervalDays: 365,
          expiresAt: daysFromNow(300),
        },
        {
          key: "sentry_enabled",
          description: "Enable Sentry error tracking",
          type: BOOLEAN,
          value: "true",
        },
        {
          key: "sentry_sample_rate",
          description: "Sentry sample rate (0.0 - 1.0)",
          type: NUMBER,
          value: "0.25",
        },
        {
          key: "datadog_api_key",
          description: "Datadog API key",
          type: SECRET,
          value: "dd-api-key-0123456789abcdef0123456789abcdef",
          rotationIntervalDays: 180,
          expiresAt: daysFromNow(90),
        },
        {
          key: "Alerting",
          description: "Alert channel configuration",
          type: GROUP,
          children: [
            {
              key: "slack_webhook_url",
              description: "Slack incoming webhook URL",
              type: SECRET,
              value:
                "https://hooks.example.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX",
              rotationIntervalDays: 365,
              expiresAt: daysFromNow(250),
            },
            {
              key: "pagerduty_key",
              description: "PagerDuty integration key",
              type: SECRET,
              value: "pd-integration-key-abcdef123456",
              rotationIntervalDays: 180,
              expiresAt: daysFromNow(160),
            },
            {
              key: "alert_threshold_cpu",
              description: "CPU alert threshold (%)",
              type: NUMBER,
              value: "85",
            },
            {
              key: "alert_threshold_memory",
              description: "Memory alert threshold (%)",
              type: NUMBER,
              value: "90",
            },
            {
              key: "alert_channels",
              description: "Alert notification channels",
              type: JSON_TYPE,
              value: JSON.stringify(
                { critical: ["pagerduty", "slack"], warning: ["slack"], info: ["email"] },
                null,
                2,
              ),
            },
          ],
        },
        {
          key: "health_check_interval",
          description: "Health check interval in seconds",
          type: NUMBER,
          value: "30",
        },
        {
          key: "metrics_retention_days",
          description: "Metrics data retention in days",
          type: NUMBER,
          value: "90",
        },
      ],
    },
    {
      key: "Feature Flags",
      description: "Feature toggles and limits",
      type: GROUP,
      children: [
        { key: "dark_mode", description: "Enable dark mode UI", type: BOOLEAN, value: "true" },
        {
          key: "beta_features",
          description: "Enable beta features",
          type: BOOLEAN,
          value: "false",
        },
        {
          key: "maintenance_mode",
          description: "Enable maintenance mode",
          type: BOOLEAN,
          value: "false",
        },
        {
          key: "signup_enabled",
          description: "Allow new user registration",
          type: BOOLEAN,
          value: "true",
        },
        { key: "max_users", description: "Maximum number of users", type: NUMBER, value: "10000" },
        {
          key: "rate_limit_rpm",
          description: "API rate limit (requests/min)",
          type: NUMBER,
          value: "600",
        },
        {
          key: "feature_matrix",
          description: "Feature availability per plan",
          type: JSON_TYPE,
          value: JSON.stringify(
            {
              free: { maxProjects: 3, storage: "1GB", support: "community" },
              pro: { maxProjects: 50, storage: "100GB", support: "email" },
              enterprise: { maxProjects: -1, storage: "unlimited", support: "24/7" },
            },
            null,
            2,
          ),
        },
        {
          key: "custom_css",
          description: "Custom CSS overrides",
          type: CODE,
          value:
            "/* Custom theme overrides */\n:root {\n  --primary: #6366f1;\n  --primary-foreground: #ffffff;\n  --accent: #f59e0b;\n}\n\n.sidebar {\n  background: var(--primary);\n  color: var(--primary-foreground);\n}\n\n.badge-premium {\n  background: linear-gradient(135deg, #f59e0b, #ef4444);\n  color: white;\n}",
        },
      ],
    },
    {
      key: "Integrations",
      description: "Third-party service integrations",
      type: GROUP,
      children: [
        {
          key: "Stripe",
          description: "Stripe payment gateway",
          type: GROUP,
          children: [
            {
              key: "stripe_public_key",
              description: "Stripe publishable key",
              type: STRING,
              value: "pk_test_FAKE51ABC123DEF456GHI789",
            },
            {
              key: "stripe_secret_key",
              description: "Stripe secret API key",
              type: SECRET,
              value: "sk_test_FAKE51ABC123DEF456GHI789JKL",
              rotationIntervalDays: 365,
              expiresAt: daysFromNow(330),
            },
            {
              key: "stripe_webhook_secret",
              description: "Stripe webhook signing secret",
              type: SECRET,
              value: "whsec_0123456789abcdef0123456789abcdef",
              rotationIntervalDays: 180,
              expiresAt: daysFromNow(150),
            },
            {
              key: "stripe_config",
              description: "Stripe additional settings",
              type: JSON_TYPE,
              value: JSON.stringify(
                {
                  currency: "usd",
                  paymentMethods: ["card", "sepa_debit"],
                  statementDescriptor: "VAULT APP",
                  webhookEvents: [
                    "payment_intent.succeeded",
                    "customer.subscription.updated",
                    "invoice.payment_failed",
                  ],
                },
                null,
                2,
              ),
            },
          ],
        },
        {
          key: "Twilio",
          description: "Twilio SMS and voice",
          type: GROUP,
          children: [
            {
              key: "twilio_account_sid",
              description: "Twilio account SID",
              type: STRING,
              value: "FAKE_AC1234567890abcdef12345678",
            },
            {
              key: "twilio_auth_token",
              description: "Twilio auth token",
              type: SECRET,
              value: "auth_token_0123456789abcdef01234567",
              rotationIntervalDays: 180,
              expiresAt: daysFromNow(100),
            },
            {
              key: "twilio_phone_number",
              description: "Twilio phone number",
              type: STRING,
              value: "+15551234567",
            },
            {
              key: "twilio_enabled",
              description: "Enable Twilio integration",
              type: BOOLEAN,
              value: "true",
            },
          ],
        },
        {
          key: "OpenAI",
          description: "OpenAI API configuration",
          type: GROUP,
          children: [
            {
              key: "openai_api_key",
              description: "OpenAI API key",
              type: SECRET,
              value: "sk-proj-abcdefghijklmnopqrstuvwxyz1234567890ABCDEF",
              rotationIntervalDays: 90,
              expiresAt: daysFromNow(70),
            },
            {
              key: "openai_model",
              description: "Default model to use",
              type: STRING,
              value: "gpt-4o",
            },
            {
              key: "openai_max_tokens",
              description: "Maximum tokens per request",
              type: NUMBER,
              value: "4096",
            },
            {
              key: "openai_temperature",
              description: "Default temperature",
              type: NUMBER,
              value: "0.7",
            },
          ],
        },
      ],
    },
  ];

  // ---------------------------------------------------------------------------
  // Generate bulk filler items per group (10–100 extra items each)
  // so every group has enough items to test scrolling / pagination.
  // ---------------------------------------------------------------------------
  const types = [STRING, NUMBER, BOOLEAN, JSON_TYPE, CODE, SECRET] as const;
  const typeNames = ["STRING", "NUMBER", "BOOLEAN", "JSON", "CODE", "SECRET"] as const;

  const sampleValues: Record<string, (i: number) => string> = {
    [STRING]: (i) => {
      const vals = [
        `https://cdn.example.com/asset-${i}`,
        `user-${i}@example.com`,
        `service-account-${i}`,
        `/api/v${(i % 5) + 1}/resource`,
        `us-east-${(i % 4) + 1}`,
        `prod-cluster-${i}`,
        `feature-flag-${i}-value`,
        `Topic-${i}-notification`,
      ];
      return vals[i % vals.length];
    },
    [NUMBER]: (i) => {
      const vals = [
        String(i * 100),
        String(3000 + i),
        String((i % 100) + 1),
        String(Math.round((i * 0.37 + 0.1) * 100) / 100),
        String(1024 * ((i % 8) + 1)),
        String(60 * ((i % 10) + 1)),
      ];
      return vals[i % vals.length];
    },
    [BOOLEAN]: (i) => (i % 2 === 0 ? "true" : "false"),
    [JSON_TYPE]: (i) =>
      JSON.stringify(
        {
          enabled: i % 2 === 0,
          retries: (i % 5) + 1,
          timeout: 1000 * ((i % 10) + 1),
          tags: [`tag-${i}`, `env-${i % 3 === 0 ? "prod" : "staging"}`],
        },
        null,
        2,
      ),
    [CODE]: (i) =>
      `// Auto-generated script #${i}\nfunction process_${i}(input) {\n  const result = transform(input, { step: ${i} });\n  return validate(result);\n}\n\nexport default process_${i};`,
    [SECRET]: (i) => `generated-secret-value-${i}-${Math.random().toString(36).slice(2, 14)}`,
  };

  // Assign a random count between min and max to each group
  const bulkCounts: Record<string, number> = {
    "Application Configuration": 15 + Math.floor(Math.random() * 20), // 15–34
    Database: 25 + Math.floor(Math.random() * 30), // 25–54
    Authentication: 30 + Math.floor(Math.random() * 40), // 30–69
    Email: 10 + Math.floor(Math.random() * 15), // 10–24
    Storage: 20 + Math.floor(Math.random() * 30), // 20–49
    Monitoring: 35 + Math.floor(Math.random() * 50), // 35–84
    "Feature Flags": 40 + Math.floor(Math.random() * 60), // 40–99
    Integrations: 15 + Math.floor(Math.random() * 25), // 15–39
  };

  // Domain-specific prefixes per group for realistic key names
  const groupPrefixes: Record<string, string[]> = {
    "Application Configuration": [
      "app_theme",
      "app_timeout",
      "app_cache_ttl",
      "app_retry_count",
      "app_log_format",
      "app_cors_origin",
      "app_max_payload",
      "app_session_key",
      "app_banner_text",
      "app_webhook_url",
    ],
    Database: [
      "db_query_timeout",
      "db_max_retries",
      "db_log_slow_queries",
      "db_backup_schedule",
      "db_encryption_key",
      "db_read_preference",
      "db_shard_count",
      "db_vacuum_interval",
      "db_stats_config",
      "db_migration_script",
    ],
    Authentication: [
      "auth_token_issuer",
      "auth_max_attempts",
      "auth_lockout_enabled",
      "auth_refresh_ttl",
      "auth_api_secret",
      "auth_cors_config",
      "auth_saml_cert",
      "auth_ldap_host",
      "auth_rate_limit",
      "auth_webhook_secret",
    ],
    Email: [
      "email_retry_count",
      "email_batch_size",
      "email_tracking_enabled",
      "email_bounce_config",
      "email_api_key",
      "email_template_script",
      "email_footer_text",
      "email_max_recipients",
      "email_dkim_key",
      "email_suppress_list",
    ],
    Storage: [
      "storage_quota_mb",
      "storage_compress",
      "storage_versioning",
      "storage_lifecycle_config",
      "storage_encryption_key",
      "storage_replication_script",
      "storage_endpoint_url",
      "storage_path_prefix",
      "storage_cors_rules",
      "storage_access_key",
    ],
    Monitoring: [
      "mon_scrape_interval",
      "mon_alert_enabled",
      "mon_retention_days",
      "mon_dashboard_config",
      "mon_api_token",
      "mon_collector_script",
      "mon_endpoint_url",
      "mon_batch_size",
      "mon_labels_config",
      "mon_notify_secret",
    ],
    "Feature Flags": [
      "ff_rollout_pct",
      "ff_enabled",
      "ff_segment_rules",
      "ff_override_script",
      "ff_api_key",
      "ff_default_value",
      "ff_stale_days",
      "ff_targeting_config",
      "ff_description",
      "ff_webhook_secret",
    ],
    Integrations: [
      "int_api_url",
      "int_timeout_ms",
      "int_enabled",
      "int_config",
      "int_secret_key",
      "int_sync_script",
      "int_retry_count",
      "int_batch_size",
      "int_headers_config",
      "int_webhook_secret",
    ],
  };

  // Type cycle per prefix index so we get variety
  const prefixTypeMap = [
    STRING,
    NUMBER,
    BOOLEAN,
    JSON_TYPE,
    SECRET,
    CODE,
    STRING,
    NUMBER,
    JSON_TYPE,
    SECRET,
  ];

  for (const group of tree) {
    const count = bulkCounts[group.key] ?? 20;
    const prefixes = groupPrefixes[group.key] ?? groupPrefixes["Application Configuration"];
    const existing = group.children ?? [];

    for (let i = 0; i < count; i++) {
      const prefix = prefixes[i % prefixes.length];
      const suffix = Math.floor(i / prefixes.length) + 1;
      const key = suffix === 1 ? prefix : `${prefix}_${suffix}`;
      const type = prefixTypeMap[i % prefixTypeMap.length];
      const typeName = typeNames[types.indexOf(type as (typeof types)[number])];
      const description = `${typeName} — ${key.replace(/_/g, " ")} setting`;

      const param: Param = {
        key,
        description,
        type,
        value: sampleValues[type](i),
      };

      // Add expiration for some secrets
      if (type === SECRET) {
        const daysLeft = i % 3 === 0 ? -5 : i % 3 === 1 ? 7 : 120;
        param.expiresAt = daysLeft < 0 ? daysAgo(Math.abs(daysLeft)) : daysFromNow(daysLeft);
        param.rotationIntervalDays = [30, 60, 90, 180, 365][i % 5];
      }

      existing.push(param);
    }

    group.children = existing;
  }

  // Track inserted secret IDs for audit log / versions
  const secretIds: Array<{ id: number; key: string; value: string }> = [];

  async function insertParam(param: Param, parentId: number | null): Promise<number> {
    let value = param.value ?? null;

    // Encrypt secret values
    if (param.type === SECRET && value) {
      value = await encrypt(value);
    }

    const result = await db.query<{ cluster_space_parameter_id: number }>(
      `INSERT INTO "parameters"."cluster_space_parameter" (
        cluster_space_client_id,
        cluster_space_parameter_parent_id,
        parameter_key,
        description,
        parameter_type,
        parameter_value,
        expires_at,
        rotation_interval_days
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING cluster_space_parameter_id`,
      [
        TENANT_ID,
        parentId,
        param.key,
        param.description,
        param.type,
        value,
        param.expiresAt ?? null,
        param.rotationIntervalDays ?? null,
      ],
    );

    const id = result.rows[0].cluster_space_parameter_id;

    // Track secrets for audit/version seeding
    if (param.type === SECRET && value) {
      secretIds.push({ id, key: param.key, value });
    }

    // Recurse into children
    if (param.children) {
      for (const child of param.children) {
        await insertParam(child, id);
      }
    }

    return id;
  }

  // Insert all top-level groups
  let totalCount = 0;
  function countParams(params: Param[]): number {
    let count = 0;
    for (const p of params) {
      count++;
      if (p.children) count += countParams(p.children);
    }
    return count;
  }
  totalCount = countParams(tree);

  for (const group of tree) {
    await insertParam(group, null);
  }

  console.log(`Inserted ${totalCount} parameters.`);

  // Seed audit log entries for secrets (varied actions and timestamps)
  const actions = ["created", "updated", "revealed", "rotated"];
  const actors = [
    { email: "admin@example.com", username: "admin" },
    { email: "dev@example.com", username: "developer" },
    { email: "ops@example.com", username: "ops-team" },
    { email: "security@example.com", username: "sec-auditor" },
    { email: "ci-bot@example.com", username: "ci-pipeline" },
  ];
  const ips = ["10.0.1.15", "192.168.1.100", "172.16.0.42", "10.0.2.30", "203.0.113.50"];

  let auditCount = 0;
  for (const secret of secretIds) {
    // Each secret gets 2-5 audit entries at varied timestamps
    const entryCount = 2 + Math.floor(Math.random() * 4);
    for (let i = 0; i < entryCount; i++) {
      const action = i === 0 ? "created" : actions[Math.floor(Math.random() * actions.length)];
      const actor = actors[Math.floor(Math.random() * actors.length)];
      const ip = ips[Math.floor(Math.random() * ips.length)];
      const hoursAgo = (entryCount - i) * 24 + Math.floor(Math.random() * 24);
      const ts = new Date(now.getTime() - hoursAgo * 3600000).toISOString();

      await db.query(
        `INSERT INTO "parameters"."parameter_audit_log" (
          cluster_space_parameter_id,
          cluster_space_client_id,
          parameter_key,
          action,
          actor_email,
          actor_username,
          ip_address,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [secret.id, TENANT_ID, secret.key, action, actor.email, actor.username, ip, ts],
      );
      auditCount++;
    }
  }
  console.log(`Inserted ${auditCount} audit log entries.`);

  // Seed version history for secrets (1-3 versions each)
  let versionCount = 0;
  for (const secret of secretIds) {
    const numVersions = 1 + Math.floor(Math.random() * 3);
    for (let v = 1; v <= numVersions; v++) {
      const actor = actors[Math.floor(Math.random() * actors.length)];
      const hoursAgo = (numVersions - v + 1) * 48;
      const ts = new Date(now.getTime() - hoursAgo * 3600000).toISOString();

      // Re-encrypt a slightly different value for older versions
      const fakeOldValue = await encrypt(`${secret.key}-v${v}-${Date.now()}`);

      await db.query(
        `INSERT INTO "parameters"."parameter_version" (
          cluster_space_parameter_id,
          encrypted_value,
          version,
          created_at,
          created_by
        ) VALUES ($1, $2, $3, $4, $5)`,
        [secret.id, v === numVersions ? secret.value : fakeOldValue, v, ts, actor.email],
      );
      versionCount++;
    }
  }
  console.log(`Inserted ${versionCount} version history entries.`);
};
