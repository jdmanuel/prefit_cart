import { useMemo, useState } from 'react';
import styled from 'styled-components';
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Checkbox,
  Divider,
  Group,
  NumberInput,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core';
import { ADDONS, AddonId, addonMonthly } from '@/lib/catalog';
import { monthlyTotal, recommend } from '@/lib/recommend';
import type { ProfileResponse } from '@/lib/types';
import { Buyer, SalesModal } from './SalesModal';
import { BRAND, Card, Sources, usd } from './ui';

const Page = styled.div`
  max-width: 1080px;
  margin: 0 auto;
  padding: 40px 24px 96px;
  @media (max-width: 860px) { padding: 24px 16px 96px; }
`;

const Columns = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 340px;
  gap: 24px;
  align-items: start;
  margin-top: 24px;
  @media (max-width: 860px) { grid-template-columns: minmax(0, 1fr); }
`;

const AddonRow = styled.div<{ $on: boolean }>`
  border: 1px solid ${p => (p.$on ? 'var(--mantine-color-acme-3)' : BRAND.line)};
  background: ${p => (p.$on ? BRAND.accentSoft : '#fff')};
  border-radius: 12px;
  padding: 14px 16px;
  transition: background 120ms, border-color 120ms;
`;

const Reason = styled.p`
  margin: 4px 0 0 32px;
  color: var(--mantine-color-gray-7);
  font-size: 13px;
  line-height: 1.5;
`;

const Summary = styled(Card)`
  position: sticky;
  top: 24px;
  display: grid;
  gap: 14px;
`;

const Assist = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-top: 20px;
  padding: 14px 18px;
  background: ${BRAND.accentSoft};
  border: 1px solid var(--mantine-color-acme-2);
  border-radius: 12px;
  @media (max-width: 600px) { flex-direction: column; align-items: flex-start; }
`;

const KnownList = styled.dl`
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 10px 16px;
  margin: 12px 0 0;
  font-size: 14px;
  dt { color: var(--mantine-color-gray-7); }
  dd { margin: 0; }
`;

const Check = () => (
  <ThemeIcon size={20} radius="xl" color="teal" style={{ marginTop: 1 }}>
    <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden>
      <path d="M3.5 8.2l3 3 6-6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  </ThemeIcon>
);

interface Props {
  data: ProfileResponse;
  initialSeats: number;
  buyer: Buyer;
  onRestart: () => void;
}

