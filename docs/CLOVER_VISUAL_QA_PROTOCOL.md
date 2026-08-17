# Clover Visual QA Protocol v1

## Purpose

Clover Visual QA separates repeatable browser verification from expensive human or model judgment. Every preview candidate is checked deterministically first. A model is asked to inspect only a small, ranked evidence set when visual judgment is actually warranted.

## Non-production boundary

This protocol is preview-only. It does not authorize a merge, production deployment, alias or domain change, database write, secret change, purchase, external message, or browser session containing owner credentials. GitHub Actions runs with `contents: read`, checks out the exact candidate commit, and does not persist repository credentials.

## Three-stage quality loop

1. **Deterministic browser gate.** Desktop Chromium and mobile WebKit execute the project journey. The recorder captures bounded viewport screenshots, page and console errors, same-origin request failures, horizontal overflow, visible broken images, heading and landmark information, and advisory counts for small text and tap targets.
2. **Bounded model review.** The summary selects no more than four checksum-addressed, CSS-scale JPEG screenshots. Model review is triggered for an unapproved baseline, UI-affecting changes, or an explicit `CLOVER_FORCE_MODEL_REVIEW=1`. The first pass must not ingest every screenshot, trace, video, or full-page image.
3. **Owner approval.** Deterministic success and model review can make a branch a preview candidate. They never authorize production. Owner review remains the release boundary.

## Evidence files

The workflow writes:

- `.clover/artifacts/build-receipt.json`
- `.clover/artifacts/visual-qa/receipts/*.json`
- `.clover/artifacts/visual-qa/summary.json`
- `.clover/artifacts/visual-qa/summary.md`
- `.clover/artifacts/visual-qa/model-review-queue.json`
- `.clover/artifacts/visual-qa/report.html`
- `.clover/artifacts/visual-qa/screenshots/*.jpg`
- `.clover/artifacts/playwright-report/`
- `test-results/` only when Playwright needs failure evidence

Screenshots use CSS-pixel scale and lossy JPEG compression because the purpose is layout and interaction review, not archival reproduction. SHA-256 values bind each selected image to its receipt.

## Why this is token-efficient

Most candidate iterations need no AI browser session. GitHub Actions performs the same tests every time without OpenAI model inference. When visual review is triggered, the queue limits the initial review surface to four screenshots plus a compact JSON summary. Traces, videos, and additional states are opened only to diagnose a concrete failure.

Once an owner-approved visual baseline exists, set `review.baselineStatus` in `.clover/visual-qa.json` to `approved` on a separately reviewed branch. After that, documentation, test, workflow, and protocol-only changes can remain deterministic-only unless forced review is requested.

## Adoption rule for other projects

Do not copy this protocol blindly into another repository. First identify that project’s exact repository, production branch, deployment, writable data resources, sensitive paths, test command, and safe browser journey. Add the protocol on an isolated `chatpro/`, `agent/`, or `codex/` branch and prove a clean restore/build/browser run before considering broader adoption.
