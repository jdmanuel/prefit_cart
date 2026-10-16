const FREE_MAIL = new Set([
  'gmail.com', 'googlemail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'live.com',
  'icloud.com', 'me.com', 'aol.com', 'proton.me', 'protonmail.com', 'gmx.com',
]);

const DOMAIN_RE = /^(?=.{4,253}$)([a-z0-9-]+\.)+[a-z]{2,}$/;

/** Returns the company domain for a work email, or an error message for the form. */
export function domainFromEmail(email: string): { domain: string } | { error: string } {
  const at = email.trim().toLowerCase().split('@');
  if (at.length !== 2 || !at[0]) return { error: 'Enter a valid work email.' };
  const domain = at[1];
  if (!DOMAIN_RE.test(domain)) return { error: 'Enter a valid work email.' };
  if (FREE_MAIL.has(domain)) return { error: 'Please use your work email so we can tailor your plan.' };
  return { domain };
}

export function isValidDomain(domain: string): boolean {
  return DOMAIN_RE.test(domain);
}
