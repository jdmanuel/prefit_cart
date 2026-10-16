import styled from 'styled-components';
import { createTheme, MantineColorsTuple } from '@mantine/core';
import type { Confidence, Grounding, ProfileField } from '@/lib/types';

// Acme's brand: a warm signal orange on deep ink.
const acme: MantineColorsTuple = [
  '#fff1ec',
  '#ffe1d6',
  '#ffc0a9',
  '#ff9c78',
  '#ff7d4e',
  '#ff6934',
  '#ff5d25',
  '#e44c17',
  '#cb4211',
  '#b13509',
];

export const BRAND = { ink: '#14131f', inkSoft: '#24223a', accent: acme[6], accentSoft: acme[0], line: '#e7e5ee' };

export const theme = createTheme({
  primaryColor: 'acme',
  primaryShade: 6,
  colors: { acme },
  defaultRadius: 'md',
  fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
  headings: { fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif', fontWeight: '700' },
});

export const usd = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

/** Acme's mark: a white "A" on a rounded orange square. */
export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <rect width="32" height="32" rx="8" fill={BRAND.accent} />
      <path d="M8 24 15 8h2l7 16h-3.6l-1.5-3.6h-5.8L11.6 24H8Zm6.2-6.6h3.6L16 13l-1.8 4.4Z" fill="#fff" fillRule="evenodd" />
    </svg>
  );
}

export const Card = styled.section`
  background: #fff;
  border: 1px solid ${BRAND.line};
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 1px 2px rgba(20, 19, 31, 0.04);
`;

export const Muted = styled.span`
  color: var(--mantine-color-gray-7);
`;

const confidenceColor: Record<Confidence, string> = {
  high: 'var(--mantine-color-teal-6)',
  medium: 'var(--mantine-color-yellow-6)',
  low: 'var(--mantine-color-gray-5)',
};

export const Dot = styled.span<{ $confidence: Confidence }>`
  display: inline-block;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  margin-right: 6px;
  background: ${p => confidenceColor[p.$confidence]};
`;

const SourceA = styled.a`
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: top;
  font-size: 12px;
  color: var(--mantine-color-gray-7);
  text-decoration: none;
  border: 1px solid ${BRAND.line};
  border-radius: 12px;
  padding: 1px 8px;
  margin: 6px 6px 0 0;
  &:hover { border-color: ${BRAND.accent}; color: var(--mantine-color-acme-8); }
`;

export const hostPath = (url: string) => {
  try {
    const u = new URL(url);
    const p = u.pathname.replace(/\/$/, '');
    const short = `${u.hostname.replace(/^www\./, '')}${p}`;
    return short.length > 42 ? `${short.slice(0, 41)}…` : short;
  } catch {
    return url;
  }
};

/** Small source chips for the profile fields a recommendation relied on. */
export function Sources({ fields, grounding }: { fields: ProfileField[]; grounding: Grounding[] }) {
  const entries = fields
    .map(f => grounding.find(g => g.field === f))
    .filter((g): g is Grounding => !!g && g.citations.length > 0);
  if (!entries.length) return null;
  return (
    <div>
      {entries.map(g => (
        <SourceA
          key={g.field}
          href={g.citations[0].url}
          target="_blank"
          rel="noreferrer"
          title={`${g.confidence} confidence · ${g.citations[0].title}`}
        >
          <Dot $confidence={g.confidence} />
          {hostPath(g.citations[0].url)}
        </SourceA>
      ))}
    </div>
  );
}
