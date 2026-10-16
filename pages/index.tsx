import { useCallback, useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { Alert, Badge } from '@mantine/core';
import { OrderView } from '@/components/OrderView';
import { ClientTiming, Pipeline } from '@/components/Pipeline';
import { SignupForm, SignupValues } from '@/components/SignupForm';
import { BRAND, Logo } from '@/components/ui';
import { recommend } from '@/lib/recommend';
import type { ProfileError, ProfileResponse } from '@/lib/types';

const Header = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 14px 24px;
  background: #fff;
  border-bottom: 1px solid ${BRAND.line};
  @media (max-width: 600px) { padding: 12px 16px; }
`;

const Brand = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 20px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: ${BRAND.ink};
  white-space: nowrap;
`;

const Disclaimer = styled.div`
  font-size: 12px;
  color: var(--mantine-color-gray-7);
  text-align: right;
  @media (max-width: 600px) { font-size: 11px; span { display: none; } }
`;

const HideOnPhone = styled.span`
  @media (max-width: 600px) { display: none; }
`;

const ErrorBox = styled.div`
  max-width: 1032px;
  margin: 24px auto 0;
  padding: 0 24px;
`;

type Phase = 'form' | 'tailoring' | 'order';

interface Lookup {
  startedAt: number;
  promise: Promise<{ data: ProfileResponse; receivedAt: number }>;
}

// Presenter switch: `?data=saved` serves saved profiles (no Exa calls) and `?data=live` switches back.
// The choice is remembered in this browser, so it survives reloads and "Start over".
type DataMode = 'live' | 'saved';
const DATA_MODE_KEY = 'exa-demo-data-mode';

function readDataMode(): DataMode {
  try {
    const param = new URLSearchParams(window.location.search).get('data');
    if (param === 'live' || param === 'saved') window.localStorage.setItem(DATA_MODE_KEY, param);
    return window.localStorage.getItem(DATA_MODE_KEY) === 'saved' ? 'saved' : 'live';
  } catch {
    return 'live';
  }
}

async function fetchProfile(domain: string, saved: boolean) {
  const res = await fetch('/api/profile', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ domain, saved }),
  });
  const body = (await res.json()) as ProfileResponse | ProfileError;
  if (!res.ok || 'error' in body) throw new Error('error' in body ? body.error : `HTTP ${res.status}`);
  return { data: body, receivedAt: performance.now() };
}

export default function Home() {
  const [phase, setPhase] = useState<Phase>('form');
  const [values, setValues] = useState<SignupValues>();
  const [result, setResult] = useState<{ data: ProfileResponse; timing: ClientTiming }>();
  const [error, setError] = useState<string>();
  const [elapsedMs, setElapsedMs] = useState(0);
  const lookups = useRef(new Map<string, Lookup>());
  const [dataMode, setDataMode] = useState<DataMode>('live');
  const dataModeRef = useRef<DataMode>('live');

  useEffect(() => {
    const mode = readDataMode();
    dataModeRef.current = mode;
    setDataMode(mode);
  }, []);

  // Start the Exa lookup as soon as the email is entered, so it runs while the buyer finishes the form.
  const startLookup = useCallback((domain: string) => {
    const existing = lookups.current.get(domain);
    if (existing) return existing;
    const lookup = { startedAt: performance.now(), promise: fetchProfile(domain, dataModeRef.current === 'saved') };
    lookup.promise.catch(() => lookups.current.delete(domain));
    lookups.current.set(domain, lookup);
    return lookup;
  }, []);

  const submit = async (v: SignupValues) => {
    const submittedAt = performance.now();
    setValues(v);
    setError(undefined);
    setPhase('tailoring');
    const lookup = startLookup(v.domain);
    try {
      const { data, receivedAt } = await lookup.promise;
      const r0 = performance.now();
      recommend(data.profile, data.grounding, v.seats);
      const rulesMs = performance.now() - r0;
      setResult({
        data,
        timing: { startedAt: Math.min(lookup.startedAt, submittedAt), submittedAt, receivedAt, rulesMs },
      });
      setPhase('order');
      window.scrollTo(0, 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lookup failed');
      setPhase('form');
    }
  };

  useEffect(() => {
    if (phase !== 'tailoring') return;
    const t0 = performance.now();
    const id = setInterval(() => setElapsedMs(performance.now() - t0), 100);
    return () => clearInterval(id);
  }, [phase]);

  const restart = () => {
    lookups.current.clear();
    setResult(undefined);
    setPhase('form');
  };

  return (
    <>
      <Header>
        <Brand>
          <Logo />
          Acme
        </Brand>
        {dataMode === 'saved' && (
          <Badge color="yellow" variant="light" size="lg" style={{ flex: 'none' }} data-testid="saved-badge" title="Remove with ?data=live">
            Saved data<HideOnPhone> · live lookups off</HideOnPhone>
          </Badge>
        )}
        <Disclaimer>
          Portfolio demo · Acme is a fictional company
          <span>
            <br />
            {dataMode === 'saved' ? 'Company data from saved Exa lookups' : 'Company data looked up live with Exa'}
          </span>
        </Disclaimer>
      </Header>

      {error && (
        <ErrorBox>
          <Alert color="red" variant="light" title="We couldn't look up your company">
            {error}
          </Alert>
        </ErrorBox>
      )}

      {phase === 'order' && result && values ? (
        <>
          <OrderView
            data={result.data}
            initialSeats={values.seats}
            buyer={{ name: values.name, email: values.email }}
            onRestart={restart}
          />
          <Pipeline data={result.data} timing={result.timing} seats={values.seats} />
        </>
      ) : (
        <SignupForm
          status={phase === 'tailoring' ? 'tailoring' : 'form'}
          domain={values?.domain}
          elapsedMs={elapsedMs}
          onEmailCommitted={d => void startLookup(d)}
          onSubmit={submit}
        />
      )}
    </>
  );
}
