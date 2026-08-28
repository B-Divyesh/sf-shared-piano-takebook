import { defineConfig } from '@playwright/test';
const externalBase = process.env.PLAYWRIGHT_BASE_URL;
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  use: { baseURL:externalBase ?? 'http://127.0.0.1:4173', trace:'retain-on-failure' },
  webServer: externalBase ? undefined : { command:'npm run build && npm run preview -- --host 127.0.0.1', url:'http://127.0.0.1:4173', reuseExistingServer:false }
});
