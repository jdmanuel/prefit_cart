// Acme's catalog. Acme is a fictional business-software suite; prices are per seat per month, billed annually.

export type PlanId = 'starter' | 'business' | 'scale';
export type AddonId = 'ai' | 'pay' | 'hire' | 'devices' | 'comply';

export interface Plan {
  id: PlanId;
  name: string;
  perSeat: number;
  summary: string;
}

export interface Addon {
  id: AddonId;
  name: string;
  summary: string;
  /** Either priced per seat, or a flat monthly amount. */
  perSeat?: number;
  flatMonthly?: number;
  priceLabel: string;
}

export const PLANS: Record<PlanId, Plan> = {
  starter: {
    id: 'starter',
    name: 'Starter',
    perSeat: 12,
    summary: 'Docs, projects, team chat, and five integrations',
  },
  business: {
    id: 'business',
    name: 'Business',
    perSeat: 24,
    summary: 'Adds automations, unlimited integrations, and revenue reporting',
  },
  scale: {
    id: 'scale',
    name: 'Scale',
    perSeat: 39,
    summary: 'Adds SSO, audit logs, granular permissions, and a 99.9% uptime SLA',
  },
};

export const ADDONS: Record<AddonId, Addon> = {
  ai: {
    id: 'ai',
    name: 'Acme AI',
    summary: 'An assistant that drafts, summarizes, and answers questions across your workspace',
    perSeat: 10,
    priceLabel: '$10 per seat',
  },
  pay: {
    id: 'pay',
    name: 'Acme Pay',
    summary: 'Invoicing, payouts, and sales tax in 135 currencies',
    flatMonthly: 149,
    priceLabel: '$149 per month',
  },
  hire: {
    id: 'hire',
    name: 'Acme Hire',
    summary: 'Job posts, an applicant tracker, and onboarding checklists',
    flatMonthly: 199,
    priceLabel: '$199 per month',
  },
  devices: {
    id: 'devices',
    name: 'Acme Devices',
    summary: 'Laptops shipped, set up, and secured for every teammate, wherever they work',
    perSeat: 18,
    priceLabel: '$18 per seat',
  },
  comply: {
    id: 'comply',
    name: 'Compliance Pack',
    summary: 'SOC 2, HIPAA, and PCI controls, with evidence collected for your audits',
    perSeat: 8,
    priceLabel: '$8 per seat',
  },
};

export function addonMonthly(addon: Addon, seats: number): number {
  return addon.flatMonthly ?? (addon.perSeat ?? 0) * seats;
}
