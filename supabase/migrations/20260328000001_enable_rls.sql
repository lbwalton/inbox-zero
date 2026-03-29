-- US-061: Enable Row Level Security on critical user-scoped tables
-- This migration creates an app_user role, enables RLS, and adds policies
-- scoped by current_setting('app.user_id') for data isolation.

-- 1. Create app_user role (if not exists) with DML privileges
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_user') THEN
    CREATE ROLE app_user NOLOGIN;
  END IF;
END
$$;

-- Grant DML on all current tables in public schema
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;

-- Grant on future tables too
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user;

-- 2. Enable RLS on all critical user-scoped tables

-- Tables with direct userId foreign key
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ApiKey" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ContactAlias" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FocusMode" ENABLE ROW LEVEL SECURITY;

-- Tables with emailAccountId foreign key (indirect user scope via EmailAccount)
ALTER TABLE "EmailAccount" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Rule" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ExecutedRule" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "NudgeLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ContactScore" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ToneProfile" ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies — Direct userId tables

-- User: can only see own row
CREATE POLICY user_isolation ON "User"
  FOR ALL
  USING (id = current_setting('app.user_id', true))
  WITH CHECK (id = current_setting('app.user_id', true));

-- ApiKey: scoped by userId
CREATE POLICY apikey_isolation ON "ApiKey"
  FOR ALL
  USING ("userId" = current_setting('app.user_id', true))
  WITH CHECK ("userId" = current_setting('app.user_id', true));

-- ContactAlias: scoped by userId
CREATE POLICY contactalias_isolation ON "ContactAlias"
  FOR ALL
  USING ("userId" = current_setting('app.user_id', true))
  WITH CHECK ("userId" = current_setting('app.user_id', true));

-- FocusMode: scoped by userId
CREATE POLICY focusmode_isolation ON "FocusMode"
  FOR ALL
  USING ("userId" = current_setting('app.user_id', true))
  WITH CHECK ("userId" = current_setting('app.user_id', true));

-- 4. RLS Policies — emailAccountId tables (join through EmailAccount)

-- EmailAccount: scoped by userId
CREATE POLICY emailaccount_isolation ON "EmailAccount"
  FOR ALL
  USING ("userId" = current_setting('app.user_id', true))
  WITH CHECK ("userId" = current_setting('app.user_id', true));

-- Rule: scoped via EmailAccount ownership
CREATE POLICY rule_isolation ON "Rule"
  FOR ALL
  USING ("emailAccountId" IN (
    SELECT id FROM "EmailAccount" WHERE "userId" = current_setting('app.user_id', true)
  ))
  WITH CHECK ("emailAccountId" IN (
    SELECT id FROM "EmailAccount" WHERE "userId" = current_setting('app.user_id', true)
  ));

-- ExecutedRule: scoped via EmailAccount ownership
CREATE POLICY executedrule_isolation ON "ExecutedRule"
  FOR ALL
  USING ("emailAccountId" IN (
    SELECT id FROM "EmailAccount" WHERE "userId" = current_setting('app.user_id', true)
  ))
  WITH CHECK ("emailAccountId" IN (
    SELECT id FROM "EmailAccount" WHERE "userId" = current_setting('app.user_id', true)
  ));

-- NudgeLog: scoped via EmailAccount ownership
CREATE POLICY nudgelog_isolation ON "NudgeLog"
  FOR ALL
  USING ("emailAccountId" IN (
    SELECT id FROM "EmailAccount" WHERE "userId" = current_setting('app.user_id', true)
  ))
  WITH CHECK ("emailAccountId" IN (
    SELECT id FROM "EmailAccount" WHERE "userId" = current_setting('app.user_id', true)
  ));

-- ContactScore: scoped via EmailAccount ownership
CREATE POLICY contactscore_isolation ON "ContactScore"
  FOR ALL
  USING ("emailAccountId" IN (
    SELECT id FROM "EmailAccount" WHERE "userId" = current_setting('app.user_id', true)
  ))
  WITH CHECK ("emailAccountId" IN (
    SELECT id FROM "EmailAccount" WHERE "userId" = current_setting('app.user_id', true)
  ));

-- ToneProfile: scoped via EmailAccount ownership
CREATE POLICY toneprofile_isolation ON "ToneProfile"
  FOR ALL
  USING ("emailAccountId" IN (
    SELECT id FROM "EmailAccount" WHERE "userId" = current_setting('app.user_id', true)
  ))
  WITH CHECK ("emailAccountId" IN (
    SELECT id FROM "EmailAccount" WHERE "userId" = current_setting('app.user_id', true)
  ));

-- 5. Admin bypass policies — users with role='ADMIN' can access all rows

CREATE POLICY admin_bypass_user ON "User"
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM "User" WHERE id = current_setting('app.user_id', true) AND role = 'ADMIN')
  );

CREATE POLICY admin_bypass_emailaccount ON "EmailAccount"
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM "User" WHERE id = current_setting('app.user_id', true) AND role = 'ADMIN')
  );

CREATE POLICY admin_bypass_apikey ON "ApiKey"
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM "User" WHERE id = current_setting('app.user_id', true) AND role = 'ADMIN')
  );

CREATE POLICY admin_bypass_contactalias ON "ContactAlias"
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM "User" WHERE id = current_setting('app.user_id', true) AND role = 'ADMIN')
  );

CREATE POLICY admin_bypass_focusmode ON "FocusMode"
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM "User" WHERE id = current_setting('app.user_id', true) AND role = 'ADMIN')
  );

CREATE POLICY admin_bypass_rule ON "Rule"
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM "User" WHERE id = current_setting('app.user_id', true) AND role = 'ADMIN')
  );

CREATE POLICY admin_bypass_executedrule ON "ExecutedRule"
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM "User" WHERE id = current_setting('app.user_id', true) AND role = 'ADMIN')
  );

CREATE POLICY admin_bypass_nudgelog ON "NudgeLog"
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM "User" WHERE id = current_setting('app.user_id', true) AND role = 'ADMIN')
  );

CREATE POLICY admin_bypass_contactscore ON "ContactScore"
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM "User" WHERE id = current_setting('app.user_id', true) AND role = 'ADMIN')
  );

CREATE POLICY admin_bypass_toneprofile ON "ToneProfile"
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM "User" WHERE id = current_setting('app.user_id', true) AND role = 'ADMIN')
  );
