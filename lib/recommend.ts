import { ADDONS, AddonId, PLANS, Plan, addonMonthly } from './catalog';
import type { CompanyProfile, Confidence, Grounding, ProfileField } from './types';

// Companies above this size are routed to sales for Acme Enterprise instead of a self-serve cart.
export const ENTERPRISE_EMPLOYEES = 5000;
// Large enough that a specialist can help, but still allowed to buy self-serve.
export const SALES_ASSIST_EMPLOYEES = 1000;

// Countries whose data rules make EU data residency worth setting up by default.
const EU_MARKETS =
  /\b(eu|european union|europe|austria|belgium|denmark|finland|france|germany|ireland|italy|netherlands|poland|portugal|spain|sweden)\b/i;

export interface Reasoned {
  reason: string;
  /** The rule that fired, in plain terms, for the "How we built this" panel. */
  rule: string;
  /** Profile fields the decision relied on, so the UI can show their sources. */
  basedOn: ProfileField[];
}

export interface AddonLine extends Reasoned {
  id: AddonId;
  recommended: boolean;
}

export interface SetupItem extends Reasoned {
  label: string;
}

export interface Recommendation {
  route: 'self-serve' | 'enterprise';
  plan: Plan & Reasoned;
  addons: AddonLine[];
  setup: SetupItem[];
  notes: SetupItem[];
  /** Set when the company is large enough to offer a talk-to-sales option alongside the cart. */
  salesAssist: Reasoned | null;
}

export function confidenceOf(grounding: Grounding[], field: ProfileField): Confidence | undefined {
  return grounding.find(g => g.field === field)?.confidence;
}

// Above this size, SSO and granular permissions earn the Scale plan.
export const SCALE_EMPLOYEES = 500;

/**
 * How many markets (or languages) a list describes. Exa sometimes returns a count such as
 * "150+ countries" or "Worldwide" instead of a list, so those count as that many.
 */
export function countOf(items: string[], noun: string): { count: number; label: string } {
  const stated = Math.max(0, ...items.map(m => Number(/(\d[\d,]*)\+?/.exec(m)?.[1]?.replace(/,/g, '') ?? 0)));
  if (stated > items.length) return { count: stated, label: items.find(m => /\d/.test(m)) ?? `${stated} ${noun}` };
  if (items.some(m => /\b(worldwide|global|international)\b/i.test(m))) return { count: 100, label: `${noun} worldwide` };
  return { count: items.length, label: `${items.length} ${noun}` };
}

/** The store platform's name, or null when the company doesn't sell online or Exa couldn't tell. */
export function storePlatform(profile: CompanyProfile): string | null {
  const p = profile.online_store_platform.trim();
  return !p || /^(none|unknown|n\/a)$/i.test(p) ? null : p;
}

/**
 * Turns an Exa company profile into an Acme order. Pure and synchronous so the order can be
 * re-priced instantly in the browser. Low-confidence facts never drive a recommendation.
 */
