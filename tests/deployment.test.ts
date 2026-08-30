import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

type StaticConfig = { routes: {route:string;headers?:Record<string,string>}[]; globalHeaders: Record<string,string>; mimeTypes: Record<string,string>; responseOverrides: Record<string,{rewrite:string}> };
const config = JSON.parse(readFileSync(new URL('../public/staticwebapp.config.json', import.meta.url), 'utf8')) as StaticConfig;

describe('static deployment response policy', () => {
  it('makes fingerprinted build assets immutable without freezing the service worker', () => {
    expect(config.routes.find(route => route.route === '/assets/build/*')?.headers?.['Cache-Control']).toContain('immutable');
    expect(config.routes.find(route => route.route === '/sw.js')?.headers?.['Cache-Control']).toBe('no-cache');
  });

  it('ships browser hardening and the manifest media type', () => {
    expect(config.globalHeaders['Content-Security-Policy']).toContain("frame-ancestors 'none'");
    expect(config.globalHeaders['Permissions-Policy']).toContain('camera=()');
    expect(config.globalHeaders['Cross-Origin-Opener-Policy']).toBe('same-origin');
    expect(config.globalHeaders['Strict-Transport-Security']).toContain('max-age=31536000');
    expect(config.mimeTypes['.webmanifest']).toBe('application/manifest+json');
    expect(config.responseOverrides['404']?.rewrite).toBe('/404.html');
  });
});
