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
- SQL schema for future Neon/Vercel Postgres persistence.

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

Site name: Neon Rain
Suno playlist: https://suno.com/playlist/example
Domain: neonrain.com
Theme instruction: cinematic cyberpunk heartbreak, rain, neon, spiritual resilience, gold-on-black luxury
Artist names: hide
Lyrics search: enabled
Exact match: enabled
Download all MP3s: capability_check
Budget mode: lowest cost
Autonomy: safe_max
```

## Recommended deployment path

1. Create a new GitHub repo named `rollindd-platform` under `chrisdortch`.
2. Upload this starter project into that repo.
3. In Vercel, create/import a new project named `rollindd-platform` connected only to `chrisdortch/rollindd-platform`.
4. Deploy.
5. Test the Vercel preview URL on iPhone Safari and desktop.
6. Add a Neon Postgres database only when persistence is needed.
7. Add custom domains only after preview approval.

## Current limitations

The Suno Fetch adapter is deliberately conservative. It attempts to parse public playlist metadata, then falls back to sample data. Do not rely on private account scraping. If Suno does not expose MP3/video/lyrics cleanly, use manual upload or Google Drive/R2 fallback.

## Next implementation milestones

- Real database persistence for sites, tracks, commands, domains, and themes.
- Admin authentication.
- Cloudflare R2 or Vercel Blob asset storage.
- Vercel domain automation via API.
- ZIP generation for Download All MP3s only when files and rights are confirmed.
- AI theme generation through ChatGPT/OpenAI API or operator workflow.
