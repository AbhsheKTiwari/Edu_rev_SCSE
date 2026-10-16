-- =====================================================================
-- 0001 SCHEMA: tables, constraints, indexes, timestamps
-- Run order matters: 0001 → 0002 → 0003 → 0004
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Shared trigger: keep updated_at current
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- 1. profiles — one row per Supabase Auth user
-- ---------------------------------------------------------------------
create table public.profiles (
  id             uuid primary key references auth.users (id) on delete cascade,
  email          text not null,
  role           text not null default 'student'
                   check (role in ('student', 'faculty', 'admin')),
  access_status  text not null default 'active'
                   check (access_status in ('active', 'revoked')),
  full_name      text check (full_name is null or char_length(full_name) between 2 and 120),
  vid            text check (vid is null or vid ~ '^[A-Za-z0-9-]{4,20}$'),
  onboarded_at   timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create unique index profiles_email_unique on public.profiles (lower(email));
create unique index profiles_vid_unique   on public.profiles (upper(vid)) where vid is not null;
create index profiles_role_idx            on public.profiles (role, access_status);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Create a profile automatically whenever a user signs up (always role = student).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, coalesce(new.email, ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- app_settings — single row of admin-controlled configuration
-- ---------------------------------------------------------------------
create table public.app_settings (
  id                       boolean primary key default true check (id),
  submissions_open         boolean not null default true,
  submission_deadline      timestamptz,
  max_submissions_per_day  integer check (max_submissions_per_day is null or max_submissions_per_day between 1 and 50),
  ranking_method           text not null default 'combined'
                             check (ranking_method in ('votes', 'score', 'combined')),
  vote_weight              numeric(3, 2) not null default 0.60 check (vote_weight between 0 and 1),
  min_evaluations          integer not null default 2 check (min_evaluations between 1 and 20),
  rubric_enabled           boolean not null default true,
  max_upload_mb            integer not null default 10 check (max_upload_mb between 1 and 50),
  updated_at               timestamptz not null default now(),
  updated_by               uuid references public.profiles (id) on delete set null
);

insert into public.app_settings (id) values (true) on conflict do nothing;

create trigger app_settings_updated_at before update on public.app_settings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 2. submissions
-- Duplicate rule: a student cannot submit two projects with the same
-- title on the same submission date. Optional per-day cap in app_settings.
-- ---------------------------------------------------------------------
create table public.submissions (
  id                      uuid primary key default gen_random_uuid(),
  reference_code          text not null unique
                            default ('SUB-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))),
  student_id              uuid not null references public.profiles (id) on delete restrict,
  student_vid             text not null,
  student_name            text not null,
  title                   text not null check (char_length(title) between 5 and 160),
  description             text not null check (char_length(description) between 30 and 5000),
  category                text not null
                            check (category in ('Research', 'Placement', 'Revenue Generation', 'Project', 'Other')),
  team_members            text[] not null default '{}' check (cardinality(team_members) <= 10),
  submission_date         date not null default current_date,
  public_summary          text check (public_summary is null or char_length(public_summary) <= 400),
  project_url             text check (project_url is null or (project_url ~* '^https://' and char_length(project_url) <= 500)),
  declaration_accepted    boolean not null check (declaration_accepted),
  status                  text not null default 'submitted'
                            check (status in ('submitted', 'under_review', 'eligible', 'ineligible', 'published', 'withdrawn')),
  eligibility_reason      text check (eligibility_reason is null or char_length(eligibility_reason) <= 1000),
  eligibility_decided_by  uuid references public.profiles (id) on delete set null,
  eligibility_decided_at  timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create unique index submissions_no_duplicate_title_per_day
  on public.submissions (student_id, lower(title), submission_date);
create index submissions_status_idx     on public.submissions (status);
create index submissions_category_idx   on public.submissions (category);
create index submissions_date_idx       on public.submissions (submission_date desc);
create index submissions_student_idx    on public.submissions (student_id, created_at desc);
create index submissions_vid_idx        on public.submissions (upper(student_vid));

create trigger submissions_updated_at before update on public.submissions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 3. submission_files — metadata only; bytes live in private storage
-- ---------------------------------------------------------------------
create table public.submission_files (
  id             uuid primary key default gen_random_uuid(),
  submission_id  uuid not null references public.submissions (id) on delete cascade,
  storage_path   text not null unique,
  original_name  text not null check (char_length(original_name) between 1 and 200),
  mime_type      text not null check (mime_type in (
                   'application/pdf', 'image/png', 'image/jpeg', 'image/webp',
                   'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                   'application/vnd.openxmlformats-officedocument.presentationml.presentation')),
  size_bytes     integer not null check (size_bytes > 0 and size_bytes <= 52428800),
  uploaded_by    uuid not null references public.profiles (id) on delete restrict,
  created_at     timestamptz not null default now()
);

create index submission_files_submission_idx on public.submission_files (submission_id);

-- ---------------------------------------------------------------------
-- 5. evaluation_assignments — which faculty member reviews what
-- ---------------------------------------------------------------------
create table public.evaluation_assignments (
  id             uuid primary key default gen_random_uuid(),
  submission_id  uuid not null references public.submissions (id) on delete cascade,
  faculty_id     uuid not null references public.profiles (id) on delete cascade,
  assigned_by    uuid references public.profiles (id) on delete set null,
  due_at         timestamptz,
  created_at     timestamptz not null default now(),
  unique (submission_id, faculty_id)
);

create index evaluation_assignments_faculty_idx on public.evaluation_assignments (faculty_id, due_at);

-- ---------------------------------------------------------------------
-- 4. evaluations — one per (submission, evaluator); UNIQUE prevents duplicate votes
-- ---------------------------------------------------------------------
create table public.evaluations (
  id               uuid primary key default gen_random_uuid(),
  submission_id    uuid not null references public.submissions (id) on delete cascade,
  evaluator_id     uuid not null references public.profiles (id) on delete cascade,
  recommendation   text check (recommendation in ('yes', 'no')),
  score            numeric(5, 2) check (score is null or (score >= 0 and score <= 100)),
  criteria_scores  jsonb not null default '{}'::jsonb,
  private_remarks  text check (private_remarks is null or char_length(private_remarks) <= 4000),
  status           text not null default 'draft' check (status in ('draft', 'submitted')),
  submitted_at     timestamptz,
  reopened_at      timestamptz,
  reopened_by      uuid references public.profiles (id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (submission_id, evaluator_id),
  check (status <> 'submitted' or (recommendation is not null and submitted_at is not null))
);

create index evaluations_evaluator_idx  on public.evaluations (evaluator_id, status);
create index evaluations_submission_idx on public.evaluations (submission_id, status);

create trigger evaluations_updated_at before update on public.evaluations
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 6. access_invitations — faculty invitation codes (only the HASH is stored)
-- ---------------------------------------------------------------------
create table public.access_invitations (
  id            uuid primary key default gen_random_uuid(),
  code_hash     text not null unique check (char_length(code_hash) = 64),
  role          text not null default 'faculty' check (role = 'faculty'),
  email         text check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  email_domain  text check (email_domain is null or email_domain ~* '^[a-z0-9.-]+\.[a-z]{2,}$'),
  expires_at    timestamptz not null,
  max_uses      integer not null default 1 check (max_uses between 1 and 100),
  use_count     integer not null default 0 check (use_count >= 0),
  note          text check (note is null or char_length(note) <= 200),
  created_by    uuid not null references public.profiles (id) on delete restrict,
  revoked_at    timestamptz,
  revoked_by    uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  check (use_count <= max_uses),
  check (email is null or email_domain is null)
);

create index access_invitations_created_idx on public.access_invitations (created_at desc);

create table public.invitation_redemptions (
  id              uuid primary key default gen_random_uuid(),
  invitation_id   uuid not null references public.access_invitations (id) on delete cascade,
  redeemed_by     uuid not null references public.profiles (id) on delete cascade,
  redeemed_email  text not null,
  redeemed_at     timestamptz not null default now(),
  unique (invitation_id, redeemed_by)
);

-- ---------------------------------------------------------------------
-- 7. achievements — what the public homepage shows
-- Public columns are copied at publish time so the public never needs
-- access to submissions, profiles, emails or VIDs.
-- ---------------------------------------------------------------------
create table public.achievements (
  id                   uuid primary key default gen_random_uuid(),
  submission_id        uuid references public.submissions (id) on delete restrict,
  student_id           uuid references public.profiles (id) on delete restrict,
  is_demo              boolean not null default false,
  period_type          text not null check (period_type in ('day', 'week')),
  period_start         date not null,
  rank                 integer not null check (rank between 1 and 100),
  display_name         text not null check (char_length(display_name) between 2 and 120),
  initials             text not null check (char_length(initials) between 1 and 3),
  achievement_title    text not null check (char_length(achievement_title) between 3 and 160),
  category             text not null
                         check (category in ('Research', 'Placement', 'Revenue Generation', 'Project', 'Other')),
  public_remark        text check (public_remark is null or char_length(public_remark) <= 280),
  selection_rationale  text check (selection_rationale is null or char_length(selection_rationale) <= 2000),
  status               text not null default 'draft' check (status in ('draft', 'published', 'unpublished')),
  published_at         timestamptz,
  published_by         uuid references public.profiles (id) on delete set null,
  created_by           uuid references public.profiles (id) on delete set null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  check (is_demo or (submission_id is not null and student_id is not null)),
  check (period_type <> 'week' or extract(isodow from period_start) = 1),
  check (status <> 'published' or published_at is not null)
);

create unique index achievements_one_rank_per_period
  on public.achievements (period_type, period_start, rank) where status = 'published';
create unique index achievements_one_entry_per_submission_period
  on public.achievements (submission_id, period_type, period_start) where submission_id is not null;
create index achievements_period_idx    on public.achievements (period_type, period_start, status);
create index achievements_published_idx on public.achievements (status, published_at desc);

create trigger achievements_updated_at before update on public.achievements
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 8. audit_logs — append-only history of admin & evaluation actions
-- ---------------------------------------------------------------------
create table public.audit_logs (
  id           uuid primary key default gen_random_uuid(),
  actor_id     uuid references public.profiles (id) on delete set null,
  action       text not null check (char_length(action) between 3 and 80),
  entity_type  text not null,
  entity_id    uuid,
  details      jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);

create index audit_logs_created_idx on public.audit_logs (created_at desc);
create index audit_logs_entity_idx  on public.audit_logs (entity_type, entity_id);

-- ---------------------------------------------------------------------
-- rate_limits — fixed-window counters for sensitive operations
-- ---------------------------------------------------------------------
create table public.rate_limits (
  key           text primary key,
  window_start  timestamptz not null default now(),
  count         integer not null default 0
);
