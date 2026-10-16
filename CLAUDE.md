# Overview

**Prefit Cart**, a portfolio project: a self-configuring signup for **Acme**, a fictional business-software suite. One Exa search turns a work email's domain into a cited company profile, and plain rules turn the profile into a plan, add-ons, and setup items. `README.md` is the public description of what it does and how.

Acme is the only brand on the page. The companies looked up are real, but they appear only as data; never style the app after a real company.

## Map

| Path | What it holds |
|---|---|
| `lib/exa.ts` | The Exa call (direct `fetch` to `POST https://api.exa.ai/search`, no SDK): query, system prompt, `PROFILE_SCHEMA` (10 fields, Exa's maximum), `additionalQueries`, `EXCLUDED_DOMAINS`, `contents.highlights` |
| `lib/profiles.ts` | Live lookup with saved-file fallback; shares one Exa call between simultaneous requests for a domain |
| `lib/recommend.ts` | Rules: profile + seats → plan, add-ons, setup, notes, sales routing. Each item carries a `rule` and `basedOn` fields. `mappingsByField` feeds the drawer. `countOf` reads lists that Exa returns as counts ("150+ countries", "Worldwide") |
| `lib/catalog.ts` | Acme's made-up plans and add-ons, per seat per month, billed annually |
| `lib/samples.ts` | The sample companies offered as one-click buttons on the form. Each must have a file in `data/cache/` |
| `pages/api/profile.ts` | `POST {domain, saved?}` (dev: `?save=1`) → profile, grounding, sources, timings, cost, raw request/response |
| `pages/index.tsx` | Form → tailoring → order. The lookup starts when the email field loses focus. Reads the `?data=saved|live` switch |
| `components/` | `SignupForm`, `OrderView`, `SalesModal`, `Pipeline` (the "How we built this" drawer), `ui` (Acme theme, logo, source chips) |
| `data/cache/<domain>.json` | Saved Exa results. Committed and shipped with the deployment |
| `tests/`, `tests/fixtures/` | Vitest unit tests and the frozen Exa responses they (and e2e, via `PROFILE_DIR`) use, so `data/cache` can be re-captured freely |
| `e2e/` | Playwright tests |

## Stack notes

- Next.js 15 Pages Router, React 19, Mantine 9 (needs React 19), styled-components 6 for layout and the drawer.
- Mantine's CSS is imported in `pages/_app.tsx`; `postcss.config.cjs` holds its PostCSS preset. styled-components styles are collected server-side in `pages/_document.tsx`.

## Live lookups and saved fallbacks

- With `EXA_API_KEY` set, every signup is a live lookup. Exa's synthesis varies a little between runs.
- Saved profiles are used when there's no key, when the Exa call fails (429 or network), with `DEMO_CACHE_ONLY=1`, or when the browser chose `?data=saved` (stored in `localStorage` key `exa-demo-data-mode`).
- `savedReason` (`requested`, `no-key`, `exa-error`) tells the drawer why.
- To refresh a saved profile: run the dev server, `POST /api/profile?save=1` with `{"domain": "..."}` (dev only), then commit the file. Copy it into `tests/fixtures/` only if the tests should change too.
- Saved companies: ouraring.com, bombas.com, glossier.com, calendly.com, basecamp.com, nike.com (the six samples), plus awaytravel.com and zapier.com.

## Secrets and limits

- `EXA_API_KEY` lives in `.env.local` (gitignored). **Never read, print, or commit `.env.local`.**
- The key is rate-limited to 2 requests per second. Run bulk lookups one at a time. Each lookup costs about $0.012.

## Run and test

```bash
npm run dev          # http://localhost:3000
npm test             # vitest
npm run test:e2e     # Playwright, desktop + Pixel 7, on port 3100 with saved data
npm run typecheck
```

- `.claude/launch.json` defines a `dev` configuration for the desktop app's preview.
- Playwright is pinned to 1.62 to match the locally installed Chromium build.
- To check a production build while the dev server runs: `NEXT_DIST_DIR=.next-build npx next build`.

## Deploy (Vercel)

- Vercel deploys it with no configuration.
- A deployment without `EXA_API_KEY` serves the saved companies only, which costs nothing.
- Setting `EXA_API_KEY` in a public deployment opens live lookups to every visitor, at about $0.012 each. The API route has no rate limiting, so use a key with a spending cap.