export function recommend(profile: CompanyProfile, grounding: Grounding[], seats: number): Recommendation {
  const trusted = (field: ProfileField) => confidenceOf(grounding, field) !== 'low';
  const has = (field: ProfileField, ok: boolean) => trusted(field) && ok;

  const name = profile.company_name || 'your company';
  const employees = profile.employee_count;
  const markets = profile.countries_served;
  const reach = countOf(markets, 'markets');
  const languages = profile.website_languages;
  const spoken = countOf(languages, 'languages');
  const platform = storePlatform(profile);

  const isLarge = has('employee_count', employees >= SCALE_EMPLOYEES);
  const sensitive = has('handles_sensitive_data', profile.handles_sensitive_data);
  const multiMarket = has('countries_served', reach.count >= 3);
  const sellsOnline = has('online_store_platform', platform !== null);
  const remote = has('work_model', profile.work_model === 'remote');
  const hiring = has('actively_hiring', profile.actively_hiring);
  const inEurope = has('countries_served', markets.some(m => EU_MARKETS.test(m)));

  const route = has('employee_count', employees > ENTERPRISE_EMPLOYEES) ? 'enterprise' : 'self-serve';

  let plan: Recommendation['plan'];
  if (sensitive || isLarge) {
    plan = {
      ...PLANS.scale,
      reason: sensitive
        ? `${name} works with customers' health or financial records, which calls for SSO and audit logs.`
        : `At ~${employees.toLocaleString('en-US')} employees, SSO and granular permissions keep access manageable.`,
      rule: sensitive ? 'handles_sensitive_data is true' : `employee_count ≥ ${SCALE_EMPLOYEES}`,
      basedOn: sensitive ? ['handles_sensitive_data'] : ['employee_count'],
    };
  } else if (sellsOnline || multiMarket) {
    plan = {
      ...PLANS.business,
      reason: sellsOnline
        ? `${name} sells online with ${platform}. Business connects your store and reports on revenue.`
        : `Selling in ${reach.label} calls for revenue reporting across regions.`,
      rule: sellsOnline ? 'online_store_platform is known' : 'countries_served has ≥ 3 markets',
      basedOn: sellsOnline ? ['online_store_platform'] : ['countries_served'],
    };
  } else {
    plan = {
      ...PLANS.starter,
      reason: 'Docs, projects, and chat cover what a team like yours needs today. Upgrade any time.',
      rule: 'no Business or Scale signals',
      basedOn: [],
    };
  }

  const off = (id: AddonId): AddonLine => ({ id, recommended: false, reason: ADDONS[id].summary, rule: '', basedOn: [] });

  const addons: AddonLine[] = [
    seats >= 15
      ? {
          id: 'ai',
          recommended: true,
          reason: `With ${seats} seats, an assistant that drafts and summarizes saves time for everyone.`,
          rule: 'seats ≥ 15',
          basedOn: [],
        }
      : off('ai'),
    multiMarket
      ? {
          id: 'pay',
          recommended: true,
          reason: `Selling in ${reach.label} means invoices, payouts, and sales tax in several currencies.`,
          rule: 'countries_served has ≥ 3 markets',
          basedOn: ['countries_served'],
        }
      : off('pay'),
    hiring
      ? {
          id: 'hire',
          recommended: true,
          reason: `${name} is hiring right now. Post roles and onboard new hires in the same workspace.`,
          rule: 'actively_hiring is true',
          basedOn: ['actively_hiring'],
        }
      : off('hire'),
    remote
      ? {
          id: 'devices',
          recommended: true,
          reason: `${name} works remote-first. Laptops arrive set up and secured, wherever each teammate lives.`,
          rule: 'work_model is remote',
          basedOn: ['work_model'],
        }
      : off('devices'),
    sensitive
      ? {
          id: 'comply',
          recommended: true,
          reason: 'Health or financial data means regular audits. The Compliance Pack collects the evidence for you.',
          rule: 'handles_sensitive_data is true',
          basedOn: ['handles_sensitive_data'],
        }
      : off('comply'),
  ];

  const setup: SetupItem[] = [];
  if (sellsOnline) {
    setup.push({
      label: `${platform} connector`,
      reason: 'Orders and revenue sync into your Acme reports.',
      rule: 'online_store_platform is known',
      basedOn: ['online_store_platform'],
    });
  }
  if (has('website_languages', spoken.count > 1)) {
    setup.push({
      label: `Workspace and customer pages in ${spoken.label}`,
      reason: spoken.count > languages.length ? 'Matches the languages your website already offers.' : languages.join(', '),
      rule: 'more than one website language',
      basedOn: ['website_languages'],
    });
  }
  if (inEurope) {
    setup.push({
      label: 'EU data residency',
      reason: 'Your workspace data stays in Frankfurt, which keeps GDPR reviews simple.',
      rule: 'countries_served includes the EU',
      basedOn: ['countries_served'],
    });
  }

  const notes: SetupItem[] = [];
  if (sensitive) {
    notes.push({
      label: 'Security review',
      reason: 'A specialist will walk you through our SOC 2 report, HIPAA terms, and data handling before you go live.',
      rule: 'handles_sensitive_data is true',
      basedOn: ['handles_sensitive_data'],
    });
  }

  const salesAssist: Reasoned | null =
    route === 'self-serve' && has('employee_count', employees >= SALES_ASSIST_EMPLOYEES)
      ? {
          reason: `At ~${employees.toLocaleString('en-US')} employees, a specialist can help with volume pricing and rollout.`,
          rule: `employee_count ≥ ${SALES_ASSIST_EMPLOYEES.toLocaleString('en-US')}`,
          basedOn: ['employee_count'],
        }
      : null;

  return { route, plan, addons, setup, notes, salesAssist };
}

export function monthlyTotal(plan: Plan, selected: Set<AddonId>, seats: number): number {
  let total = plan.perSeat * seats;
  for (const id of selected) total += addonMonthly(ADDONS[id], seats);
  return total;
}

export interface Mapping {
  item: string;
  rule: string;
  reason: string;
}

/**
 * For the "How we built this" panel: what each profile field (or the form's seat count)
 * added to the order, and the rule that connected them.
 */
export function mappingsByField(rec: Recommendation, profile: CompanyProfile): Map<ProfileField | 'seats', Mapping[]> {
  const out = new Map<ProfileField | 'seats', Mapping[]>();
  const add = (field: ProfileField | 'seats', m: Mapping) => out.set(field, [...(out.get(field) ?? []), m]);

  if (rec.route === 'enterprise') {
    add('employee_count', {
      item: 'Route to sales (Acme Enterprise)',
      rule: `employee_count > ${ENTERPRISE_EMPLOYEES.toLocaleString('en-US')}`,
      reason: `~${profile.employee_count.toLocaleString('en-US')} employees is beyond self-serve.`,
    });
    return out;
  }

  const items: { item: string; line: Reasoned }[] = [
    { item: `${rec.plan.name} plan`, line: rec.plan },
    ...rec.addons.filter(a => a.recommended).map(a => ({ item: ADDONS[a.id].name, line: a as Reasoned })),
    ...rec.setup.map(s => ({ item: s.label, line: s as Reasoned })),
    ...rec.notes.map(n => ({ item: n.label, line: n as Reasoned })),
    ...(rec.salesAssist ? [{ item: 'Talk-to-sales option', line: rec.salesAssist }] : []),
  ];
  for (const { item, line } of items) {
    const m = { item, rule: line.rule, reason: line.reason };
    if (line.basedOn.length) line.basedOn.forEach(f => add(f, m));
    else if (line.rule.startsWith('seats')) add('seats', m);
  }
  return out;
}
