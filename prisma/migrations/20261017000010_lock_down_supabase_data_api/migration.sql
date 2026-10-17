-- The app reaches Postgres only through Prisma, as the tables' owner. On
-- Supabase, the "anon" and "authenticated" roles behind its public Data API
-- (usable with the publishable key) get access to every table in "public" by
-- default, which would expose users' emails and password hashes. Take that
-- away, for existing and future tables, and turn on row-level security with no
-- policies as a second lock. The owner bypasses RLS, so the app is unaffected.
-- On plain Postgres (local, tests) the roles don't exist and only RLS applies.
DO $$
DECLARE
  r record;
BEGIN
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') AND EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
    REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
    REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated;
    EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated', current_user);
    EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated', current_user);
    EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon, authenticated', current_user);
  END IF;
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.tablename);
  END LOOP;
END $$;
