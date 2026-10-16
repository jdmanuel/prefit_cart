import { useEffect, useState } from 'react';
import styled, { css } from 'styled-components';
import { mappingsByField, recommend } from '@/lib/recommend';
import type { CompanyProfile, ProfileField, ProfileResponse } from '@/lib/types';
import { hostPath } from './ui';

export interface ClientTiming {
  startedAt: number; // lookup kicked off (email blur or Continue)
  submittedAt: number; // buyer pressed Continue
  receivedAt: number; // API response arrived
  rulesMs: number;
}

const mono = `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
const BLUE = '#1d4ed8';
const BLUE_LIGHT = '#3b82f6';

const Drawer = styled.aside<{ $open: boolean }>`
  position: fixed;
  top: 0;
  right: 0;
  height: 100vh;
  width: min(1180px, 100vw);
  overflow-y: auto;
  background: #000;
  color: #e5e7eb;
  border-left: 1px solid #1f2937;
  padding: 28px 28px 48px;
  z-index: 20;
  transform: translateX(${p => (p.$open ? '0' : '100%')});
  visibility: ${p => (p.$open ? 'visible' : 'hidden')};
  transition: transform 260ms ease, visibility 260ms;
  box-shadow: ${p => (p.$open ? '-12px 0 40px rgba(0,0,0,.35)' : 'none')};
  @media (max-width: 600px) { padding: 20px 16px 40px; }
`;

const Pill = styled.span`
  display: inline-block;
  font-family: ${mono};
  font-size: 12px;
  letter-spacing: 0.06em;
  color: #93c5fd;
  background: #0b1a3a;
  border: 1px solid #1e3a8a;
  border-radius: 4px;
  padding: 3px 8px;
`;

const Title = styled.h2`
  font-size: 32px;
  font-weight: 500;
  margin: 12px 0 4px;
  color: #fff;
`;

const SectionLabel = styled.div`
  display: flex;
  justify-content: space-between;
  font-family: ${mono};
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #9ca3af;
  margin: 28px 0 10px;
`;

const Box = styled.div`
  border: 1px solid #262626;
  border-radius: 8px;
  padding: 16px;
`;

const BarRow = styled.div`
  display: grid;
  grid-template-columns: 150px 1fr 64px;
  gap: 12px;
  align-items: center;
  font-size: 13px;
  & + & { margin-top: 10px; }
  @media (max-width: 600px) { grid-template-columns: 96px 1fr 56px; font-size: 12px; }
`;

const BarLabel = styled.span<{ $muted?: boolean }>`
  text-align: right;
  color: ${p => (p.$muted ? '#6b7280' : BLUE_LIGHT)};
`;

const Track = styled.div`
  position: relative;
  height: 22px;
  background: #111;
  border-radius: 4px;
  overflow: hidden;
`;

const Bar = styled.div<{ $left: number; $width: number; $shown: boolean; $delay: number; $muted?: boolean; $light?: boolean }>`
  position: absolute;
  top: 0;
  bottom: 0;
  left: ${p => p.$left}%;
  width: ${p => (p.$shown ? Math.max(p.$width, 0.8) : 0)}%;
  border-radius: 4px;
  transition: width 700ms cubic-bezier(.2,.8,.2,1) ${p => p.$delay}ms;
  ${p =>
    p.$muted
      ? css`background: repeating-linear-gradient(45deg, #1f2937 0 6px, #111827 6px 12px);`
      : css`background: ${p.$light ? BLUE_LIGHT : BLUE};`}
`;

const Ms = styled.span`
  font-family: ${mono};
  text-align: right;
  color: #e5e7eb;
`;

const Stats = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1px;
  background: #262626;
  border: 1px solid #262626;
  border-radius: 8px;
  overflow: hidden;
  margin-top: 16px;
  div { background: #000; padding: 12px; }
  b { display: block; font-family: ${mono}; font-size: 18px; font-weight: 500; color: #fff; }
  span { font-size: 12px; color: #9ca3af; }
  @media (max-width: 600px) { grid-template-columns: repeat(2, 1fr); }
`;

const MapGrid = styled.div`
  font-size: 13px;
  a { color: #93c5fd; text-decoration: none; display: block; font-size: 12px; margin-top: 2px; }
  a:hover { text-decoration: underline; }
`;

const MapHead = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) 28px minmax(0, 0.8fr) minmax(0, 1.25fr);
  gap: 12px;
  padding: 0 6px 8px;
  font-family: ${mono};
  font-size: 11px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #6b7280;
  @media (max-width: 760px) { display: none; }
`;

const MapRow = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(0, 2.13fr);
  gap: 12px;
  border-top: 1px solid #1f2937;
  padding: 10px 6px;
  @media (max-width: 760px) { grid-template-columns: 1fr; }
`;

