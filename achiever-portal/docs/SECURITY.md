# Security model

Security is enforced in **three layers**. If one layer has a bug, the next still protects the data.

1. **Database (Row Level Security + triggers + column grants)** — the final authority. Even a direct API call with a stolen anon key cannot read or change what the policies forbid.
2. **Server code (Next.js server components, server actions, route handlers)** — every protected page, action and download calls `requireRole()` / `getSession()`, which validates the session with Supabase (`auth.getUser()`), loads the role from the database, and rejects revoked accounts.
3. **Middleware** — redirects signed-out visitors away from `/student`, `/faculty`, `/admin`, `/portal`. This is convenience only; it is never relied on for authorization.

## Roles

| Role | How it is obtained | Can do |
|---|---|---|
| Anonymous | — | Read **published** achievements (limited columns only) |
| Student | Signing up with email OTP (default role) | Create/read **own** profile & submissions, upload evidence into own storage folder |
| Faculty | Redeeming an admin-issued invitation (atomic DB function) | Read **assigned** submissions & their files; create/update **own draft** evaluations |
| Admin | Server-side bootstrap only (`supabase/admin-bootstrap.sql`) | Everything, via the admin portal |

Role changes from a browser session are blocked by the `protect_profile_fields` trigger (`current_user = authenticated`). Only the SQL Editor, the service-role key (used by admin server actions after an admin check) or the `SECURITY DEFINER` invitation function can change `role` / `access_status`.

## Requirement → implementation map

| Requirement | Where |
|---|---|
| RLS on all exposed tables | `0003_rls.sql` (`enable row level security` on all 11 tables) |
| Least privilege | Column-level grants on `achievements`; `revoke all` on invitations, audit logs, rate limits; anon has no access to profiles/submissions |
| Server-side role checks | `src/lib/auth.ts` → `requireRole`, used in every portal layout, page and action |
| Authorization for every sensitive read/write | Session client (RLS) for reads; ownership re-checked in actions (`student.ts`, `faculty.ts`) |
| Private storage + restricted downloads | `0004_storage.sql` (private bucket, own-folder uploads); `src/app/api/files/[id]/route.ts` (RLS check → 60-second signed URL) |
| Safe input validation | Zod schemas in `src/lib/validation.ts`, used on client **and** server; DB check constraints |
| Rate limiting | `check_rate_limit` (Postgres, works across serverless instances): OTP send/verify, submissions, invite redemption |
| Secure invitations | 120-bit random codes, HMAC-SHA256 with `INVITE_CODE_SECRET`, only hash stored, expiry, usage limit, email/domain binding, `FOR UPDATE` row lock, redemption log |
| Duplicate vote prevention | `unique (submission_id, evaluator_id)` on `evaluations` |
| Finalized evaluations locked | `guard_evaluation` trigger + RLS update policy only on drafts; admin "Reopen" uses service role and is audited |
| Session validation | `supabase.auth.getUser()` (verifies the JWT with Supabase) — never `getSession()` alone for authorization |
| Safe error handling | Generic messages to users; details only in server logs; `error.tsx` never prints stack traces |
| Audit logging | `audit_logs` via `src/lib/audit.ts` (assignments, eligibility, reopen, invitations, faculty access, settings, winners, exports, evidence downloads by staff) |
| Role escalation protection | `protect_profile_fields` trigger; admin role only via bootstrap |
| Environment variables | `.env.example`; secrets never prefixed `NEXT_PUBLIC_`; `server-only` import guard on admin client |
| File uploads | Extension allow-list, size limit (app + bucket), **magic-byte content check** after upload, random server-chosen file names, SVG/HTML not allowed |
| External links | Only `https://` accepted; rendered with `rel="noopener noreferrer nofollow"` |
| CSV export | Formula-injection protection in `src/lib/csv.ts` |
| Open redirects | `/auth/callback` and `/auth/confirm` accept only same-site relative `next` paths |
| Security headers | `next.config.ts` (HSTS, nosniff, frame-deny, referrer, permissions policy) |

## Never exposed

- Service-role key, database password, `INVITE_CODE_SECRET` — server environment only.
- Invitation code hashes — table has no grants for `anon`/`authenticated`; admin page selects explicit columns without `code_hash`.
- Student email & VID — not stored on `achievements`; `profiles` and `submissions` are not readable by `anon`.
- Private faculty remarks — `evaluations` readable only by the evaluator and admin.
- Unpublished achievements / submissions / evidence — RLS.

## Assumptions and known limitations

- **Email ownership = identity.** Anyone who controls a mailbox can sign in as it. Use `ALLOWED_STUDENT_EMAIL_DOMAIN` to restrict students to the university domain.
- **VID is self-declared** at onboarding (validated for format and uniqueness, locked once set). If VIDs must be verified against the university roster, add an import of valid VIDs and check it in `saveOnboarding`.
- **Malware scanning** of uploaded files is not performed. Files are checked for type and size, stored privately and downloaded as attachments. For high-risk environments add a scanning step (e.g. a Supabase Edge Function calling a scanner) before faculty download.
- **Content-Security-Policy** is not set (Next.js inline scripts need nonces). To add one, follow the Next.js CSP guide using middleware nonces.
- **Rate limits** are per IP and per email/user; very distributed attacks are mitigated mainly by Supabase Auth's own limits.
- **Conflict-of-interest checks** are simple hints (same email/name, team member). The admin decides.
- `has_student_submissions`: an account that has already submitted as a student cannot become faculty (to keep roles separate). Faculty should use their staff email.
- Demo mode shows synthetic data only and is clearly labelled; set `NEXT_PUBLIC_DEMO_MODE=false` in production.

## Before enabling real student submissions

1. Run `supabase test db` (RLS tests) against a local or staging database — all must pass.
2. Supabase → Advisors → **Security Advisor**: resolve any warnings.
3. Configure SMTP and the email template.
4. Confirm `NEXT_PUBLIC_DEMO_MODE=false` and the seed file was **not** run on production.
5. Have the privacy page reviewed (`src/app/privacy/page.tsx` is a template).
