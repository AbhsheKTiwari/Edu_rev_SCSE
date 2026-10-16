-- =====================================================================
-- SECURE ADMIN BOOTSTRAP  (run manually, ONCE, in Supabase → SQL Editor)
-- This is NOT a migration and is never run by the app.
--
-- 1. First sign in at  https://<your-site>/student/login  with the admin's
--    email address (this creates the account as a normal student).
-- 2. Replace the email below and run this script in the SQL Editor.
--    The SQL Editor runs as the database owner, so it is the only place
--    (besides the service-role key) that can grant the admin role.
-- 3. Sign out and sign in again at /admin/login.
-- =====================================================================

update public.profiles
   set role = 'admin',
       access_status = 'active',
       full_name = coalesce(full_name, 'Portal Administrator')
 where lower(email) = lower('REPLACE_WITH_ADMIN_EMAIL@your-university.edu');

insert into public.audit_logs (actor_id, action, entity_type, entity_id, details)
select id, 'admin.bootstrapped', 'profile', id, jsonb_build_object('method', 'sql-editor')
  from public.profiles
 where lower(email) = lower('REPLACE_WITH_ADMIN_EMAIL@your-university.edu');

-- Check the result (should return exactly one row with role = admin):
select id, email, role, access_status from public.profiles where role = 'admin';

-- To REMOVE admin rights later:
-- update public.profiles set role = 'student' where lower(email) = lower('old-admin@your-university.edu');
