import { describe, expect, it } from 'vitest';
import { PLANS } from '@/lib/catalog';
import { countOf, mappingsByField, monthlyTotal, recommend } from '@/lib/recommend';
import type { ProfileResponse } from '@/lib/types';
import basecamp from '@/tests/fixtures/basecamp.com.json';
import bombas from '@/tests/fixtures/bombas.com.json';
import calendly from '@/tests/fixtures/calendly.com.json';
import glossier from '@/tests/fixtures/glossier.com.json';
import nike from '@/tests/fixtures/nike.com.json';
import oura from '@/tests/fixtures/ouraring.com.json';

// Fixtures are real Exa responses, frozen so the tests give the same answer every run.
const run = (r: unknown, seats = 25) => {
  const { profile, grounding } = r as ProfileResponse;
  return recommend(profile, grounding, seats);
};
const recommended = (rec: ReturnType<typeof recommend>) => rec.addons.filter(a => a.recommended).map(a => a.id);

describe('recommend', () => {
  it('puts a Shopify store on Business with a store connector (Bombas)', () => {
    const rec = run(bombas);
    expect(rec.route).toBe('self-serve');
    expect(rec.plan.id).toBe('business');
    expect(rec.plan.rule).toBe('online_store_platform is known');
    expect(recommended(rec)).toEqual(['ai', 'hire']);
    expect(rec.setup.map(s => s.label)).toContain('Shopify Plus connector');
  });

  it('adds compliance and a security review for a health-data company (Oura)', () => {
    const rec = run(oura);
    expect(rec.plan.id).toBe('scale');
    expect(rec.plan.rule).toBe('handles_sensitive_data is true');
    expect(recommended(rec)).toEqual(['ai', 'pay', 'hire', 'comply']);
    expect(rec.notes.map(n => n.label)).toContain('Security review');
  });

  it('sets up EU data residency for a company selling in Europe (Glossier)', () => {
    const rec = run(glossier);
    expect(rec.setup.map(s => s.label)).toContain('EU data residency');
    expect(recommended(rec)).toContain('pay');
  });

  it('ships devices to remote-first teams only (Basecamp, Calendly)', () => {
    expect(recommended(run(basecamp))).toContain('devices');
    expect(recommended(run(calendly))).toContain('devices');
    expect(recommended(run(bombas))).not.toContain('devices'); // hybrid
  });

  it('sets up every website language (Calendly)', () => {
    expect(run(calendly).setup.some(s => s.label.includes('8 languages'))).toBe(true);
  });

  it('routes very large companies to sales (Nike)', () => {
    expect(run(nike).route).toBe('enterprise');
  });

  it('maps profile fields to what they added to the order', () => {
    const { profile, grounding } = oura as unknown as ProfileResponse;
    const map = mappingsByField(recommend(profile, grounding, 25), profile);
    expect(map.get('handles_sensitive_data')?.map(m => m.item)).toEqual(['Scale plan', 'Compliance Pack', 'Security review']);
    expect(map.get('seats')?.map(m => m.item)).toEqual(['Acme AI']);
    expect(map.get('actively_hiring')?.[0].rule).toBe('actively_hiring is true');
  });

  it('offers a talk-to-sales option to large self-serve companies only', () => {
    expect(run(oura).salesAssist?.rule).toBe('employee_count ≥ 1,000');
    expect(run(bombas).salesAssist).toBeNull();
    expect(run(nike).salesAssist).toBeNull(); // routed to sales outright
  });

  it('ignores low-confidence facts', () => {
    const { profile, grounding } = bombas as unknown as ProfileResponse;
    const lowPlatform = grounding.map(g =>
      g.field === 'online_store_platform' ? { ...g, confidence: 'low' as const } : g,
    );
    const rec = recommend(profile, lowPlatform, 25);
    expect(rec.setup.map(s => s.label)).not.toContain('Shopify Plus connector');
    expect(rec.plan.id).toBe('starter');
  });

  it('drops the per-seat AI add-on for small teams', () => {
    expect(recommended(run(bombas, 5))).not.toContain('ai');
  });
});

describe('countOf', () => {
  it('reads stated counts and "worldwide" as well as plain lists', () => {
    expect(countOf(['150+ countries'], 'markets')).toEqual({ count: 150, label: '150+ countries' });
    expect(countOf(['Worldwide'], 'markets')).toEqual({ count: 100, label: 'markets worldwide' });
    expect(countOf(['United States', 'Canada'], 'markets')).toEqual({ count: 2, label: '2 markets' });
  });
});

describe('monthlyTotal', () => {
  it('sums the plan per seat plus selected add-ons', () => {
    // 25 × $39 Scale + 25 × $10 Acme AI + $149 Acme Pay
    expect(monthlyTotal(PLANS.scale, new Set(['ai', 'pay']), 25)).toBe(1374);
  });
});
