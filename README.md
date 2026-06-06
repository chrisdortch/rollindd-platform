# RollinDD Platform Starter

RollinDD is a multi-tenant playlist-site launcher. One GitHub repo and one Vercel project can power many public music websites, each driven by a unique Suno playlist, custom theme, lyric search index, and optional domain.

This starter includes:

- Public playlist showcase page.
- 3-column mobile-first song cover grid.
- Full-screen cinematic player with lyrics overlay.
- Per-site lyric search with exact-match mode.
- Admin Central Command screen.
- Suno Fetch adapter with public-parse attempt and safe demo fallback.
- Theme generation heuristics from lyric corpus.
- Optional Neon/Vercel Postgres persistence for sites, tracks, domains, commands, and generated themes.
- Admin write-action protection with `ROLLINDD_ADMIN_SECRET`.
- Platform readiness checks at `/admin`, `/api/health`, and `/api/platform-status`.

## Safe isolation

This project is intentionally standalone. It does not share code, deployment settings, domains, or data with Serenity Shores, Lakeside Essentials, Poolside Pulse, or Lifeguards.

## Run locally

```bash
npm install
npm run dev
```

Open:

- Public sample site: http://localhost:3000
- Admin command center: http://localhost:3000/admin
- Sample direct site route: http://localhost:3000/sites/neon-rain
- Health: http://localhost:3000/api/health

## Central Command example

```text
ROLLINDD LAUNCH

Site name: RollinDD
Suno playlist: https://suno.com/playlist/782a2eb4-404b-47c3-b992-d5c2be81a5a0
Domain: rollindd-platform.vercel.app
Theme instruction: fearlessness, love, wisdom, patience, collaboration, competition, luminous cinematic resilience
Artist names: hide
Lyrics search: enabled
Exact match: enabled
Download all MP3s: capability_check
Budget mode: lowest cost
Autonomy: safe_max
```

## Recommended deployment path

1. Keep the GitHub repo scoped to `chrisdortch/rollindd-platform`.
2. Keep the Vercel project scoped to `rollindd-platform`.
3. Deploy from `main`.
4. Test the Vercel preview URL on iPhone Safari and desktop.
5. Set `ROLLINDD_ADMIN_SECRET` in Vercel before enabling admin write actions.
6. Add a Neon or Vercel Postgres database when persistence is needed.
7. Apply `sql/schema.sql` from `/admin` or through the database console.
8. Add custom domains only after preview approval.

## Production readiness

- GitHub source: `chrisdortch/rollindd-platform`.
- Vercel project: `rollindd-platform`.
- Production admin writes require `ROLLINDD_ADMIN_SECRET`.
- Without `POSTGRES_URL`, RollinDD serves demo fallback data and skips database writes.
- With `POSTGRES_URL` and schema applied, Central Command saves site, track, and command records.
- Domain moves, DNS changes, media downloads, and paid services remain approval-gated.

## Current limitations

The Suno Fetch adapter is deliberately conservative. It attempts to parse public playlist metadata, then falls back to sample data. Do not rely on private account scraping. If Suno does not expose MP3/video/lyrics cleanly, use manual upload or Google Drive/R2 fallback.

## Next implementation milestones

- Cloudflare R2 or Vercel Blob asset storage.
- Vercel domain automation via API.
- ZIP generation for Download All MP3s only when files and rights are confirmed.
- AI theme generation through ChatGPT/OpenAI API or operator workflow.
