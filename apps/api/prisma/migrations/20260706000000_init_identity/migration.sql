-- ============================================================================
-- Digital Legacy Vault — initial migration (Phase 2: identity + audit chain)
-- Hand-written, deterministic. Matches prisma/schema.prisma exactly, plus
-- raw-SQL controls Prisma cannot express (append-only trigger on audit_events).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Enum types
-- ---------------------------------------------------------------------------
CREATE TYPE "user_status" AS ENUM ('ACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION', 'DECEASED_VERIFIED', 'DELETED');

CREATE TYPE "platform_role" AS ENUM ('GUEST', 'REGISTERED_USER', 'PREMIUM_USER', 'FAMILY_ADMIN', 'EXECUTOR', 'BENEFICIARY', 'LAWYER', 'DOCTOR', 'HOSPITAL_ADMIN', 'FINANCIAL_ADVISER', 'COMPANY_ADMIN', 'SYSTEM_ADMIN', 'SUPER_ADMIN', 'AUDITOR', 'SUPPORT_AGENT');

CREATE TYPE "refresh_token_status" AS ENUM ('ACTIVE', 'ROTATED', 'REVOKED');

CREATE TYPE "totp_status" AS ENUM ('PENDING', 'ENABLED');

CREATE TYPE "device_kind" AS ENUM ('BROWSER', 'MOBILE_PWA', 'WEBAUTHN_PASSKEY');

CREATE TYPE "org_type" AS ENUM ('LAW_FIRM', 'HOSPITAL', 'INSURER', 'FINANCIAL_ADVISORY', 'COMPANY', 'FAMILY');

CREATE TYPE "org_member_role" AS ENUM ('COMPANY_ADMIN', 'HOSPITAL_ADMIN', 'LAWYER', 'DOCTOR', 'FINANCIAL_ADVISER', 'MEMBER');

CREATE TYPE "org_member_status" AS ENUM ('INVITED', 'ACTIVE', 'SUSPENDED', 'REMOVED');

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "email_verified_at" TIMESTAMPTZ(6),
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "status" "user_status" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "locale" TEXT NOT NULL DEFAULT 'en-ZA',
    "timezone" TEXT NOT NULL DEFAULT 'Africa/Johannesburg',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE INDEX "users_status_idx" ON "users"("status");

-- ---------------------------------------------------------------------------
-- password_credentials
-- ---------------------------------------------------------------------------
CREATE TABLE "password_credentials" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "password_credentials_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "password_credentials_user_id_key" ON "password_credentials"("user_id");

ALTER TABLE "password_credentials"
    ADD CONSTRAINT "password_credentials_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- webauthn_credentials
-- ---------------------------------------------------------------------------
CREATE TABLE "webauthn_credentials" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "credential_id" TEXT NOT NULL,
    "public_key" BYTEA NOT NULL,
    "sign_count" BIGINT NOT NULL DEFAULT 0,
    "aaguid" TEXT,
    "transports" JSONB,
    "device_type" TEXT,
    "backed_up" BOOLEAN NOT NULL DEFAULT false,
    "device_label" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_used_at" TIMESTAMPTZ(6),
    "revoked_at" TIMESTAMPTZ(6),

    CONSTRAINT "webauthn_credentials_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "webauthn_credentials_credential_id_key" ON "webauthn_credentials"("credential_id");
CREATE INDEX "webauthn_credentials_user_id_idx" ON "webauthn_credentials"("user_id");

ALTER TABLE "webauthn_credentials"
    ADD CONSTRAINT "webauthn_credentials_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- totp_secrets (secret field-encrypted via @dlv/crypto FieldCipher)
-- ---------------------------------------------------------------------------
CREATE TABLE "totp_secrets" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "secret_enc" TEXT NOT NULL,
    "status" "totp_status" NOT NULL DEFAULT 'PENDING',
    "confirmed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "totp_secrets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "totp_secrets_user_id_key" ON "totp_secrets"("user_id");

ALTER TABLE "totp_secrets"
    ADD CONSTRAINT "totp_secrets_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- recovery_codes (argon2id-hashed, single use)
-- ---------------------------------------------------------------------------
CREATE TABLE "recovery_codes" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "code_hash" TEXT NOT NULL,
    "used_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recovery_codes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "recovery_codes_user_id_idx" ON "recovery_codes"("user_id");

ALTER TABLE "recovery_codes"
    ADD CONSTRAINT "recovery_codes_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- devices