export function OrderView({ data, initialSeats, buyer, onRestart }: Props) {
  const { profile, grounding } = data;
  const [seats, setSeats] = useState(initialSeats);
  const rec = useMemo(() => recommend(profile, grounding, seats), [profile, grounding, seats]);
  const [selected, setSelected] = useState<Set<AddonId>>(
    () => new Set(recommend(profile, grounding, initialSeats).addons.filter(a => a.recommended).map(a => a.id)),
  );
  const [purchased, setPurchased] = useState(false);
  const [salesOpen, setSalesOpen] = useState(false);
  const salesModal = (
    <SalesModal
      opened={salesOpen}
      profile={profile}
      buyer={buyer}
      seats={seats}
      onClose={() => setSalesOpen(false)}
    />
  );
  const total = monthlyTotal(rec.plan, selected, seats);
  const name = profile.company_name;

  const toggle = (id: AddonId) =>
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  if (rec.route === 'enterprise') {
    const list = (v: string[]) => (v.length ? v.slice(0, 4).join(', ') : 'Unknown');
    return (
      <Page data-testid="enterprise">
        <Title order={1}>Let&apos;s build your Enterprise plan</Title>
        <Columns>
          <Card>
            <Stack>
              <Text size="lg">
                At ~{profile.employee_count.toLocaleString('en-US')} employees, {name} is a fit for Acme Enterprise,
                with regional data residency, custom contracts, a dedicated success team, and volume pricing.
              </Text>
              <Sources fields={['employee_count']} grounding={grounding} />
              <Text c="dimmed">
                Book a 30-minute call with a specialist. They&apos;ll come prepared with what we already know about{' '}
                {name}, so you can skip the basics.
              </Text>
              <Group>
                <Button radius="xl" onClick={() => setSalesOpen(true)}>Talk to sales</Button>
                <Button variant="subtle" color="gray" onClick={onRestart}>Start over</Button>
              </Group>
            </Stack>
          </Card>
          <Card data-testid="known">
            <Text fw={700}>What your specialist will already know</Text>
            <KnownList>
              <dt>Company</dt><dd>{name}</dd>
              <dt>Industry</dt><dd>{profile.industry}</dd>
              <dt>Size</dt><dd>~{profile.employee_count.toLocaleString('en-US')} employees</dd>
              <dt>Markets</dt><dd>{list(profile.countries_served)}</dd>
              <dt>Work model</dt><dd style={{ textTransform: 'capitalize' }}>{profile.work_model}</dd>
            </KnownList>
            <Text size="sm" c="dimmed" mt={14}>From public company information.</Text>
          </Card>
        </Columns>
        {salesModal}
      </Page>
    );
  }

  return (
    <Page data-testid="order">
      <Title order={1}>Your Acme plan for {name}</Title>
      <Text c="dimmed" mt={4}>We configured this from {data.domain}. Change anything before you buy.</Text>

      {rec.salesAssist && (
        <Assist data-testid="sales-assist">
          <div>
            <strong>Buying for a larger team?</strong>{' '}
            <Text span c="dimmed">{rec.salesAssist.reason} You can still buy online.</Text>
          </div>
          <Button size="xs" variant="default" radius="xl" style={{ flex: 'none' }} onClick={() => setSalesOpen(true)}>
            Talk to sales
          </Button>
        </Assist>
      )}

      <Columns>
        <Stack gap="md">
          <Card data-testid="plan">
            <Group justify="space-between" align="flex-start" wrap="nowrap">
              <div>
                <Badge variant="light" size="sm">Recommended plan</Badge>
                <Title order={2} fz={24} mt={8}>{rec.plan.name}</Title>
                <Text c="dimmed" size="sm">{rec.plan.summary}</Text>
              </div>
              <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                <Title order={2} fz={24}>{usd(rec.plan.perSeat)}</Title>
                <Text size="xs" c="dimmed">per seat / month</Text>
              </div>
            </Group>
            <Reason style={{ marginLeft: 0, marginTop: 12 }}>{rec.plan.reason}</Reason>
            <Sources fields={rec.plan.basedOn} grounding={grounding} />
          </Card>

          <Card>
            <Text fw={700}>Add-ons</Text>
            <Stack gap="sm" mt={12}>
              {rec.addons.map(line => {
                const addon = ADDONS[line.id];
                const on = selected.has(line.id);
                return (
                  <AddonRow key={line.id} $on={on} data-testid={`addon-${line.id}`}>
                    <Group justify="space-between" wrap="nowrap" align="flex-start">
                      <Checkbox
                        checked={on}
                        onChange={() => toggle(line.id)}
                        label={
                          <Group gap={8}>
                            <Text fw={600} size="sm">{addon.name}</Text>
                            {line.recommended && <Badge size="xs" variant="filled">Recommended</Badge>}
                          </Group>
                        }
                      />
                      <Text size="xs" c="dimmed" style={{ whiteSpace: 'nowrap' }}>{addon.priceLabel}</Text>
                    </Group>
                    <Reason>{line.reason}</Reason>
                    {line.recommended && (
                      <div style={{ marginLeft: 32 }}>
                        <Sources fields={line.basedOn} grounding={grounding} />
                      </div>
                    )}
                  </AddonRow>
                );
              })}
            </Stack>
          </Card>

          {(rec.setup.length > 0 || rec.notes.length > 0) && (
            <Card data-testid="setup">
              <Text fw={700}>Already set up for you</Text>
              <Stack gap="sm" mt={12}>
                {rec.setup.map(item => (
                  <Group key={item.label} gap={10} align="flex-start" wrap="nowrap">
                    <Check />
                    <div>
                      <Text fw={600} size="sm">{item.label}</Text>
                      <Text size="xs" c="dimmed">{item.reason}</Text>
                      <Sources fields={item.basedOn} grounding={grounding} />
                    </div>
                  </Group>
                ))}
              </Stack>
              {rec.notes.map(note => (
                <Alert key={note.label} color="indigo" variant="light" title={note.label} mt={16}>
                  {note.reason}
                  <Sources fields={note.basedOn} grounding={grounding} />
                </Alert>
              ))}
            </Card>
          )}
        </Stack>

        <Summary data-testid="summary">
          <Text fw={700}>Order summary</Text>
          <div>
            <Text size="sm" fw={500} mb={4}>Seats</Text>
            <Group gap={8} wrap="nowrap">
              <ActionIcon
                variant="default"
                size="lg"
                aria-label="Fewer seats"
                onClick={() => setSeats(s => Math.max(1, s - 1))}
              >
                −
              </ActionIcon>
              <NumberInput
                aria-label="Seats"
                min={1}
                allowDecimal={false}
                hideControls
                value={seats}
                onChange={v => setSeats(Math.max(1, Math.round(Number(v) || 1)))}
                styles={{ input: { textAlign: 'center' } }}
                style={{ flex: 1 }}
              />
              <ActionIcon variant="default" size="lg" aria-label="More seats" onClick={() => setSeats(s => s + 1)}>
                +
              </ActionIcon>
            </Group>
          </div>
          <Divider />
          <Group justify="space-between">
            <Text size="sm">{rec.plan.name} × {seats}</Text>
            <Text size="sm">{usd(rec.plan.perSeat * seats)}</Text>
          </Group>
          {rec.addons
            .filter(a => selected.has(a.id))
            .map(a => (
              <Group key={a.id} justify="space-between">
                <Text size="sm">{ADDONS[a.id].name}</Text>
                <Text size="sm">{usd(addonMonthly(ADDONS[a.id], seats))}</Text>
              </Group>
            ))}
          <Divider />
          <Group justify="space-between">
            <Text fw={700} size="lg">Total</Text>
            <Text fw={700} size="lg" data-testid="total">
              {usd(total)}<Text span size="xs" c="dimmed"> /mo</Text>
            </Text>
          </Group>
          <Text size="xs" c="dimmed">Billed annually · {usd(total * 12)} per year</Text>
          <Button size="lg" radius="xl" fullWidth onClick={() => setPurchased(true)}>
            Complete purchase
          </Button>
          <Button variant="subtle" color="gray" fullWidth onClick={onRestart}>Start over</Button>
          {purchased && (
            <Alert color="teal" variant="light" title="This is a demo">
              Nothing was purchased. Acme is a fictional company; in a real product this would hand off to checkout.
            </Alert>
          )}
        </Summary>
      </Columns>
      {salesModal}
    </Page>
  );
}
