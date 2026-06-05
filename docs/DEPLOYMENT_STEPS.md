# Exact Deployment Steps

## Step 1 — Create GitHub repo

1. Open https://github.com/new
2. Repository owner: `chrisdortch`
3. Repository name: `rollindd-platform`
4. Visibility: Private is recommended while building.
5. Do not add README/license/gitignore if uploading this starter as-is.
6. Click **Create repository**.
7. Return to ChatGPT and say: `ROLLINDD REPO READY`.

## Step 2 — Upload starter code

Option A: Let ChatGPT write files through the GitHub connector after repo exists.

Option B: Upload the zip manually:

1. Unzip `rollindd-platform-starter.zip`.
2. Upload all files to GitHub, or use GitHub Desktop.
3. Commit to `main`.

## Step 3 — Create Vercel project

1. Open https://vercel.com/new
2. Import `chrisdortch/rollindd-platform`.
3. Project name: `rollindd-platform`.
4. Framework preset: Next.js.
5. Leave environment variables blank for first demo deploy.
6. Click **Deploy**.

## Step 4 — Test preview

Open the Vercel deployment URL.

Check:

- Public page loads.
- 3-column cover grid appears.
- Search works.
- Exact-match toggle works.
- Tapping a track opens full-screen player.
- `/admin` opens Central Command.
- Fetch button returns a result.

## Step 5 — Add database later

Use Neon or Vercel Postgres when persistence is needed. Apply `sql/schema.sql`, then add `POSTGRES_URL` and related environment variables in Vercel.

## Step 6 — Add first domain

Only after preview approval:

1. In Vercel project settings, open Domains.
2. Add the custom domain.
3. Follow Vercel DNS instructions exactly.
4. After DNS verifies, test on iPhone Safari and desktop.
