import type { NextApiRequest, NextApiResponse } from 'next';
import { isValidDomain } from '@/lib/domain';
import { getProfile } from '@/lib/profiles';
import type { ProfileError, ProfileResponse } from '@/lib/types';

export const config = { maxDuration: 60 };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ProfileResponse | ProfileError>,
) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const domain = String(req.body?.domain ?? '').trim().toLowerCase();
  if (!isValidDomain(domain)) return res.status(400).json({ error: 'Invalid domain' });

  try {
    const result = await getProfile(domain, {
      apiKey: process.env.EXA_API_KEY,
      // Dev only: `?save=1` stores the live result as this domain's fallback in data/cache.
      save: process.env.NODE_ENV === 'development' && req.query.save === '1',
      // The presenter's `?data=saved` switch (sent as `saved: true`), or DEMO_CACHE_ONLY on the server.
      savedOnly: req.body?.saved === true || process.env.DEMO_CACHE_ONLY === '1',
    });
    return res.status(200).json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Lookup failed. Please try again.';
    return res.status(503).json({ error: message });
  }
}
