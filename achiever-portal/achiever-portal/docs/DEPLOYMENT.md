# Deployment guide — GitHub + Supabase + Vercel

This guide takes the project from your computer to a live, secure website. Follow the steps **in order**. Each step says what you will see when it worked.

> **Time needed:** about 60–90 minutes the first time.
> **Accounts needed (all have free tiers):** GitHub, Supabase, Vercel.

---

## 0. What you are deploying (in plain words)

| Piece | What it does | Where it lives |
|---|---|---|
| **Next.js app** (this repository) | The website: public pages, student/faculty/admin portals | Vercel |
| **Supabase Postgres** | The database (submissions, evaluations, winners…) | Supabase |
| **Supabase Auth** | Email sign-in codes / magic links | Supabase |
| **Supabase Storage** | Private evidence files | Supabase (bucket `evidence`) |
| **GitHub** | Keeps your code and history; Vercel deploys from it | GitHub |

Security is enforced **inside the database** (Row Level Security) *and* on the server, so even someone who guesses a URL cannot see data they are not allowed to see.

---

## 1. Run it on your computer first

Requirements: **Node.js 20.9 or newer** (`node -v`), **Git**.

```bash
# 1. Unzip the project, open a terminal in the folder, then:
npm install

# 2. Create your local settings file
cp .env.example .env.local          # Windows PowerShell: copy .env.example .env.local

# 3. Run all checks (types, lint, tests, production build)
npm run check

# 4. Start the site
npm run dev
```

Open http://localhost:3000. With `NEXT_PUBLIC_DEMO_MODE=true` and no Supabase keys, you will see the homepage with **synthetic demo achievers** and a dark **DEMO MODE** banner. The portals will say "Supabase is not configured yet" — that is expected.

If `npm run check` reports errors, copy the full output and send it to your developer/assistant before continuing.

---

## 2. Put the code on GitHub

1. Go to https://github.com/new → name it e.g. `achiever-portal` → **Private** → *Create repository* (do **not** add a README; the project has one).
2. In the project folder:

```bash
git init
git add .
git commit -m "Initial commit: achiever portal"
git branch -M main
git remote add origin https://github.com/<your-username>/achiever-portal.git
git push -u origin main
```

✅ **Check:** on GitHub you can see the `src`, `supabase` and `docs` folders. You must **not** see a `.env.local` file (it is excluded by `.gitignore`). If you do, delete it from GitHub immediately and rotate the keys (see §11).

---

## 3. Create the Supabase project

1. https://supabase.com/dashboard → **New project**.
2. Name: `achiever-portal`. **Region: Mumbai (ap-south-1)** — closest to India.
3. Set a strong **database password** and save it in a password manager. You rarely need it, but never put it in the code.
4. Wait ~2 minutes until the project is ready.

### 3.1 Collect the keys

Supabase → **Project Settings → API** (or **API Keys**):

| Supabase shows | Put it in variable | Secret? |
|---|---|---|
| Project URL | `NEXT_PUBLIC_SUPABASE_URL` | No |
| `anon` / **publishable** key | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | No (protected by RLS) |
| `service_role` / **secret** key | `SUPABASE_SERVICE_ROLE_KEY` | **YES — server only** |

> ⚠️ The service-role key bypasses all security rules. Never paste it into a file that starts with `NEXT_PUBLIC_`, never commit it, never share it in chat or email.

---

## 4. Create the database (migrations)

The database is built from the SQL files in `supabase/migrations/`, **in filename order**:

1. `20261016000001_schema.sql` — tables, constraints, indexes
2. `20261016000002_functions.sql` — security functions & guard triggers
3. `20261016000003_rls.sql` — Row Level Security policies
4. `20261016000004_storage.sql` — private `evidence` bucket and its policies

### Option A — Supabase CLI (recommended, repeatable)

```bash
npx supabase init          # only if the CLI says supabase/config.toml is missing; keeps existing migrations
npx supabase login
npx supabase link --project-ref <your-project-ref>   # the ref is in your project URL
npx supabase db push                                  # applies every migration in order
```

### Option B — SQL Editor (no CLI)

Supabase → **SQL Editor → New query**. Open each migration file, paste the **whole** file, click **Run**. Do files 1 → 4 in order. Each must say *Success*.

✅ **Check:** Supabase → **Table Editor** shows `profiles, submissions, submission_files, evaluations, evaluation_assignments, access_invitations, invitation_redemptions, achievements, audit_logs, app_settings, rate_limits`. Each table shows the **RLS enabled** badge. **Storage** shows a bucket named `evidence` marked **Private**.

> **Do not run `supabase/seed.sql` on production.** It inserts demo achievements for local development only.

---

## 5. Configure email sign-in (Supabase Auth)

### 5.1 URLs
Supabase → **Authentication → URL Configuration**:

