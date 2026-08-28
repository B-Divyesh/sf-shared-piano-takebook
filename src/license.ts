const SLUG = 'shared-piano-takebook';
const TOKEN_KEY = `sb_license:${SLUG}`;
const VERDICT_KEY = `sb_license_verdict:${SLUG}`;
const API = 'https://api.sociobot.in/api/v1';
const DAY = 86_400_000;

export type LicenseVerdict = { valid: boolean; checkedAt: number; reason?: string };

export function captureLicenseFromUrl(): boolean {
  const url = new URL(location.href);
  const token = url.searchParams.get('license');
  if (!token) return false;
  localStorage.setItem(TOKEN_KEY, token);
  url.searchParams.delete('license');
  history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  return true;
}

export function getToken(): string { return localStorage.getItem(TOKEN_KEY) ?? ''; }
export function setToken(token: string): void { localStorage.setItem(TOKEN_KEY, token.trim()); localStorage.removeItem(VERDICT_KEY); }
export function clearLicense(): void { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(VERDICT_KEY); }
export function checkoutUrl(): string { return `${API}/products/${SLUG}/checkout`; }

export function cachedVerdict(): LicenseVerdict | null {
  try { return JSON.parse(localStorage.getItem(VERDICT_KEY) ?? 'null') as LicenseVerdict | null; } catch { return null; }
}

export async function verifyLicense(force = false): Promise<LicenseVerdict | null> {
  const token = getToken();
  if (!token) return null;
  const cached = cachedVerdict();
  if (!force && cached && Date.now() - cached.checkedAt < DAY) return cached;
  const response = await fetch(`${API}/products/${SLUG}/verify?license=${encodeURIComponent(token)}`);
  if (!response.ok) throw new Error('License verification is temporarily unavailable.');
  const body = await response.json() as { valid: boolean; reason?: string };
  const verdict = { valid: body.valid, reason: body.reason, checkedAt: Date.now() };
  localStorage.setItem(VERDICT_KEY, JSON.stringify(verdict));
  return verdict;
}

export function optimisticUnlock(): boolean { return Boolean(getToken() && cachedVerdict()?.valid); }
