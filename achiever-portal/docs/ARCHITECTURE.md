# Architecture and key decisions (plain-language)

## Folder map

```
src/
  app/                       ← every URL of the site (Next.js App Router)
    page.tsx                 ← homepage (achievers first, then intro, categories, research, placements, recent)
    achievers/               ← archive + /day/[date] + /week/[weekStart]
    student/(auth)/login     ← "(auth)" and "(portal)" are route GROUPS: they share a layout
    student/(portal)/…       ←   but do not appear in the URL. (portal)/layout.tsx checks the role.
    faculty/…  admin/…       ← same pattern
    api/files/[id]/route.ts  ← secure evidence download
    auth/…                   ← email link handlers
  components/                ← reusable UI (header, footer, podium, forms, badges)
  lib/
    actions/                 ← server actions ("use server"): the only code that writes data
    supabase/                ← three clients: server (as the user), browser (uploads), admin (service role)
    auth.ts                  ← requireRole(): the server-side gate
    validation.ts            ← Zod rules shared by forms and server
    ranking.ts podium.ts dates.ts files.ts invitations.ts csv.ts  ← pure logic, unit-tested
supabase/
  migrations/                ← database schema, security functions, RLS, storage (run in order)
  tests/database/            ← RLS tests (pgTAP)
  seed.sql                   ← DEV-ONLY demo achievements
  admin-bootstrap.sql        ← one-time manual admin creation
tests/                       ← Vitest unit tests
docs/                        ← this documentation
```

## Decisions explained simply

1. **The database is the security guard.** Every table has Row Level Security. Pages use a Supabase client that acts *as the signed-in user*, so the database itself filters what each person can see. The powerful "service role" key is used only in a few server actions, and only after the code has confirmed the user is an admin.

2. **Email codes instead of passwords.** Students and faculty sign in with a one-time code (or link) sent to their email. There are no passwords to leak and no shared faculty password.

3. **Faculty join by invitation only.** The admin generates a random code; only a keyed hash is stored. Redeeming happens inside one database function with a row lock, so two people cannot use the last slot at the same time.

4. **Files go straight to private storage.** Vercel limits request size to 4.5 MB, so the browser uploads evidence directly to a private Supabase bucket into the student's own folder. The server then re-downloads the first bytes to confirm the file really is a PDF/image/Office file, and deletes it if not. Downloads use 60-second signed links issued only after a permission check.

5. **The public page never touches private tables.** When the admin publishes a winner, the public fields (name, initials, title, category, remark) are copied into `achievements`. Anonymous visitors can read only those columns, so emails, VIDs and remarks can never leak through the homepage.

6. **Ranking is a suggestion, publishing is a decision.** `lib/ranking.ts` produces a deterministic order with documented tie-breaks; the admin records a rationale and publishes manually.

7. **Demo mode is explicit.** `NEXT_PUBLIC_DEMO_MODE=true` (or no Supabase keys) shows synthetic achievers with a DEMO banner. Production shows only real, approved data and real counts.

8. **Time zone.** "Today" and "this week" are calculated in `APP_TIMEZONE` (default `Asia/Kolkata`), because Vercel servers run in UTC.

9. **Component library.** shadcn/ui was not added, to keep dependencies small and avoid version conflicts. Instead, `globals.css` defines one consistent set of buttons, forms, badges, tables and alerts using CSS variables. shadcn/ui can be added later without changing the database or server code.

## Where to change common things

| Change | File |
|---|---|
| Colours, fonts, spacing | `src/app/globals.css` (`:root` variables), `src/app/layout.tsx` (fonts) |
| Logo / portal name | `.env` → `NEXT_PUBLIC_LOGO_URL`, `NEXT_PUBLIC_PORTAL_NAME`, `NEXT_PUBLIC_INSTITUTION_NAME` |
| Categories | `src/lib/types.ts` **and** check constraints in a **new** migration |
| Allowed file types / size | `src/lib/files.ts`, bucket settings (new migration), Admin → Settings (size) |
| Ranking rules | Admin → Settings; logic in `src/lib/ranking.ts` |
| Rubric criteria | `RUBRIC_CRITERIA` in `src/lib/validation.ts` |
| Footer contact details | `src/components/site-footer.tsx` |
