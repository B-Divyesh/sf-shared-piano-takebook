import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

type Claim = { id:string; claim:string; where:string; test:string; sandbox:string };

describe('release contract files', () => {
  it('maps every declared claim to exactly one regression tag', () => {
    const claims = JSON.parse(readFileSync(new URL('../.factory/claims.json', import.meta.url),'utf8')) as Claim[];
    const e2e = readFileSync(new URL('./e2e/app.spec.ts', import.meta.url),'utf8');
    expect(claims.length).toBeGreaterThan(0);
    for (const claim of claims) {
      expect(claim.claim).toBeTruthy();
      expect(claim.where).toBeTruthy();
      expect(claim.sandbox).toBeTruthy();
      expect(claim.test).toBe(`npm run test:e2e -- --grep @claim:${claim.id}`);
      expect(e2e.match(new RegExp(`@claim:${claim.id}\\b`,'g'))).toHaveLength(1);
    }
  });

  it('ships the 404 page and social metadata', () => {
    const index = readFileSync(new URL('../index.html', import.meta.url),'utf8');
    const notFound = readFileSync(new URL('../404.html', import.meta.url),'utf8');
    expect(index).toContain('<link rel="canonical"');
    expect(index).toContain('takebook-social.webp');
    expect(index).toContain('apple-touch-icon.png');
    expect(notFound).toContain('<main id="main">');
    expect(notFound).toContain('<title>Page not found — Takebook</title>');
  });
});
