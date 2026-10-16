-- =====================================================================
-- 0003 ROW LEVEL SECURITY + least-privilege grants
-- Every exposed table has RLS enabled. Tables with no policy for a role
-- return nothing to that role. Server code that needs more uses the
-- service-role key, and only after checking the user's role itself.
-- =====================================================================

alter table public.profiles               enable row level security;
alter table public.app_settings           enable row level security;
alter table public.submissions            enable row level security;
alter table public.submission_files       enable row level security;
alter table public.evaluation_assignments enable row level security;
alter table public.evaluations            enable row level security;
alter table public.access_invitations     enable row level security;
alter table public.invitation_redemptions enable row level security;
alter table public.achievements           enable row level security;
alter table public.audit_logs             enable row level security;
alter table public.rate_limits            enable row level security;

-- ---------- Table privileges (defence in depth on top of RLS) ----------
revoke all on public.access_invitations, public.invitation_redemptions,
              public.audit_logs, public.rate_limits
  from anon, authenticated;

revoke insert, update, delete on public.submission_files, public.achievements from anon, authenticated;
revoke insert, delete on public.profiles from anon, authenticated;
revoke insert, delete on public.app_settings from anon, authenticated;
revoke all on public.profiles, public.app_settings, public.submissions, public.submission_files,
              public.evaluation_assignments, public.evaluations
  from anon;

-- Public may read ONLY these achievement columns (no student_id, submission_id or rationale)
revoke select on public.achievements from anon, authenticated;
grant select (id, rank, display_name, initials, achievement_title, category, public_remark,
              period_type, period_start, status, published_at, is_demo)
  on public.achievements to anon, authenticated;

-- ---------- profiles ----------
create policy "profiles: read own or admin"
  on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());

create policy "profiles: update own (guarded by trigger)"
  on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- ---------- app_settings ----------
create policy "settings: signed-in users read"
  on public.app_settings for select to authenticated
  using (true);

create policy "settings: admin update"
  on public.app_settings for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------- submissions ----------
create policy "submissions: owner, admin or assigned faculty read"
  on public.submissions for select to authenticated
  using (student_id = auth.uid() or public.is_admin() or public.is_assigned(id));

create policy "submissions: students create their own"
  on public.submissions for insert to authenticated
  with check (student_id = auth.uid() and public.current_app_role() = 'student');

create policy "submissions: admin update"
  on public.submissions for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------- submission_files ----------
create policy "files: visible with their submission"
  on public.submission_files for select to authenticated
  using (exists (
    select 1 from public.submissions s
    where s.id = submission_id
      and (s.student_id = auth.uid() or public.is_admin() or public.is_assigned(s.id))
  ));

-- ---------- evaluation_assignments ----------
create policy "assignments: own faculty or admin read"
  on public.evaluation_assignments for select to authenticated
  using ((faculty_id = auth.uid() and public.is_faculty()) or public.is_admin());

create policy "assignments: admin insert"
  on public.evaluation_assignments for insert to authenticated
  with check (public.is_admin());

create policy "assignments: admin update"
  on public.evaluation_assignments for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "assignments: admin delete"
  on public.evaluation_assignments for delete to authenticated
  using (public.is_admin());

-- ---------- evaluations ----------
create policy "evaluations: own or admin read"
  on public.evaluations for select to authenticated
  using (evaluator_id = auth.uid() or public.is_admin());

create policy "evaluations: assigned faculty create own"
  on public.evaluations for insert to authenticated
  with check (evaluator_id = auth.uid() and public.is_assigned(submission_id));

create policy "evaluations: assigned faculty update own drafts"
  on public.evaluations for update to authenticated
  using (evaluator_id = auth.uid() and status = 'draft' and public.is_assigned(submission_id))
  with check (evaluator_id = auth.uid() and public.is_assigned(submission_id));

-- ---------- achievements ----------
create policy "achievements: public reads published"
  on public.achievements for select to anon, authenticated
  using (status = 'published');

-- access_invitations, invitation_redemptions, audit_logs, rate_limits:
-- no policies on purpose → only the server (service role) can use them.
