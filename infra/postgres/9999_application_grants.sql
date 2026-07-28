-- Grant restricted application role the minimum privileges needed at runtime.
-- Run as the PostgreSQL superuser after migrations are applied.
-- The application role must already exist (created during VPS provisioning).

GRANT CONNECT ON DATABASE tt_learning TO ttlearn_app;

GRANT USAGE ON SCHEMA public TO ttlearn_app;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ttlearn_app;

GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO ttlearn_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ttlearn_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE ON SEQUENCES TO ttlearn_app;
