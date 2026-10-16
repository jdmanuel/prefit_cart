import type { CompanyProfile, Grounding, ProfileResponse } from './types';

const EXA_SEARCH_URL = 'https://api.exa.ai/search';

export const SEARCH_TYPE = process.env.EXA_SEARCH_TYPE || 'deep-lite';

// Exa caps object schemas at 10 properties and 2 levels of nesting.
export const PROFILE_SCHEMA = {
  type: 'object',
  required: [
    'company_name',
    'industry',
    'employee_count',
    'sells_to',
    'online_store_platform',
    'countries_served',
    'website_languages',
    'work_model',
    'actively_hiring',
    'handles_sensitive_data',
  ],
  properties: {
    company_name: { type: 'string', description: 'Common name of the company' },
    industry: { type: 'string', description: "Short industry label, e.g. 'Direct-to-consumer apparel'" },
    employee_count: { type: 'integer', description: 'Approximate total number of employees; 0 if unknown' },
    sells_to: {
      type: 'string',
      enum: ['consumers', 'businesses', 'both', 'unknown'],
      description: 'Who the company primarily sells to',
    },
    online_store_platform: {
      type: 'string',
      description:
        "E-commerce platform behind its online store (e.g. 'Shopify'); 'none' if it does not sell online; 'unknown' if it cannot be determined",
    },
    countries_served: {
      type: 'array',
      items: { type: 'string' },
      description:
        "Countries or regions it sells or ships to, one per item. If it serves many, list its largest markets, or a count such as '150+ countries'",
    },
    website_languages: {
      type: 'array',
      items: { type: 'string' },
      description: 'Languages its website, store, or help pages are offered in',
    },
    work_model: {
      type: 'string',
      enum: ['remote', 'hybrid', 'office', 'unknown'],
      description: 'How most employees work, from its careers pages and job posts: remote-first, hybrid, or in an office',
    },
    actively_hiring: {
      type: 'boolean',
      description: 'Whether its careers page or job boards list open roles right now',
    },
    handles_sensitive_data: {
      type: 'boolean',
      description:
        "Whether the company's core product involves customers' health or financial records (health tracking, banking, insurance, lending). Taking card payments at checkout does not count",
    },
  },
} as const;

// Contact-data scrapers and SEO directory pages: thin, often stale copies of facts the company
// publishes itself. Excluded so the profile rests on first-party and reputable business sources.
export const EXCLUDED_DOMAINS = [
  'corporateofficehq.com',
  'zoominfo.com',
  'rocketreach.co',
  'leadiq.com',
  'signalhire.com',
  'contactout.com',
  'lusha.com',
  'apollo.io',
  'clay.com',
  'highperformr.ai',
];

export function buildRequest(domain: string) {
  return {
    query: `${domain} company profile: industry, number of employees, countries it sells to, website languages, how its team works (remote, hybrid, or office), and whether it is hiring`,
    type: SEARCH_TYPE,
    systemPrompt:
      `Research the company that owns the website ${domain}. Prefer the company's own site (about, careers, help, store) ` +
      'and reputable business sources. Report facts only. If a fact cannot be determined, use "unknown" for strings, ' +
      '0 for numbers, false for booleans, and an empty list for arrays. Never guess.',
    // These facts live on careers, about, and store pages, so point extra searches straight at them.
    additionalQueries: [
      `${domain} careers: open roles, remote or hybrid or in-office work, office locations`,
      `${domain} about us: company size, headquarters, and countries or markets served`,
      `${domain} online store e-commerce platform and tech stack`,
    ],
    excludeDomains: EXCLUDED_DOMAINS,
    numResults: 8,
    // The passages behind each source, so a reviewer can read the evidence without opening the page.
    contents: {
      highlights: { query: 'company size, markets served, remote or office work, open roles, online store platform', maxCharacters: 400 },
    },
    outputSchema: PROFILE_SCHEMA,
  };
}

interface ExaSearchResponse {
  results?: { title: string | null; url: string; highlights?: string[] }[];
  output?: { content: CompanyProfile | string; grounding: Grounding[] };
  costDollars?: { total?: number };
  searchTime?: number;
  error?: string;
}

/** Calls Exa's /search endpoint once and returns the profile with timing and cost metadata. */
export async function lookupCompany(domain: string, apiKey: string): Promise<ProfileResponse> {
  const request = buildRequest(domain);
  const started = Date.now();
  const res = await fetch(EXA_SEARCH_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': apiKey },
    body: JSON.stringify(request),
  });
  const roundTripMs = Date.now() - started;
  const body = (await res.json()) as ExaSearchResponse;
  if (!res.ok || !body.output) {
    throw new Error(`Exa ${res.status}: ${body.error ?? 'no synthesized output'}`);
  }

  const content = body.output.content;
  const profile = (typeof content === 'string' ? JSON.parse(content) : content) as CompanyProfile;

  return {
    domain,
    profile,
    grounding: body.output.grounding ?? [],
    sources: (body.results ?? []).map(r => ({ title: r.title ?? r.url, url: r.url, highlights: r.highlights ?? [] })),
    timings: {
      roundTripMs,
      searchTimeMs: Math.round(body.searchTime ?? roundTripMs),
      queueMs: Number(res.headers.get('x-exa-queue-ms') ?? 0),
    },
    costDollars: body.costDollars?.total ?? 0,
    searchType: SEARCH_TYPE,
    request,
    response: body as unknown as Record<string, unknown>,
    cached: false,
    fetchedAt: new Date().toISOString(),
  };
}
