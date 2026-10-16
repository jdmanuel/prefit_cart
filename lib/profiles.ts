import fs from 'node:fs';
import path from 'node:path';
import { lookupCompany } from './exa';
import type { ProfileResponse, SavedReason } from './types';

/**
 * Every signup is a live Exa lookup. Saved profiles are only a fallback for when Exa fails
 * (rate limit, network trouble during the demo) or when live lookups are switched off.
 */
export interface ProfileStore {
  read(domain: string): ProfileResponse | null;
  write(domain: string, result: ProfileResponse): void;
}

/** Reads from the first directory holding the domain; writes to the first writable one. */
export function fileStore(dirs: string[]): ProfileStore {
  return {
    read(domain) {
      for (const dir of dirs) {
        try {
          return JSON.parse(fs.readFileSync(path.join(dir, `${domain}.json`), 'utf8'));
        } catch {
          // not in this directory
        }
      }
      return null;
    },
    write(domain, result) {
      for (const dir of dirs) {
        try {
          fs.mkdirSync(dir, { recursive: true });
          fs.writeFileSync(path.join(dir, `${domain}.json`), JSON.stringify(result, null, 2));
          return;
        } catch {
          // read-only (e.g. the deployed bundle on Vercel); try the next directory
        }
      }
    },
  };
}

// data/cache is committed and ships with the deployment, so the fallback works on Vercel too.
// PROFILE_DIR lets tests point at frozen fixtures so data/cache can be refreshed freely.
export const defaultStore = fileStore([path.join(process.cwd(), process.env.PROFILE_DIR || 'data/cache')]);

interface Options {
  apiKey?: string;
  /** Save the live result as the fallback for this domain (dev only, via `?save=1`). */
  save?: boolean;
  /** Never call Exa: the presenter's `?data=saved` switch, DEMO_CACHE_ONLY, or tests. */
  savedOnly?: boolean;
  store?: ProfileStore;
  lookup?: (domain: string, apiKey: string) => Promise<ProfileResponse>;
}

const inFlight = new Map<string, Promise<ProfileResponse>>();

export async function getProfile(domain: string, opts: Options = {}): Promise<ProfileResponse> {
  const { apiKey, save = false, savedOnly = false, store = defaultStore, lookup = lookupCompany } = opts;
  const fromSaved = (savedReason: SavedReason) => {
    const saved = store.read(domain);
    if (!saved) {
      throw new Error(
        savedReason === 'requested'
          ? `Live lookups are off and there is no saved profile for ${domain}. Use a saved company, or switch back with ?data=live.`
          : savedReason === 'no-key'
            ? `This copy of the demo doesn't run live lookups, and there's no saved profile for ${domain}. Try one of the sample companies.`
            : 'No saved profile for this domain and live lookups are unavailable.',
      );
    }
    return { ...saved, cached: true, savedReason };
  };

  if (savedOnly) return fromSaved('requested');
  if (!apiKey) return fromSaved('no-key');

  // The email-blur prefetch and the Continue click can ask for the same domain at once.
  const pending = inFlight.get(domain);
  if (pending) return pending;

  const run = lookup(domain, apiKey)
    .then(result => {
      if (save) store.write(domain, result);
      return result;
    })
    .catch(err => {
      console.error(`[profile] ${domain}:`, err);
      return fromSaved('exa-error');
    })
    .finally(() => inFlight.delete(domain));
  inFlight.set(domain, run);
  return run;
}
