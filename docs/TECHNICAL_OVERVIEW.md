# RollinDD Technical Overview

RollinDD is a multi-tenant AI-assisted music website platform. Each website is powered by a unique Suno playlist, has its own domain, and uses its own generated visual theme based on the user’s theme description, uploaded images, and lyric analysis.

## Core architecture

- Next.js app on Vercel.
- GitHub as source control.
- One Vercel project powers many sites.
- Each custom domain maps to a site record.
- Each site stores its playlist URL, track metadata, lyrics, theme, and domain state.
- Neon/Vercel Postgres is the optional persistence layer.
- Cloudflare R2 or Vercel Blob is recommended for hosted images/media if needed.
- Google Drive can be used as an optional admin import/backup source, not the primary public CDN.

## Central Command

Central Command is the operator interface. The user types a command such as `ROLLINDD LAUNCH`, and the system parses it into technical actions.

Central Command currently performs these safe actions:

1. Check database and admin readiness through `/api/platform-status`.
2. Confirm no existing non-RollinDD projects are affected.
3. Create/update a site record.
4. Fetch playlist data from Suno where possible.
5. Analyze the full lyric corpus.
6. Generate a theme JSON object.
7. Build a lyric search index.
8. Save site, track, and command records when Postgres is configured and the schema is ready.
9. Prepare domain assignment and DNS instructions.
10. Stop for user approval before live domain moves, paid services, rights-sensitive downloads, or destructive changes.

## Suno adapter

Suno access should be implemented as an adapter with fallbacks. The preferred mode is public metadata parsing from a public/link-accessible playlist. If this fails, the admin can manually upload or connect a folder of files. The app should not depend on brittle private-account scraping.

Data to capture when available:

- Track title.
- Cover image / thumbnail.
- Video URL.
- Audio/MP3 URL.
- Lyrics.
- Duration.
- Source URL.
- Downloadability status.

## Theme generation

Themes should be structured JSON, not random CSS edits. The theme is generated from:

- User description.
- Uploaded visual references.
- Full playlist lyric analysis.

Lyric analysis should extract:

- Mood.
- Visual motifs.
- Recurring words and symbols.
- Emotional arc.
- Color recommendations.
- Player treatment.
- Hero copy.
- SEO/social preview copy.

## Public site experience

- Cinematic hero.
- Fast lazy-loaded cover grid.
- Hidden artist names by default.
- Full-screen player.
- Lyrics over image/video.
- Exact lyric search inside that site only.
- Optional Download All MP3s button only when authorized and available.

## Admin experience

- Paste Suno playlist URL.
- Press Fetch.
- Review fetched media/titles/lyrics.
- Describe theme and upload images.
- Approve generated theme.
- Assign domain.
- Launch safely.
- Apply the database schema when Postgres is connected.
- Use `ROLLINDD_ADMIN_SECRET` for production write actions.

## Safety rules

RollinDD must not modify Serenity Shores, Lakeside Essentials, Poolside Pulse, Lifeguards, or any other project. All work should occur only in the RollinDD repo/project unless explicitly approved.
