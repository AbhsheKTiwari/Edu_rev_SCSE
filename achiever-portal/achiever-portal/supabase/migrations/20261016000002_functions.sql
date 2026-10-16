-- =====================================================================
-- 0002 FUNCTIONS & GUARD TRIGGERS
-- "current_user in ('authenticated','anon')" means: the change came from a
-- browser/user session (PostgREST). Changes made by the server with the
-- service-role key, or inside SECURITY DEFINER functions, run as another
-- database role and are trusted.
-- =====================================================================

-- Role helpers (SECURITY DEFINER so RLS policies can call them without recursion)
create or replace function public.current_app_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case when p.access_status = 'active' then p.role else null end
  from public.profiles p
  where p.id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.current_app_role() = 'admin', false);
$$;

create or replace function public.is_faculty()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.current_app_role() = 'faculty', false);
$$;

create or replace function public.is_assigned(p_submission uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_faculty() and exists (
    select 1 from public.evaluation_assignments a
    where a.submission_id = p_submission and a.faculty_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------------
-- Prevent role escalation and protected-field edits from user sessions
-- ---------------------------------------------------------------------
create or replace function public.protect_profile_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('authenticated', 'anon') then
    if new.id is distinct from old.id
       or new.email is distinct from old.email
       or new.role is distinct from old.role
       or new.access_status is distinct from old.access_status
       or new.created_at is distinct from old.created_at then
      raise exception 'You are not allowed to change protected profile fields.'
        using errcode = '42501';
    end if;
    if old.vid is not null and new.vid is distinct from old.vid then
      raise exception 'Your VID cannot be changed once saved. Please contact the administrator.'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create trigger profiles_protect before update on public.profiles
  for each row execute function public.protect_profile_fields();

-- ---------------------------------------------------------------------
-- Submissions: copy identity from the profile, force initial status,
-- enforce submission window, future-date and per-day rules
-- ---------------------------------------------------------------------
create or replace function public.prepare_submission()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_role text;
  v_status text;
  v_vid text;
  v_name text;
  v_open boolean;
  v_deadline timestamptz;
  v_max integer;
  v_today_count integer;
begin
  if current_user in ('authenticated', 'anon') then
    select p.role, p.access_status, p.vid, p.full_name
      into v_role, v_status, v_vid, v_name
      from public.profiles p where p.id = new.student_id;

    if not found or v_role <> 'student' or v_status <> 'active' or v_vid is null or v_name is null then
      raise exception 'Complete your student profile before submitting.' using errcode = '42501';
    end if;

    new.student_vid := v_vid;
    new.student_name := v_name;
    new.status := 'submitted';
    new.eligibility_reason := null;
    new.eligibility_decided_by := null;
    new.eligibility_decided_at := null;

    if new.submission_date > (now() at time zone 'Asia/Kolkata')::date then
      raise exception 'Submission date cannot be in the future.' using errcode = '22023';
    end if;

    select s.submissions_open, s.submission_deadline, s.max_submissions_per_day
      into v_open, v_deadline, v_max
      from public.app_settings s where s.id;

    if not coalesce(v_open, false) or (v_deadline is not null and now() > v_deadline) then
      raise exception 'Submissions are currently closed.' using errcode = '42501';
    end if;

    if v_max is not null then
      select count(*) into v_today_count
        from public.submissions s
        where s.student_id = new.student_id
          and s.created_at >= date_trunc('day', now());
      if v_today_count >= v_max then
        raise exception 'Daily submission limit reached (% per day).', v_max using errcode = '42501';
      end if;
    end if;
  end if;
  return new;
end;
$$;

create trigger submissions_prepare before insert on public.submissions
  for each row execute function public.prepare_submission();

-- ---------------------------------------------------------------------
-- Evaluations: final evaluations are locked; only the server (admin
-- reopening workflow, service role) can change them.
-- ---------------------------------------------------------------------
create or replace function public.guard_evaluation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('authenticated', 'anon') then
    if tg_op = 'UPDATE' then
      if old.status = 'submitted' then
        raise exception 'This evaluation has been submitted and is locked.' using errcode = '42501';
      end if;
      if new.submission_id is distinct from old.submission_id
         or new.evaluator_id is distinct from old.evaluator_id then
        raise exception 'Not allowed.' using errcode = '42501';
      end if;
      new.reopened_at := old.reopened_at;
      new.reopened_by := old.reopened_by;
    else
      new.reopened_at := null;
      new.reopened_by := null;
    end if;

    if new.status = 'submitted' then
      new.submitted_at := now();
    else
      new.submitted_at := null;
    end if;
  end if;
  return new;
end;
$$;

create trigger evaluations_guard before insert or update on public.evaluations
  for each row execute function public.guard_evaluation();

-- When a reviewer is assigned, move the submission into review
create or replace function public.mark_under_review()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.submissions
     set status = 'under_review'
   where id = new.submission_id and status = 'submitted';
  return new;
end;
$$;

create trigger assignments_mark_review after insert on public.evaluation_assignments
  for each row execute function public.mark_under_review();

-- ---------------------------------------------------------------------
-- Atomic faculty invitation redemption
-- Called by the server with the HMAC hash of the code the user typed.
-- Row lock (FOR UPDATE) prevents two people using the last slot at once.
-- ---------------------------------------------------------------------
create or replace function public.redeem_faculty_invitation(p_code_hash text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_confirmed timestamptz;
  v_role text;
  inv public.access_invitations%rowtype;
begin
  if v_uid is null then
    return 'not_authenticated';
  end if;

  select lower(u.email), u.email_confirmed_at into v_email, v_confirmed
    from auth.users u where u.id = v_uid;
  if v_confirmed is null then
    return 'email_not_verified';
  end if;

  select * into inv from public.access_invitations
   where code_hash = p_code_hash
   for update;

  if not found then return 'invalid'; end if;
  if inv.revoked_at is not null then return 'revoked'; end if;
  if inv.expires_at <= now() then return 'expired'; end if;
  if inv.use_count >= inv.max_uses then return 'used'; end if;
  if inv.email is not null and lower(inv.email) <> v_email then return 'email_mismatch'; end if;
  if inv.email_domain is not null and split_part(v_email, '@', 2) <> lower(inv.email_domain) then
    return 'domain_mismatch';
  end if;

  select role into v_role from public.profiles where id = v_uid for update;
  if v_role = 'admin' then return 'already_admin'; end if;
  if v_role = 'faculty' then return 'already_faculty'; end if;
  if exists (select 1 from public.submissions s where s.student_id = v_uid) then
    return 'has_student_submissions';
  end if;

  update public.access_invitations set use_count = use_count + 1 where id = inv.id;
  insert into public.invitation_redemptions (invitation_id, redeemed_by, redeemed_email)
    values (inv.id, v_uid, v_email);
  update public.profiles set role = 'faculty', access_status = 'active' where id = v_uid;
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, details)
    values (v_uid, 'invitation.redeemed', 'access_invitation', inv.id, jsonb_build_object('email', v_email));

  return 'ok';
end;
$$;

revoke all on function public.redeem_faculty_invitation(text) from public, anon;
grant execute on function public.redeem_faculty_invitation(text) to authenticated;

-- ---------------------------------------------------------------------
-- Fixed-window rate limiter (server only)
-- ---------------------------------------------------------------------
create or replace function public.check_rate_limit(p_key text, p_limit integer, p_window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  insert into public.rate_limits as r (key, window_start, count)
  values (p_key, now(), 1)
  on conflict (key) do update set
    count = case when r.window_start < now() - make_interval(secs => p_window_seconds) then 1 else r.count + 1 end,
    window_start = case when r.window_start < now() - make_interval(secs => p_window_seconds) then now() else r.window_start end
  returning count into v_count;
  return v_count <= p_limit;
end;
$$;

revoke all on function public.check_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.check_rate_limit(text, integer, integer) to service_role;
