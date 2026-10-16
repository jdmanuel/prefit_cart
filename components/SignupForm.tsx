import { useState } from 'react';
import styled from 'styled-components';
import { Button, Group, Loader, NumberInput, Stack, Text, TextInput, Title, UnstyledButton } from '@mantine/core';
import { domainFromEmail } from '@/lib/domain';
import { SAMPLE_COMPANIES } from '@/lib/samples';
import { BRAND, Card } from './ui';

export interface SignupValues {
  email: string;
  name: string;
  seats: number;
  domain: string;
}

const Layout = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 460px);
  gap: 40px;
  align-items: stretch;
  max-width: 1080px;
  margin: 0 auto;
  padding: 56px 24px;
  @media (max-width: 860px) { grid-template-columns: minmax(0, 1fr); gap: 20px; padding: 20px 16px; }
`;

const Pitch = styled.div`
  position: relative;
  overflow: hidden;
  background: radial-gradient(120% 90% at 100% 0%, ${BRAND.inkSoft} 0%, ${BRAND.ink} 60%);
  color: #fff;
  border-radius: 20px;
  padding: 48px 40px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  &::after {
    content: '';
    position: absolute;
    right: -80px;
    bottom: -80px;
    width: 260px;
    height: 260px;
    border-radius: 50%;
    background: ${BRAND.accent};
    opacity: 0.18;
    filter: blur(8px);
  }
  ul { list-style: none; padding: 0; margin: 28px 0 0; display: grid; gap: 14px; color: #cfcce0; position: relative; z-index: 1; }
  li { display: flex; gap: 12px; align-items: baseline; }
  li::before { content: ''; flex: none; width: 8px; height: 8px; border-radius: 2px; background: ${BRAND.accent}; transform: translateY(-1px); }
  @media (max-width: 860px) { padding: 28px 24px; }
`;

const Eyebrow = styled.div`
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: ${BRAND.accent};
  margin-bottom: 14px;
`;

const Sample = styled(UnstyledButton)`
  font-size: 13px;
  padding: 4px 10px;
  border: 1px solid ${BRAND.line};
  border-radius: 999px;
  color: var(--mantine-color-gray-8);
  background: #fff;
  &:hover { border-color: ${BRAND.accent}; color: var(--mantine-color-acme-8); }
`;

interface Props {
  status: 'form' | 'tailoring';
  domain?: string;
  elapsedMs: number;
  onEmailCommitted: (domain: string) => void;
  onSubmit: (values: SignupValues) => void;
}

export function SignupForm({ status, domain, elapsedMs, onEmailCommitted, onSubmit }: Props) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [seats, setSeats] = useState<number | string>(25);
  const [emailError, setEmailError] = useState<string>();

  const checkEmail = (value = email) => {
    const parsed = domainFromEmail(value);
    if ('error' in parsed) {
      setEmailError(value ? parsed.error : undefined);
      return null;
    }
    setEmailError(undefined);
    onEmailCommitted(parsed.domain);
    return parsed.domain;
  };

  const pickSample = (sampleDomain: string) => {
    const value = `alex@${sampleDomain}`;
    setEmail(value);
    if (!name) setName('Alex Rivera');
    checkEmail(value);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const d = checkEmail();
    const n = Math.max(1, Math.round(Number(seats) || 1));
    if (d) onSubmit({ email, name, seats: n, domain: d });
  };

  return (
    <Layout>
      <Pitch>
        <Eyebrow>Acme · the workspace that sets itself up</Eyebrow>
        <Title order={1} c="white" fz={40} lh={1.1} style={{ position: 'relative', zIndex: 1 }}>
          Start with Acme
        </Title>
        <Text size="lg" mt={14} c="#e4e2ef" style={{ position: 'relative', zIndex: 1 }}>
          Tell us who you are. We&apos;ll read your company&apos;s public website and build the right plan for your team.
        </Text>
        <ul>
          <li>A plan and add-ons matched to how your company actually works</li>
          <li>Store, languages, and data residency set up before you log in</li>
          <li>Every suggestion shows its source, and you can change anything</li>
        </ul>
      </Pitch>

      <Card style={{ padding: 32 }}>
        {status === 'tailoring' ? (
          <Stack align="center" gap="md" py={48} ta="center" data-testid="tailoring">
            <Loader type="dots" size="xl" />
            <Text fw={700} size="lg">Tailoring your plan for {domain}</Text>
            <Text c="dimmed" size="sm">
              Looking up public information about your company · {(elapsedMs / 1000).toFixed(1)}s
            </Text>
          </Stack>
        ) : (
          <form onSubmit={submit} noValidate>
            <Stack gap="lg">
              <Title order={2} fz={20}>Create your workspace</Title>
              <TextInput
                type="email"
                name="email"
                label="Work email"
                description="We use your company's public website to tailor your plan."
                placeholder="you@company.com"
                autoComplete="off"
                value={email}
                error={emailError}
                onChange={e => setEmail(e.currentTarget.value)}
                onBlur={() => checkEmail()}
              />
              <TextInput
                name="name"
                label="Full name"
                autoComplete="off"
                value={name}
                onChange={e => setName(e.currentTarget.value)}
              />
              <NumberInput
                name="seats"
                label="Number of seats"
                description="People on your team who will use Acme."
                min={1}
                allowDecimal={false}
                value={seats}
                onChange={setSeats}
              />
              <Button type="submit" size="lg" radius="xl" fullWidth>
                Continue
              </Button>
              <div>
                <Text size="xs" c="dimmed" mb={6}>No work email handy? Try a real company:</Text>
                <Group gap={6} data-testid="samples">
                  {SAMPLE_COMPANIES.map(s => (
                    <Sample key={s.domain} type="button" onClick={() => pickSample(s.domain)}>
                      {s.name}
                    </Sample>
                  ))}
                </Group>
              </div>
            </Stack>
          </form>
        )}
      </Card>
    </Layout>
  );
}