- **Site URL:** `https://<your-vercel-domain>` (update after step 7; use `http://localhost:3000` for now)
- **Redirect URLs** — add all of these:
  - `http://localhost:3000/**`
  - `https://<your-vercel-domain>/**`
  - `https://*-<your-vercel-team>.vercel.app/**` (preview deployments)

### 5.2 Email template (code + link)
Supabase → **Authentication → Email Templates → Magic Link** (also paste into **Confirm signup**):

**Subject:** `Your sign-in code`

```html
<h2>Your sign-in code</h2>
<p>Enter this code on the sign-in page:</p>
<p style="font-size:28px;font-weight:bold;letter-spacing:6px">{{ .Token }}</p>
<p>Or <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/portal">click here to sign in</a>.</p>
<p>The code expires soon. If you did not request it, ignore this email.</p>
```

### 5.3 Providers & limits
- **Authentication → Providers → Email:** enabled. Keep **Confirm email** ON.
- **Authentication → Rate Limits:** keep defaults or lower them.
- **Email OTP expiration:** 600 seconds (10 min) is a good value.

### 5.4 Real email delivery (important)
Supabase's built-in email sender is for testing only — it sends only a few emails per hour. Before real students use the site, connect your own SMTP:
**Project Settings → Authentication → SMTP Settings** → use your university mail server, or a provider such as Resend, Amazon SES, Brevo or SendGrid. Set the sender to something like `no-reply@your-university.edu`.

---

## 6. Prepare the environment variables

Generate the invitation secret (run once, keep the output private):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

| Variable | Production value | Preview value |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | your project URL | same (or a staging project) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon/publishable key | same |
| `SUPABASE_SERVICE_ROLE_KEY` | service-role/secret key | same (or staging) |
| `NEXT_PUBLIC_SITE_URL` | `https://<your-domain>` | leave empty to fall back to localhost, or a fixed preview URL |
| `NEXT_PUBLIC_DEMO_MODE` | `false` | `true` |
| `NEXT_PUBLIC_PORTAL_NAME` | e.g. `Achievers' Hall` | same |
| `NEXT_PUBLIC_INSTITUTION_NAME` | your institution name | same |
| `NEXT_PUBLIC_LOGO_URL` | `/logo.png` once the approved logo is in `public/` | same |
| `APP_TIMEZONE` | `Asia/Kolkata` | same |
| `INVITE_CODE_SECRET` | the 64-character value you generated | a **different** value |
| `ALLOWED_STUDENT_EMAIL_DOMAIN` | e.g. `your-university.edu` (optional) | same |

> Changing `INVITE_CODE_SECRET` later makes all **unused** invitation codes invalid (already-redeemed faculty are unaffected).

---

## 7. Deploy on Vercel

1. https://vercel.com/new → **Import Git Repository** → choose `achiever-portal`.
2. Framework preset: **Next.js** (auto-detected). Build command `npm run build`, output default. Node.js version: **20.x or 22.x** (Project Settings → General).
3. Open **Environment Variables** and add every variable from §6.
   - Tick **Production** for production values, **Preview** for preview values.
   - `SUPABASE_SERVICE_ROLE_KEY` and `INVITE_CODE_SECRET`: tick **Sensitive**.
4. Click **Deploy**. Wait for "Congratulations".
5. Copy your domain (e.g. `achiever-portal.vercel.app`), then:
   - set `NEXT_PUBLIC_SITE_URL` to `https://achiever-portal.vercel.app` in Vercel and **Redeploy** (Deployments → ⋯ → Redeploy);
   - set the Supabase **Site URL** and **Redirect URLs** (§5.1) to this domain.

### Custom domain (optional)
Vercel → Project → **Settings → Domains** → add e.g. `achievers.your-university.edu` and create the DNS record Vercel shows (ask your IT team). Then update `NEXT_PUBLIC_SITE_URL` and the Supabase URLs again.

### Production vs preview
- Every push to `main` → **Production** deployment.
- Every other branch / pull request → **Preview** deployment with its own URL, using the **Preview** variables. Keep `NEXT_PUBLIC_DEMO_MODE=true` there, or point previews at a separate staging Supabase project so testing never touches real student data.

---

## 8. Create the first administrator (secure bootstrap)

Nobody can make themselves admin through the website. The first admin is created by you, in the database:

1. Visit `https://<your-domain>/student/login` and sign in with the **admin's email** (this creates a normal account).
2. Supabase → **SQL Editor** → open `supabase/admin-bootstrap.sql`, replace `REPLACE_WITH_ADMIN_EMAIL@your-university.edu` (2 places) and **Run**.
3. The final `select` must show **one** row with `role = admin`.
4. Sign out, then sign in at `https://<your-domain>/admin/login`.

---

## 9. Verify the deployment (checklist)

Tick each one on the production URL:

