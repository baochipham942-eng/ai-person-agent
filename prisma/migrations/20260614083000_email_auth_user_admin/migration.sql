-- Email auth, user roles, invitation usage, and admin audit trail.

DO $$ BEGIN
    CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "UserStatus" AS ENUM ('PENDING_EMAIL', 'ACTIVE', 'SUSPENDED', 'DELETED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "User"
    ADD COLUMN IF NOT EXISTS "email" TEXT,
    ADD COLUMN IF NOT EXISTS "emailVerifiedAt" TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS "displayName" TEXT,
    ADD COLUMN IF NOT EXISTS "role" "UserRole" NOT NULL DEFAULT 'USER',
    ADD COLUMN IF NOT EXISTS "status" "UserStatus" NOT NULL DEFAULT 'PENDING_EMAIL',
    ADD COLUMN IF NOT EXISTS "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS "lastSeenAt" TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS "failedLoginCount" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "lockedUntil" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");
CREATE INDEX IF NOT EXISTS "User_role_idx" ON "User"("role");
CREATE INDEX IF NOT EXISTS "User_status_idx" ON "User"("status");
CREATE INDEX IF NOT EXISTS "User_createdAt_idx" ON "User"("createdAt");

ALTER TABLE "InvitationCode"
    ADD COLUMN IF NOT EXISTS "note" TEXT,
    ADD COLUMN IF NOT EXISTS "createdById" TEXT;

CREATE INDEX IF NOT EXISTS "InvitationCode_expiresAt_idx" ON "InvitationCode"("expiresAt");
CREATE INDEX IF NOT EXISTS "InvitationCode_channel_idx" ON "InvitationCode"("channel");
CREATE INDEX IF NOT EXISTS "InvitationCode_createdById_idx" ON "InvitationCode"("createdById");

DO $$ BEGIN
    ALTER TABLE "InvitationCode"
        ADD CONSTRAINT "InvitationCode_createdById_fkey"
        FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "InvitationCodeUse" (
    "id" TEXT NOT NULL,
    "invitationCodeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InvitationCodeUse_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "InvitationCodeUse_invitationCodeId_userId_key" ON "InvitationCodeUse"("invitationCodeId", "userId");
CREATE INDEX IF NOT EXISTS "InvitationCodeUse_userId_idx" ON "InvitationCodeUse"("userId");
CREATE INDEX IF NOT EXISTS "InvitationCodeUse_usedAt_idx" ON "InvitationCodeUse"("usedAt");

DO $$ BEGIN
    ALTER TABLE "InvitationCodeUse"
        ADD CONSTRAINT "InvitationCodeUse_invitationCodeId_fkey"
        FOREIGN KEY ("invitationCodeId") REFERENCES "InvitationCode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "InvitationCodeUse"
        ADD CONSTRAINT "InvitationCodeUse_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "EmailVerificationToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EmailVerificationToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "EmailVerificationToken_tokenHash_key" ON "EmailVerificationToken"("tokenHash");
CREATE INDEX IF NOT EXISTS "EmailVerificationToken_userId_idx" ON "EmailVerificationToken"("userId");
CREATE INDEX IF NOT EXISTS "EmailVerificationToken_expiresAt_idx" ON "EmailVerificationToken"("expiresAt");

DO $$ BEGIN
    ALTER TABLE "EmailVerificationToken"
        ADD CONSTRAINT "EmailVerificationToken_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");
CREATE INDEX IF NOT EXISTS "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");
CREATE INDEX IF NOT EXISTS "PasswordResetToken_expiresAt_idx" ON "PasswordResetToken"("expiresAt");

DO $$ BEGIN
    ALTER TABLE "PasswordResetToken"
        ADD CONSTRAINT "PasswordResetToken_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "UserAuditLog" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT,
    "targetUserId" TEXT,
    "action" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "UserAuditLog_actorUserId_idx" ON "UserAuditLog"("actorUserId");
CREATE INDEX IF NOT EXISTS "UserAuditLog_targetUserId_idx" ON "UserAuditLog"("targetUserId");
CREATE INDEX IF NOT EXISTS "UserAuditLog_action_idx" ON "UserAuditLog"("action");
CREATE INDEX IF NOT EXISTS "UserAuditLog_createdAt_idx" ON "UserAuditLog"("createdAt");

DO $$ BEGIN
    ALTER TABLE "UserAuditLog"
        ADD CONSTRAINT "UserAuditLog_actorUserId_fkey"
        FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "UserAuditLog"
        ADD CONSTRAINT "UserAuditLog_targetUserId_fkey"
        FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