const FieldName = styled.div`
  font-family: ${mono};
  font-size: 12px;
  color: #9ca3af;
  margin-bottom: 3px;
`;

const Targets = styled.div`
  display: grid;
  gap: 10px;
  align-content: start;
`;

const Target = styled.div<{ $none?: boolean }>`
  display: grid;
  grid-template-columns: 28px minmax(0, 0.8fr) minmax(0, 1.25fr);
  gap: 12px;
  align-items: start;
  color: ${p => (p.$none ? '#6b7280' : '#e5e7eb')};
`;

const Arrow = styled.span<{ $none?: boolean }>`
  color: ${p => (p.$none ? '#374151' : BLUE_LIGHT)};
  font-size: 16px;
  line-height: 1.1;
  text-align: center;
`;

const Item = styled.span`
  display: inline-block;
  color: #fff;
  background: #0b1a3a;
  border: 1px solid #1e3a8a;
  border-radius: 4px;
  padding: 2px 8px;
  justify-self: start;
`;

const Features = styled.div`
  display: grid;
  border: 1px solid #262626;
  border-radius: 8px;
  overflow: hidden;
`;

const Feature = styled.div`
  display: grid;
  grid-template-columns: 210px 1fr;
  gap: 16px;
  padding: 10px 14px;
  font-size: 13px;
  color: #d1d5db;
  & + & { border-top: 1px solid #1f2937; }
  code { font-family: ${mono}; font-size: 12px; color: #93c5fd; }
  ul { margin: 6px 0 0; padding-left: 16px; color: #9ca3af; font-family: ${mono}; font-size: 11px; line-height: 1.6; }
  @media (max-width: 760px) { grid-template-columns: 1fr; gap: 4px; }
`;

const Inline = styled.div`
  margin-top: 6px;
  color: #9ca3af;
  font-family: ${mono};
  font-size: 11px;
  line-height: 1.6;
`;

const Quote = styled.q`
  display: block;
  margin-top: 4px;
  color: #9ca3af;
  font-size: 12px;
  font-style: italic;
  line-height: 1.45;
`;

const Rule = styled.div`
  code { font-family: ${mono}; font-size: 12px; color: #93c5fd; }
  p { margin: 3px 0 0; color: #9ca3af; font-size: 12px; line-height: 1.45; }
`;

const Conf = styled.span<{ $c: string }>`
  font-family: ${mono};
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 3px;
  margin-left: 6px;
  color: ${p => (p.$c === 'high' ? '#86efac' : p.$c === 'medium' ? '#fde68a' : '#9ca3af')};
  border: 1px solid ${p => (p.$c === 'high' ? '#14532d' : p.$c === 'medium' ? '#713f12' : '#374151')};
`;

const Code = styled.pre`
  font-family: ${mono};
  font-size: 12px;
  line-height: 1.5;
  color: #d1d5db;
  background: #0a0a0a;
  border: 1px solid #262626;
  border-radius: 8px;
  padding: 14px;
  white-space: pre-wrap;
  word-break: break-word;
  margin: 8px 0 0;
`;

const Toggle = styled.button`
  position: fixed;
  right: 20px;
  bottom: 20px;
  z-index: 19;
  font: 500 14px/1 system-ui, sans-serif;
  color: #fff;
  background: #000;
  border: 1px solid #374151;
  border-radius: 999px;
  padding: 12px 18px;
  cursor: pointer;
  box-shadow: 0 6px 20px rgba(0,0,0,.25);
  &:hover { border-color: ${BLUE_LIGHT}; }
`;

const Close = styled.button`
  position: sticky;
  top: 0;
  float: right;
  font: 500 13px/1 system-ui, sans-serif;
  color: #e5e7eb;
  background: #000;
  border: 1px solid #374151;
  border-radius: 999px;
  padding: 9px 14px;
  cursor: pointer;
  &:hover { border-color: ${BLUE_LIGHT}; }
`;

const FIELD_LABELS: Record<ProfileField, string> = {
  company_name: 'company_name',
  industry: 'industry',
  employee_count: 'employee_count',
  sells_to: 'sells_to',
  online_store_platform: 'online_store_platform',
  countries_served: 'countries_served',
  website_languages: 'website_languages',
  work_model: 'work_model',
  actively_hiring: 'actively_hiring',
  handles_sensitive_data: 'handles_sensitive_data',
};

const fmt = (v: CompanyProfile[ProfileField]) =>
  Array.isArray(v) ? (v.length ? v.join(', ') : '—') : typeof v === 'boolean' ? (v ? 'yes' : 'no') : typeof v === 'number' ? v.toLocaleString('en-US') : v;

interface FeatureRow {
  param: string;
  what: string;
  list?: string[];
  inline?: boolean;
}

