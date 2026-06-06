# RollinDD Deployment Steps

## Current connected resources

- GitHub repo: `chrisdortch/rollindd-platform`
- Vercel project: `rollindd-platform`
- Default branch: `main`
- Framework: Next.js

## Step 1 - Deploy from GitHub

1. Commit changes to `main`.
2. Let Vercel deploy from the connected GitHub project.
3. Confirm the deployment reaches `READY`.

## Step 2 - Test preview

Open the Vercel deployment URL.

Check:

- Public page loads.
- 3-column cover grid appears.
- Search works.
- Exact-match toggle works.
- Tapping a track opens full-screen player.
- `/admin` opens Central Command.
- `/api/health` returns `ok: true`.
- Fetch button returns a result without private Suno credentials.

## Step 3 - Protect admin writes

1. Add `ROLLINDD_ADMIN_SECRET` in Vercel project environment variables.
2. Redeploy if Vercel does not automatically refresh the runtime.
3. Enter the same secret in `/admin` before running write actions.

## Step 4 - Add database persistence

Use Neon or Vercel Postgres when persistence is needed.

1. Add `POSTGRES_URL` and related Postgres variables in Vercel.
2. Open `/admin`.
3. Enter `ROLLINDD_ADMIN_SECRET`.
4. Press **Apply Schema**, or apply `sql/schema.sql` from the database console.
5. Recheck readiness in `/admin` or `/api/platform-status`.

## Step 5 - Add first domain

Only after preview approval:

1. In Vercel project settings, open Domains.
2. Add the custom domain.
3. Follow Vercel DNS instructions exactly.
4. After DNS verifies, test on iPhone Safari and desktop.
