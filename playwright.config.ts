import { defineConfig, devices } from '@playwright/test';

// End-to-end tests replay saved Exa responses (DEMO_CACHE_ONLY=1), so they are free and deterministic.
const PORT = 3100;

export default defineConfig({
  testDir: 'e2e',
  timeout: 30_000,
  use: { baseURL: `http://localhost:${PORT}`, trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: `next dev -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    env: { DEMO_CACHE_ONLY: '1', NEXT_DIST_DIR: '.next-e2e', PROFILE_DIR: 'tests/fixtures' },
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