/** The Exa features this request used, read from the request itself so the panel can't drift from the code. */
function featuresUsed(req: Record<string, unknown>): FeatureRow[] {
  const rows: FeatureRow[] = [];
  const schema = req.outputSchema as { properties?: Record<string, unknown> } | undefined;
  const extra = req.additionalQueries as string[] | undefined;
  const excluded = req.excludeDomains as string[] | undefined;
  const contents = req.contents as { highlights?: unknown } | undefined;
  rows.push({ param: `type: "${req.type}"`, what: 'Deep search: runs several searches, reads the pages, and writes one answer.' });
  if (schema?.properties) {
    rows.push({ param: 'outputSchema', what: `${Object.keys(schema.properties).length} typed fields, ready for the rules. Each comes back grounded: citations plus a confidence rating, and low-confidence facts are ignored.` });
  }
  if (extra?.length) rows.push({ param: `additionalQueries (${extra.length})`, what: 'Extra searches aimed at the pages where these facts live.', list: extra });
  if (excluded?.length) rows.push({ param: `excludeDomains (${excluded.length})`, what: 'Skips contact-scraper and SEO directory sites, so facts rest on first-party and reputable sources.', list: excluded, inline: true });
  if (contents?.highlights) rows.push({ param: 'contents.highlights', what: "The most relevant passage from each source, quoted under a field's first citation below." });
  if (req.systemPrompt) rows.push({ param: 'systemPrompt', what: "Prefer the company's own site, report facts only, and never guess." });
  return rows;
}

const clean = (h: string) => {
  const t = h.replace(/\s+/g, ' ').replace(/^[\s.|…-]+/, '').trim();
  return t.length > 170 ? `${t.slice(0, 169)}…` : t;
};

const UNMAPPED: Partial<Record<ProfileField, string>> = {
  company_name: 'Personalizes the order page',
  industry: 'Shown to the sales team for context',
  sells_to: 'Shown to the sales team for context',
};

