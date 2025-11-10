-- Drop legacy audit tables (moved to MongoDB)
DROP TABLE IF EXISTS "public"."AuditLog" CASCADE;
DROP TABLE IF EXISTS "public"."Alert" CASCADE;