- [ ] Homepage loads, shows **no** DEMO banner, and an empty state "No achievements published for this day".
- [ ] `/achievers/day/2026-01-01` and `/achievers/week/<a Monday>` load; a future date redirects back.
- [ ] `/student/dashboard` while signed out → redirected to `/student/login`.
- [ ] Student: sign in with a code → profile form (VID + name) → submit a project with a PDF → confirmation page with a `SUB-…` reference.
- [ ] Student cannot open another student's `/student/submissions/<id>` (shows "not found").
- [ ] Admin: `/admin/faculty` → generate invitation → code shown once.
- [ ] Faculty (different email): `/faculty/invite` → verify email → redeem code → faculty dashboard.
- [ ] Admin assigns the faculty member on the submission page; faculty sees it, downloads evidence, submits an evaluation.
- [ ] Faculty cannot change a submitted evaluation; admin can **Reopen** it.
- [ ] Admin marks the submission **eligible** → `/admin/winners` → add as draft → preview → **Publish** → visible on the homepage → **Unpublish** removes it.
- [ ] `/admin/dashboard` while signed in as a student → **Access denied**.
- [ ] Supabase → Storage → `evidence` → files are **not** publicly accessible (opening an object URL without a token fails).
- [ ] Supabase → **Advisors → Security Advisor** shows no critical warnings.

---

## 10. Logs and debugging

| Problem | Where to look |
|---|---|
| Page shows "Something went wrong" | Vercel → Project → **Logs** (filter by *Error*). Lines start with tags like `[submission]`, `[auth]`, `[invite]`. |
| Build failed | Vercel → **Deployments** → the failed one → **Build Logs**. Run `npm run check` locally to reproduce. |
| No sign-in email | Supabase → **Authentication → Logs**; check SMTP settings (§5.4) and spam folder; rate limits. |
| "That code is incorrect or has expired" | Code older than the OTP expiry, or a newer code was requested — only the latest code works. |
| Sign-in link opens the wrong site | Supabase Site URL / Redirect URLs (§5.1) and `NEXT_PUBLIC_SITE_URL`. |
| "permission denied" / empty lists | Supabase → **Logs → Postgres**. Usually a migration was skipped — re-check §4. |
| Upload fails | File type/size (PDF, PNG, JPG, WebP, DOCX, PPTX; default 10 MB). Supabase → Storage → bucket `evidence` exists. |
| Invitations "not configured" | `INVITE_CODE_SECRET` missing or shorter than 32 characters in Vercel. |

To change a variable: Vercel → Settings → Environment Variables → edit → **Redeploy** (variables only apply to new deployments).

---

## 11. Backups and recovery

- **Automatic:** Supabase Pro plans take daily backups (7 days); the **Free plan has no downloadable backups** — make your own.
- **Manual backup (recommended weekly + before every migration):**
  ```bash
  npx supabase db dump --linked -f backups/schema-$(date +%F).sql
  npx supabase db dump --linked --data-only -f backups/data-$(date +%F).sql
  ```
  Store backups somewhere private (never in the public repo; `backups/` is not committed if you add it to `.gitignore`).
- **Evidence files** live in Storage and are not included in `db dump`. Download the `evidence` bucket periodically (Supabase dashboard or `supabase storage` CLI) if you need offline copies.
- **Restore:** create a new Supabase project → run migrations (§4) → `psql "<connection string>" -f backups/data-YYYY-MM-DD.sql` → update Vercel variables to the new project → redeploy.
- **Leaked key?** Supabase → Project Settings → API → **rotate** the key (or roll the JWT secret) → update Vercel variables → redeploy. For a leaked `INVITE_CODE_SECRET`, generate a new one and re-issue open invitations.
- **Bad deployment?** Vercel → Deployments → pick the last good one → **Promote to Production** (instant rollback).

---

## 12. Free-tier limitations (check current limits on each provider's pricing page)

**Supabase Free**
- Project **pauses after ~1 week of inactivity** — the site stops working until you press *Restore* in the dashboard. Upgrade to Pro for anything students rely on.
- Limited database size (≈500 MB) and storage (≈1 GB) — evidence files fill this fastest. The app limits files to 10 MB each and 5 per submission.
- Built-in email sender allows only a handful of emails per hour → configure SMTP (§5.4).
- No downloadable automatic backups.

**Vercel Hobby**
- Intended for **personal, non-commercial** use. An official university deployment should use **Vercel Pro** (or the university's own account).
- Serverless request body limit **4.5 MB** — that is why evidence files upload **directly to Supabase Storage** instead of through Vercel.
- Function execution time limits; logs kept only a short time.

---

## 13. Updating the site later

```bash
git pull                      # get the latest code
npm install
npm run check                 # must pass before pushing
git add . && git commit -m "Describe the change"
git push                      # Vercel deploys automatically
```

New database changes are always added as **new** migration files (never edit an old one that has already run), then applied with `npx supabase db push` **before** pushing the code that needs them. Back up first (§11).
