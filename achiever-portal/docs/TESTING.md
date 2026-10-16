# Testing

## Commands

```bash
npm run typecheck     # TypeScript strict mode
npm run lint          # ESLint (Next.js rules)
npm test              # Unit tests (Vitest) — no credentials needed
npm run build         # Production build
npm run check         # all four, in order — run before every push
```

## Unit tests (`tests/`, no credentials required)

| File | Covers |
|---|---|
| `podium.test.ts` | Podium order (2-1-3), 0/1/2/3/5/20/57 achievers, gallery overflow, ordinals, initials |
| `dates.test.ts` | Date validation, Monday weeks, previous/next navigation, no future navigation, shareable URLs, IST "today", deadline time-zone conversion |
| `ranking.test.ts` | Votes / score / combined methods, pending ≠ "No", minimum evaluations, full tie-break chain, determinism |
| `validation.test.ts` | Email/OTP inputs, VID rules, submission rules (categories, future dates, declaration, https links, team size), evaluation drafts vs final, invitation binding |
| `security.test.ts` | Invitation code randomness & HMAC hashing, magic-byte file checks (renamed .exe rejected, SVG rejected), file-name sanitising, CSV formula injection, conflict-of-interest hints |
| `demo-data.test.ts` | Demo data covers all layout cases, is flagged demo, exposes no private fields |

## Database security tests (`supabase/tests/database/rls.test.sql`)

pgTAP tests that act as anonymous, student, faculty and admin users and prove:

- anon sees only published achievements, cannot read `student_id`, rationale, submissions or profiles;
- students see only their own submissions, cannot promote themselves, change their VID, read other profiles, submit for someone else, create evaluations or read invitation hashes;
- faculty see only assigned submissions, cannot evaluate unassigned work, cannot vote twice, cannot change a final evaluation;
- expired invitations are refused; valid ones grant the faculty role.

**Requires** Docker + Supabase CLI (local database, no production credentials):

```bash
npx supabase init        # first time only, if supabase/config.toml does not exist
npx supabase start       # starts a local Supabase in Docker
npx supabase db reset    # applies migrations + seed.sql locally
npx supabase test db     # runs supabase/tests/database/*.sql
```

## Manual end-to-end checks

These need a real Supabase project and an email inbox, so they are done by hand (see the checklist in `docs/DEPLOYMENT.md` §9): email verification flow, file upload/download restrictions, invitation redemption, evaluation locking, publish/unpublish, mobile layout (Chrome DevTools → device toolbar → 375 px and 768 px; check there is no horizontal scrolling).

## Not yet automated

- Browser end-to-end tests (Playwright) for the full student → faculty → admin flow. Recommended next step once a staging Supabase project exists.
