import { useEffect, useMemo, useState } from 'react';
import { Button, Group, Modal, SimpleGrid, Stack, Text, Textarea, TextInput, ThemeIcon } from '@mantine/core';
import type { CompanyProfile } from '@/lib/types';

export interface Buyer {
  name: string;
  email: string;
}

interface Props {
  opened: boolean;
  profile: CompanyProfile;
  buyer: Buyer;
  seats: number;
  onClose: () => void;
}

type Step = 'details' | 'schedule' | 'done';

const SLOT_TIMES: [number, number][] = [[9, 30], [11, 0], [13, 30], [15, 0]];

/** The next three business days, each with four 30-minute slots in the buyer's own time zone. */
function upcomingSlots(): { day: string; slots: Date[] }[] {
  const days: { day: string; slots: Date[] }[] = [];
  const d = new Date();
  while (days.length < 3) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() === 0 || d.getDay() === 6) continue;
    const slots = SLOT_TIMES.map(([h, m]) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m));
    days.push({ day: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }), slots });
  }
  return days;
}

const timeLabel = (t: Date) => t.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

/** Sales handoff: details prefilled from the signup and the Exa profile, then an instant meeting booking. */
export function SalesModal({ opened, profile, buyer, seats, onClose }: Props) {
  const [step, setStep] = useState<Step>('details');
  const [name, setName] = useState(buyer.name);
  const [teamSize, setTeamSize] = useState(String(seats));
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [slot, setSlot] = useState<Date>();
  const days = useMemo(upcomingSlots, []);
  const timeZone = useMemo(
    () =>
      new Intl.DateTimeFormat('en-US', { timeZoneName: 'long' })
        .formatToParts(new Date())
        .find(p => p.type === 'timeZoneName')?.value ?? 'your local time',
    [],
  );

  // Each opening starts fresh, with the current seat count.
  useEffect(() => {
    if (!opened) return;
    setStep('details');
    setSlot(undefined);
    setTeamSize(String(seats));
  }, [opened, seats]);

  const company = profile.company_name;
  const size = profile.employee_count ? `~${profile.employee_count.toLocaleString('en-US')} employees` : 'Unknown';

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      size="lg"
      radius="lg"
      title={<Text fw={700} size="lg">{step === 'done' ? "You're booked" : 'Talk to an Acme specialist'}</Text>}
      data-testid="sales-modal"
    >
      {step === 'details' && (
        <Stack>
          <Text c="dimmed" size="sm">
            We&apos;ve filled in what we already know about {company}
            {company.endsWith('.') ? '' : '.'} Add anything that would help us prepare.
          </Text>
          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <TextInput label="Full name" value={name} onChange={e => setName(e.currentTarget.value)} />
            <TextInput label="Work email" value={buyer.email} readOnly />
            <TextInput label="Company" value={company} readOnly />
            <TextInput label="Company size" value={size} readOnly />
            <TextInput label="Seats" type="number" min={1} value={teamSize} onChange={e => setTeamSize(e.currentTarget.value)} />
            <TextInput label="Phone (optional)" type="tel" value={phone} onChange={e => setPhone(e.currentTarget.value)} />
          </SimpleGrid>
          <Textarea
            label="What would you like to discuss? (optional)"
            minRows={3}
            autosize
            value={notes}
            placeholder="Volume pricing, rollout across offices, a security review…"
            onChange={e => setNotes(e.currentTarget.value)}
          />
          <Text size="xs" c="dimmed">Company details come from your signup and public company information.</Text>
          <Group justify="flex-end">
            <Button variant="subtle" color="gray" onClick={onClose}>Cancel</Button>
            <Button radius="xl" disabled={!name.trim()} onClick={() => setStep('schedule')}>Continue</Button>
          </Group>
        </Stack>
      )}

      {step === 'schedule' && (
        <Stack>
          <Text c="dimmed" size="sm">Pick a time for a 30-minute call. Times are shown in {timeZone}.</Text>
          <SimpleGrid cols={{ base: 1, sm: 3 }}>
            {days.map(({ day, slots }) => (
              <div key={day}>
                <Text fw={700} size="sm">{day}</Text>
                <Stack gap={8} mt={8}>
                  {slots.map(t => {
                    const on = slot?.getTime() === t.getTime();
                    return (
                      <Button
                        key={t.toISOString()}
                        size="xs"
                        fullWidth
                        variant={on ? 'filled' : 'default'}
                        aria-pressed={on}
                        onClick={() => setSlot(t)}
                      >
                        {timeLabel(t)}
                      </Button>
                    );
                  })}
                </Stack>
              </div>
            ))}
          </SimpleGrid>
          <Group justify="flex-end">
            <Button variant="subtle" color="gray" onClick={() => setStep('details')}>Back</Button>
            <Button radius="xl" disabled={!slot} onClick={() => setStep('done')}>Confirm time</Button>
          </Group>
        </Stack>
      )}

      {step === 'done' && slot && (
        <Stack align="center" ta="center" gap="xs" py="md" data-testid="sales-booked">
          <ThemeIcon size={44} radius="xl" color="teal">
            <svg width="22" height="22" viewBox="0 0 16 16" aria-hidden>
              <path d="M3.5 8.2l3 3 6-6" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" />
            </svg>
          </ThemeIcon>
          <Text fw={700}>
            {slot.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} at {timeLabel(slot)}
          </Text>
          <Text c="dimmed" size="sm">
            An Acme specialist will send a calendar invite to {buyer.email}. They&apos;ll already have {company}&apos;s
            details, so you can skip the basics and talk about what you need.
          </Text>
          <Text size="xs" c="dimmed">This is a demo: no meeting was booked and nothing was sent.</Text>
          <Button radius="xl" mt="sm" onClick={onClose}>Done</Button>
        </Stack>
      )}
    </Modal>
  );
}
