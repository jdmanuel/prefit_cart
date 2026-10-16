# Acme signup, tailored by Exa

A signup flow that configures itself. A buyer types a work email, and one [Exa](https://exa.ai) search turns the email's domain into a cited company profile. Plain, testable rules turn that profile into a plan, add-ons, and setup steps, each with a reason and a link to its source.

Acme is a fictional business-software suite. The companies you can look up are real.

## What it shows

- **A cart that fits the company.** A Shopify store gets a store connector. A remote-first company gets laptops shipped to every teammate. A company handling health or financial data gets SSO, audit logs, a compliance pack, and a security review. A company selling in Europe gets EU data residency.
- **Every suggestion is sourced.** Each line in the order links to the page Exa read, and facts Exa rates low-confidence never drive a decision.
- **Big companies go to sales.** Over 5,000 employees, the cart gives way to a talk-to-sales flow, with the form already filled in from the profile. Over 1,000, the buyer gets both options.
- **A "How we built this" drawer** shows the machinery: timing bars, the cost of the call, the Exa features the request used, each profile field mapped to what it added to the order and the rule that fired, and the raw request and response.

## How one signup works

1. **The buyer types a work email.** When the field loses focus, the page extracts the domain (personal addresses like Gmail are rejected) and starts the lookup, so it runs while the buyer finishes the form.
2. **The API route** (`pages/api/profile.ts`) makes one Exa `/search` call (`lib/exa.ts`):
   - `type: "deep-lite"`, which runs several searches, reads the pages, and writes one answer;
   - an `outputSchema` with 10 typed fields, each returned with citations and a confidence rating;
   - three `additionalQueries` aimed at the careers, about, and store pages where these facts live;
   - an `excludeDomains` list that skips contact-scraper sites, and `contents.highlights` for the quoted evidence.
3. **The rules** (`recommend()` in `lib/recommend.ts`) turn the profile and seat count into an order. It's a pure function, so the order re-prices instantly when the buyer changes seats or add-ons.
4. **The order page** renders the plan, add-ons, and setup items with source chips. The drawer explains how it got there.

| Profile field | What it can add |
|---|---|
| `handles_sensitive_data` | Scale plan, Compliance Pack, security review |
| `employee_count` | Scale plan (500+), talk-to-sales option (1,000+), Enterprise route (5,000+) |
| `online_store_platform` | Business plan and a store connector |
| `countries_served` | Acme Pay (3+ markets), EU data residency |
| `work_model` | Acme Devices for remote-first teams |
| `actively_hiring` | Acme Hire |
| `website_languages` | Workspace and customer pages in each language |
| seats (from the form) | Acme AI (15+ seats) |

## Live lookups and saved profiles

Every signup is a live Exa lookup when the server has an `EXA_API_KEY`. Saved profiles for eight real companies live in `data/cache/` and ship with the app. They're used when:

- there's no API key (the public demo can run this way, and the form offers the saved companies as one-click samples);
- the Exa call fails, for example on a rate limit;
- the browser asks for them with `?data=saved` (and `?data=live` switches back; the choice is remembered).

## Stack

- **Next.js 15** (Pages Router), **React 19**, TypeScript
- **Mantine 9** components, with styled-components for layout and the drawer
- **Exa Search API**, called with `fetch` so the drawer can show the exact request and response
- **Vitest** for the rules and lookup logic, **Playwright** for the flows on desktop and phone sizes. Both run on frozen Exa responses, so they're free and repeatable.

## Run it

```bash
npm install
echo "EXA_API_KEY=your-key" > .env.local   # optional; without it, only the saved companies work
npm run dev                                 # http://localhost:3000
```

```bash
npm test             # unit tests
npm run test:e2e     # end-to-end tests (starts its own server on port 3100)
npm run typecheck
```