-- ---------------------------------------------------------------------------
CREATE TABLE "devices" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "fingerprint_hash" TEXT NOT NULL,
    "device_kind" "device_kind" NOT NULL DEFAULT 'BROWSER',
    "display_name" TEXT NOT NULL,
    "last_used_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMPTZ(6),

    CONSTRAINT "devices_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "devices_user_id_fingerprint_hash_key" ON "devices"("user_id", "fingerprint_hash");

ALTER TABLE "devices"
    ADD CONSTRAINT "devices_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- sessions
-- ---------------------------------------------------------------------------
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "device_id" UUID,
    "ip" TEXT NOT NULL,
    "ip_masked" TEXT NOT NULL,
    "user_agent" TEXT NOT NULL,
    "device_label" TEXT NOT NULL,
    "amr" JSONB NOT NULL,
    "risk_score" INTEGER NOT NULL DEFAULT 0,
    "last_seen_at" TIMESTAMPTZ(6) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "revoked_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "sessions_user_id_revoked_at_idx" ON "sessions"("user_id", "revoked_at");

ALTER TABLE "sessions"
    ADD CONSTRAINT "sessions_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sessions"
    ADD CONSTRAINT "sessions_device_id_fkey"
    FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- refresh_tokens (rotation family + reuse detection)
-- ---------------------------------------------------------------------------
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "family_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "status" "refresh_token_status" NOT NULL DEFAULT 'ACTIVE',
    "rotated_to_id" UUID,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");
CREATE INDEX "refresh_tokens_family_id_idx" ON "refresh_tokens"("family_id");
CREATE INDEX "refresh_tokens_session_id_idx" ON "refresh_tokens"("session_id");

ALTER TABLE "refresh_tokens"
    ADD CONSTRAINT "refresh_tokens_session_id_fkey"
    FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "refresh_tokens"
    ADD CONSTRAINT "refresh_tokens_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- user_roles (RBAC)
-- ---------------------------------------------------------------------------
CREATE TABLE "user_roles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "platform_role" NOT NULL,
    "granted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_roles_user_id_role_key" ON "user_roles"("user_id", "role");

ALTER TABLE "user_roles"
    ADD CONSTRAINT "user_roles_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- organisations + organisation_members (minimal — FK stability)
-- ---------------------------------------------------------------------------
CREATE TABLE "organisations" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "org_type" "org_type" NOT NULL,
    "billing_email" TEXT NOT NULL,
    "verification_status" TEXT NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "organisations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "organisation_members" (
    "id" UUID NOT NULL,
    "organisation_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "org_member_role" NOT NULL DEFAULT 'MEMBER',
    "status" "org_member_status" NOT NULL DEFAULT 'INVITED',
    "invited_by_user_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organisation_members_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "organisation_members_organisation_id_user_id_key" ON "organisation_members"("organisation_id", "user_id");
CREATE INDEX "organisation_members_user_id_idx" ON "organisation_members"("user_id");

ALTER TABLE "organisation_members"
    ADD CONSTRAINT "organisation_members_organisation_id_fkey"
    FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "organisation_members"
    ADD CONSTRAINT "organisation_members_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- audit_events — append-only, hash-chained (invariant §7.4)
-- ---------------------------------------------------------------------------
CREATE TABLE "audit_events" (
    "id" UUID NOT NULL,
    "occurred_at" TIMESTAMPTZ(6) NOT NULL,
    "actor_user_id" UUID,
    "event_type" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "ip_masked" TEXT,
    "payload" JSONB NOT NULL,
    "prev_hash" TEXT NOT NULL,
    "event_hash" TEXT NOT NULL,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "audit_events_occurred_at_idx" ON "audit_events"("occurred_at");
CREATE INDEX "audit_events_actor_user_id_occurred_at_idx" ON "audit_events"("actor_user_id", "occurred_at");
CREATE INDEX "audit_events_event_type_occurred_at_idx" ON "audit_events"("event_type", "occurred_at");

-- Append-only enforcement: raise on any UPDATE or DELETE attempt, defending
-- against ORM bugs even where the connecting role has broad privileges
-- (production additionally REVOKEs UPDATE/DELETE from the application role).
CREATE OR REPLACE FUNCTION audit_events_block_mutation() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'audit_events is append-only (security invariant 7.4)';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_events_immutable
    BEFORE UPDATE OR DELETE ON "audit_events"
    FOR EACH ROW EXECUTE FUNCTION audit_events_block_mutation();