export function Pipeline({ data, timing, seats }: { data: ProfileResponse; timing: ClientTiming; seats: number }) {
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (!open) return setShown(false);
    const t = setTimeout(() => setShown(true), 120);
    return () => clearTimeout(t);
  }, [open]);

  const search = data.timings.searchTimeMs;
  const clientRoundTrip = data.cached ? data.timings.roundTripMs : timing.receivedAt - timing.startedAt;
  const network = Math.max(0, clientRoundTrip - search);
  const typing = data.cached ? 0 : Math.max(0, timing.submittedAt - timing.startedAt);
  const total = search + network + timing.rulesMs;
  const span = Math.max(total, typing) || 1;
  const pct = (ms: number) => (ms / span) * 100;
  const waited = data.cached ? null : Math.max(0, timing.receivedAt - timing.submittedAt);

  const rows = [
    ...(typing > 0
      ? [{ label: 'Buyer finishing form', left: 0, ms: typing, muted: true }]
      : []),
    { label: `Exa ${data.searchType}`, left: 0, ms: search },
    { label: 'Network + API route', left: search, ms: network, light: true },
    { label: 'Recommendation rules', left: search + network, ms: timing.rulesMs, light: true },
  ];

  const mappings = mappingsByField(recommend(data.profile, data.grounding, seats), data.profile);
  const highlightFor = (url?: string) => data.sources.find(s => s.url === url)?.highlights?.[0];
  const unmappedNote = (f: ProfileField) =>
    data.grounding.find(g => g.field === f)?.confidence === 'low'
      ? 'Not used: low confidence'
      : UNMAPPED[f] ?? 'No rule triggered';

  const counts = { high: 0, medium: 0, low: 0 };
  data.grounding.forEach(g => counts[g.confidence]++);

  return (
    <>
      {!open && (
        <Toggle onClick={() => setOpen(true)} data-testid="pipeline-toggle">
          How we built this →
        </Toggle>
      )}
      <Drawer $open={open} aria-hidden={!open} data-testid="pipeline">
        <Close onClick={() => setOpen(false)} data-testid="pipeline-close">Close ✕</Close>
        <Pill>EXA /SEARCH · {data.searchType}</Pill>
        <Title>How we built this</Title>
        <div style={{ color: '#9ca3af', fontSize: 14 }}>
          One Exa call turned <span style={{ color: '#fff' }}>{data.domain}</span> into a cited company profile. Plain
          rules turned the profile into a plan.
          {data.cached && (
            <Conf $c="medium">
              saved run ({data.savedReason === 'requested' ? 'live lookups off' : 'Exa unavailable'}) ·{' '}
              {new Date(data.fetchedAt).toLocaleString()}
            </Conf>
          )}
        </div>

        <SectionLabel>
          <span>Pipeline</span>
          <span>{Math.round(total).toLocaleString('en-US')}ms email → plan</span>
        </SectionLabel>
        <Box>
          {rows.map((r, i) => (
            <BarRow key={r.label}>
              <BarLabel $muted={r.muted}>{r.label}</BarLabel>
              <Track>
                <Bar $left={pct(r.left)} $width={pct(r.ms)} $shown={shown} $delay={i * 140} $muted={r.muted} $light={r.light} />
              </Track>
              <Ms>{r.ms >= 1000 ? `${(r.ms / 1000).toFixed(1)}s` : `${Math.round(r.ms)}ms`}</Ms>
            </BarRow>
          ))}
        </Box>
        <Stats>
          <div><b>{waited === null ? '—' : `${(waited / 1000).toFixed(1)}s`}</b><span>wait after Continue</span></div>
          <div><b>{data.sources.length}</b><span>sources read</span></div>
          <div><b>${data.costDollars.toFixed(3)}</b><span>Exa cost</span></div>
          <div><b>{counts.high}/{data.grounding.length}</b><span>fields high confidence</span></div>
        </Stats>

        <SectionLabel><span>Exa features in this request</span><span>production config</span></SectionLabel>
        <Features data-testid="features">
          {featuresUsed(data.request).map(f => (
            <Feature key={f.param}>
              <code>{f.param}</code>
              <div>
                {f.what}
                {f.list && f.inline && <Inline>{f.list.join(' · ')}</Inline>}
                {f.list && !f.inline && (
                  <ul>
                    {f.list.map(item => <li key={item}>{item}</li>)}
                  </ul>
                )}
              </div>
            </Feature>
          ))}
        </Features>

        <SectionLabel><span>Company profile → order</span><span>Exa structured output · our rules</span></SectionLabel>
        <MapGrid data-testid="mapping">
          <MapHead>
            <span>Exa found (confidence · sources)</span>
            <span />
            <span>Added to order</span>
            <span>Rule · why</span>
          </MapHead>
          {(Object.keys(FIELD_LABELS) as ProfileField[]).map(f => {
            const g = data.grounding.find(x => x.field === f);
            const targets = mappings.get(f) ?? [];
            return (
              <MapRow key={f}>
                <div>
                  <FieldName>{FIELD_LABELS[f]}</FieldName>
                  <span style={{ color: '#fff' }}>{fmt(data.profile[f])}</span>
                  {g && <Conf $c={g.confidence}>{g.confidence}</Conf>}
                  {g?.citations.slice(0, 2).map(c => (
                    <a key={c.url} href={c.url} target="_blank" rel="noreferrer">↗ {hostPath(c.url)}</a>
                  ))}
                  {(() => {
                    const h = g && highlightFor(g.citations[0]?.url);
                    return h ? <Quote>{clean(h)}</Quote> : null;
                  })()}
                </div>
                <Targets>
                  {targets.length ? (
                    targets.map(t => (
                      <Target key={t.item}>
                        <Arrow>→</Arrow>
                        <Item>{t.item}</Item>
                        <Rule>
                          <code>{t.rule}</code>
                          <p>{t.reason}</p>
                        </Rule>
                      </Target>
                    ))
                  ) : (
                    <Target $none>
                      <Arrow $none>—</Arrow>
                      <span style={{ gridColumn: 'span 2' }}>{unmappedNote(f)}</span>
                    </Target>
                  )}
                </Targets>
              </MapRow>
            );
          })}
          {mappings.get('seats') && (
            <MapRow>
              <div>
                <FieldName>seats · from the form</FieldName>
                <span style={{ color: '#fff' }}>{seats}</span>
              </div>
              <Targets>
                {mappings.get('seats')!.map(t => (
                  <Target key={t.item}>
                    <Arrow>→</Arrow>
                    <Item>{t.item}</Item>
                    <Rule>
                      <code>{t.rule}</code>
                      <p>{t.reason}</p>
                    </Rule>
                  </Target>
                ))}
              </Targets>
            </MapRow>
          )}
        </MapGrid>

        <SectionLabel><span>Exa request</span><span>POST api.exa.ai/search</span></SectionLabel>
        <details>
          <summary style={{ cursor: 'pointer', color: '#93c5fd', fontSize: 13 }}>Show request body</summary>
          <Code>{JSON.stringify(data.request, null, 2)}</Code>
        </details>

        <SectionLabel><span>Exa response</span><span>200 OK · {data.timings.searchTimeMs.toLocaleString('en-US')}ms</span></SectionLabel>
        <details>
          <summary style={{ cursor: 'pointer', color: '#93c5fd', fontSize: 13 }}>Show response body</summary>
          <Code>{JSON.stringify(data.response, null, 2)}</Code>
        </details>
      </Drawer>
    </>
  );
}
