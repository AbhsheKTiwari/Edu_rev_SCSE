-- =====================================================================
-- Row Level Security tests (pgTAP). Run locally with:  supabase test db
-- Everything runs inside a transaction and is rolled back.
-- =====================================================================
begin;
create extension if not exists pgtap with schema extensions;

select plan(22);

-- ---------- fixtures ----------
insert into auth.users (id, email, email_confirmed_at, aud, role) values
  ('11111111-1111-1111-1111-111111111111', 'student1@test.edu', now(), 'authenticated', 'authenticated'),
  ('22222222-2222-2222-2222-222222222222', 'student2@test.edu', now(), 'authenticated', 'authenticated'),
  ('33333333-3333-3333-3333-333333333333', 'faculty1@test.edu', now(), 'authenticated', 'authenticated'),
  ('44444444-4444-4444-4444-444444444444', 'faculty2@test.edu', now(), 'authenticated', 'authenticated'),
  ('55555555-5555-5555-5555-555555555555', 'admin@test.edu',    now(), 'authenticated', 'authenticated'),
  ('66666666-6666-6666-6666-666666666666', 'newfaculty@test.edu', now(), 'authenticated', 'authenticated');

-- Profiles were created by the trigger as students. Promote fixtures as the database owner.
update public.profiles set full_name = 'Student One', vid = 'VID0001' where id = '11111111-1111-1111-1111-111111111111';
update public.profiles set full_name = 'Student Two', vid = 'VID0002' where id = '22222222-2222-2222-2222-222222222222';
update public.profiles set role = 'faculty' where id in ('33333333-3333-3333-3333-333333333333', '44444444-4444-4444-4444-444444444444');
update public.profiles set role = 'admin' where id = '55555555-5555-5555-5555-555555555555';

insert into public.submissions (id, student_id, student_vid, student_name, title, description, category, declaration_accepted)
values
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'VID0001', 'Student One',
   'Solar dryer project', 'A low-cost solar dryer for farmers, tested over two weeks with logs.', 'Project', true),
  ('aaaaaaaa-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'VID0002', 'Student Two',
   'Placement offer', 'Received a software engineering offer after three interview rounds.', 'Placement', true);

insert into public.evaluation_assignments (submission_id, faculty_id)
values ('aaaaaaaa-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333');

insert into public.achievements (id, submission_id, student_id, period_type, period_start, rank, display_name, initials,
  achievement_title, category, selection_rationale, status, published_at)
values
  ('bbbbbbbb-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
   'day', current_date, 1, 'Student One', 'SO', 'Solar dryer project', 'Project', 'secret rationale', 'published', now()),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222',
   'day', current_date, 2, 'Student Two', 'ST', 'Placement offer', 'Placement', null, 'draft', null);

insert into public.access_invitations (id, code_hash, expires_at, max_uses, created_by) values
  ('cccccccc-0000-0000-0000-000000000001', repeat('a', 64), now() + interval '1 day', 1, '55555555-5555-5555-5555-555555555555'),
  ('cccccccc-0000-0000-0000-000000000002', repeat('b', 64), now() - interval '1 day', 1, '55555555-5555-5555-5555-555555555555');

-- helper to act as a user
create or replace function pg_temp.act_as(uid uuid, email text) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated', 'email', email)::text, true),
         set_config('role', 'authenticated', true);
$$;

-- ================= Anonymous public visitor =================
set local role anon;
select is((select count(*)::int from public.achievements), 1, 'anon sees only published achievements');
select throws_ok($$ select student_id from public.achievements $$, '42501', null, 'anon cannot read student_id of achievements');
select throws_ok($$ select selection_rationale from public.achievements $$, '42501', null, 'anon cannot read private rationale');
select throws_ok($$ select * from public.submissions $$, '42501', null, 'anon cannot read submissions');
select throws_ok($$ select * from public.profiles $$, '42501', null, 'anon cannot read profiles (emails/VIDs)');
reset role;

-- ================= Student 1 =================
select pg_temp.act_as('11111111-1111-1111-1111-111111111111', 'student1@test.edu');
select is((select count(*)::int from public.submissions), 1, 'student sees only own submission');
select is((select count(*)::int from public.submissions where id = 'aaaaaaaa-0000-0000-0000-000000000002'), 0,
  'student cannot read another student''s submission');
select is((select count(*)::int from public.evaluations), 0, 'student cannot see evaluations / faculty remarks');
select throws_ok($$ update public.profiles set role = 'admin' where id = auth.uid() $$, '42501', null,
  'student cannot promote self to admin');
select throws_ok($$ update public.profiles set vid = 'HACKED1' where id = auth.uid() $$, '42501', null,
  'student cannot change VID once set');
select is((select count(*)::int from public.profiles where id = '22222222-2222-2222-2222-222222222222'), 0,
  'student cannot read other profiles');
select throws_ok($$ insert into public.submissions (student_id, student_vid, student_name, title, description, category, declaration_accepted)
  values ('22222222-2222-2222-2222-222222222222', 'X', 'X', 'Impersonation title', 'Trying to submit on behalf of another student here.', 'Other', true) $$,
  '42501', null, 'student cannot submit on behalf of another student');
select throws_ok($$ insert into public.evaluations (submission_id, evaluator_id, status)
  values ('aaaaaaaa-0000-0000-0000-000000000001', auth.uid(), 'draft') $$, '42501', null, 'student cannot create evaluations');
select throws_ok($$ select * from public.access_invitations $$, '42501', null, 'student cannot read invitations / code hashes');
reset role;

-- ================= Faculty 1 (assigned to submission 1) =================
select pg_temp.act_as('33333333-3333-3333-3333-333333333333', 'faculty1@test.edu');
select is((select count(*)::int from public.submissions), 1, 'faculty sees only assigned submissions');
select lives_ok($$ insert into public.evaluations (submission_id, evaluator_id, recommendation, status)
  values ('aaaaaaaa-0000-0000-0000-000000000001', auth.uid(), 'yes', 'submitted') $$, 'assigned faculty can submit evaluation');
select throws_ok($$ insert into public.evaluations (submission_id, evaluator_id, recommendation, status)
  values ('aaaaaaaa-0000-0000-0000-000000000001', auth.uid(), 'no', 'draft') $$, '23505', null, 'duplicate evaluation is rejected');
select throws_ok($$ insert into public.evaluations (submission_id, evaluator_id, status)
  values ('aaaaaaaa-0000-0000-0000-000000000002', auth.uid(), 'draft') $$, '42501', null, 'faculty cannot evaluate unassigned submission');
select is((select count(*)::int from public.evaluations where status = 'submitted' and recommendation = 'yes'), 1, 'final evaluation stored');
update public.evaluations set recommendation = 'no' where evaluator_id = auth.uid();
select is((select recommendation from public.evaluations where evaluator_id = auth.uid()), 'yes', 'submitted evaluation cannot be changed (RLS hides it from update)');
reset role;

-- ================= Invitation redemption =================
select pg_temp.act_as('66666666-6666-6666-6666-666666666666', 'newfaculty@test.edu');
select is(public.redeem_faculty_invitation(repeat('b', 64)), 'expired', 'expired invitation is refused');
select is(public.redeem_faculty_invitation(repeat('a', 64)), 'ok', 'valid invitation grants faculty role');
reset role;

select * from finish();
rollback;
