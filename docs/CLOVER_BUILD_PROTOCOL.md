# Clover Build Protocol v1

The Clover Build Protocol turns an owner-approved request into a reviewable preview candidate without granting production authority.

## Required files

- `.clover/project.json` — exact project identity, risk classification, allowed branch prefixes, commands, sensitive paths, and owner-only actions.
- `scripts/clover-build.mjs` — policy-bound runner that performs preflight checks, executes the configured validation commands, and writes a machine-readable receipt.
- `.github/workflows/preview-safety.yml` — read-only CI wrapper that checks out the exact candidate commit and uploads the receipt and browser evidence.

## Operating sequence

1. Confirm the repository, production branch, Vercel project, and production domain.
2. Create a non-production branch using an allowed prefix.
3. Make only the approved changes.
4. Push the branch. GitHub Actions validates the exact commit with read-only repository permission.
5. Vercel creates a preview deployment from the same commit.
6. Compare the receipt, GitHub commit, and Vercel deployment SHA.
7. Open or update a draft pull request for owner review.
8. Stop. Merge, production promotion, domains, secrets, data changes, and paid services require separate owner approval.

## Receipt guarantees

The receipt records:

- policy hash;
- repository, branch, source commit, production branch, and merge-base commit;
- all files changed from the production baseline;
- sensitive-path matches;
- every bootstrap and validation command, exit status, and duration;
- preview-candidate status; and
- an explicit `not-authorized` release state.

The CI receipt does not claim to observe external production promotion. Chat Pro or another authorized control plane must independently verify Vercel and domain state.

## Data boundary

Preview validation must not receive production database credentials or administrative secrets. Database migrations, production writes, and destructive storage operations belong in a separate data-change lane with backup, forward migration, corrective migration, and owner approval.

## Portability

The GitHub workflow and runner are intended to remain identical across projects. Project-specific behavior belongs in `.clover/project.json` and the repository's own test commands. Static sites, Next.js applications, and other frameworks can therefore share the same approval and receipt model while using different bootstrap and validation commands.
