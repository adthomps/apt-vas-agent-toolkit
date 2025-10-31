import { defineConfig } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

// __dirname isn't defined in ESM; derive it from import.meta.url
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  testDir: path.resolve(__dirname, 'tests'),
  timeout: 30_000,
  webServer: {
    // Run the Express server so /api routes are available in tests.
    // tsx is available in devDependencies.
    command: 'npx tsx server/index.ts',
    url: 'http://127.0.0.1:3000',
    env: { PORT: '3000', VISA_ACCEPTANCE_API_MOCK: 'true' },
    reuseExistingServer: true,
    timeout: 60_000,
  },
  use: {
    headless: true,
    viewport: { width: 1280, height: 720 },
  },
});
