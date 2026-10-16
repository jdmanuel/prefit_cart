import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { fileStore, getProfile } from '@/lib/profiles';
import type { ProfileResponse } from '@/lib/types';
import oura from '@/tests/fixtures/ouraring.com.json';

const base = oura as unknown as ProfileResponse;

// A fake Exa that answers differently every time, like the real synthesis does.
function varyingLookup() {
  let calls = 0;
  const lookup = async (domain: string): Promise<ProfileResponse> => {
    calls++;
    return { ...base, domain, cached: false, profile: { ...base.profile, employee_count: 1000 + calls } };
  };
  return { lookup, calls: () => calls };
}

const tmpStore = () => fileStore([fs.mkdtempSync(path.join(os.tmpdir(), 'profiles-test-'))]);

describe('getProfile', () => {
  it('looks every signup up live, even when a saved profile exists', async () => {
    const store = tmpStore();
    store.write('acme.com', base);
    const exa = varyingLookup();
    const first = await getProfile('acme.com', { apiKey: 'k', store, lookup: exa.lookup });
    const second = await getProfile('acme.com', { apiKey: 'k', store, lookup: exa.lookup });
    expect(exa.calls()).toBe(2);
    expect(first.cached).toBe(false);
    expect(second.profile.employee_count).toBe(1002);
  });

  it('shares one Exa call between concurrent requests for the same domain', async () => {
    const exa = varyingLookup();
    const [a, b] = await Promise.all([
      getProfile('acme.com', { apiKey: 'k', store: tmpStore(), lookup: exa.lookup }),
      getProfile('acme.com', { apiKey: 'k', store: tmpStore(), lookup: exa.lookup }),
    ]);
    expect(exa.calls()).toBe(1);
    expect(b.profile).toEqual(a.profile);
  });

  it('saves the live result only when asked', async () => {
    const store = tmpStore();
    const exa = varyingLookup();
    await getProfile('acme.com', { apiKey: 'k', store, lookup: exa.lookup });
    expect(store.read('acme.com')).toBeNull();
    await getProfile('acme.com', { apiKey: 'k', store, lookup: exa.lookup, save: true });
    expect(store.read('acme.com')?.profile.employee_count).toBe(1002);
  });

  it('falls back to the saved profile when Exa fails, and errors when there is none', async () => {
    const store = tmpStore();
    const failing = async (): Promise<ProfileResponse> => {
      throw new Error('Exa 429');
    };
    await expect(getProfile('acme.com', { apiKey: 'k', store, lookup: failing })).rejects.toThrow(/No saved profile/);
    store.write('acme.com', base);
    const r = await getProfile('acme.com', { apiKey: 'k', store, lookup: failing });
    expect(r.cached).toBe(true);
  });

  it('records why a saved profile was served', async () => {
    const store = tmpStore();
    store.write('acme.com', base);
    const failing = async (): Promise<ProfileResponse> => {
      throw new Error('Exa 429');
    };
    expect((await getProfile('acme.com', { apiKey: 'k', store, savedOnly: true })).savedReason).toBe('requested');
    expect((await getProfile('acme.com', { store })).savedReason).toBe('no-key');
    expect((await getProfile('acme.com', { apiKey: 'k', store, lookup: failing })).savedReason).toBe('exa-error');
    await expect(getProfile('other.com', { apiKey: 'k', store, savedOnly: true })).rejects.toThrow(/data=live/);
  });

  it('never calls Exa in saved-only mode', async () => {
    const store = tmpStore();
    store.write('acme.com', base);
    const exa = varyingLookup();
    const r = await getProfile('acme.com', { apiKey: 'k', store, lookup: exa.lookup, savedOnly: true });
    expect(exa.calls()).toBe(0);
    expect(r.cached).toBe(true);
  });
});
