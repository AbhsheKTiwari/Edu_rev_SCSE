# Achievers' Hall — Student Achievement & Project Evaluation Portal

A university platform where students submit projects and achievements, invited faculty evaluate them, and the administrator publishes daily and weekly winners to a public showcase.

**Stack:** Next.js 15 (App Router, TypeScript strict) · React 19 · Tailwind CSS 4 · Supabase (Postgres, Auth, Storage, RLS) · Zod · Vercel.

## Quick start

```bash
npm install
cp .env.example .env.local     # demo mode works without Supabase keys
npm run dev                    # http://localhost:3000
npm run check                  # typecheck + lint + tests + build
```

## Documentation

| Document | Read it when |
|---|---|
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Putting the site online (GitHub → Supabase → Vercel), admin bootstrap, backups, troubleshooting |
| [docs/SECURITY.md](docs/SECURITY.md) | Understanding who can see what, and the known limitations |
| [docs/RANKING.md](docs/RANKING.md) | Explaining how winners are suggested and published |
| [docs/TESTING.md](docs/TESTING.md) | Running the automated and manual tests |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Changing the code: folder map and key decisions |

## Routes

| Area | Routes |
|---|---|
| Public | `/`, `/achievers`, `/achievers/day/[date]`, `/achievers/week/[weekStart]`, `/privacy`, `/unauthorized`, `/not-found` |
| Student | `/student/login`, `/student/onboarding`, `/student/submit`, `/student/dashboard`, `/student/submissions/[id]` |
| Faculty | `/faculty/login`, `/faculty/invite`, `/faculty/dashboard`, `/faculty/submissions/[id]` |
| Admin | `/admin/login`, `/admin/dashboard`, `/admin/submissions` (+ `/[id]`), `/admin/faculty`, `/admin/evaluations`, `/admin/winners`, `/admin/settings`, `/admin/export` (CSV) |
| System | `/portal` (role router), `/auth/callback`, `/auth/confirm`, `/api/files/[id]` (secure download) |

## Branding

The header shows a dashed **logo placeholder** until an approved logo is configured: put the file in `public/` (e.g. `public/logo.png`) and set `NEXT_PUBLIC_LOGO_URL=/logo.png`. Use the university's name and logo only with permission from its communications office. Theme colours are CSS variables at the top of `src/app/globals.css`.
