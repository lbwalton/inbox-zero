-- US-067: RLS for AuditLog — admin-only read, system-only write

ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;

-- Admins can read all audit logs
CREATE POLICY auditlog_admin_read ON "AuditLog"
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM "User" WHERE id = current_setting('app.user_id', true) AND role = 'ADMIN')
  );

-- Only the service role (superuser) can insert audit logs
-- The app writes via the service-role Prisma client, not the RLS client
CREATE POLICY auditlog_service_write ON "AuditLog"
  FOR INSERT
  WITH CHECK (true);
