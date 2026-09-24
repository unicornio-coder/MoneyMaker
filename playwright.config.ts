import { defineConfig, devices } from '@playwright/test';

// E2E en modo demo sin llaves: usuario vacío (MOCK_SIN_DEMO) y lectura de PDF por reglas (sin ANTHROPIC_API_KEY).
const PUERTO = Number(process.env.E2E_PORT ?? 3100);
const ejecutable = process.env.PW_CHROMIUM_PATH || undefined;

export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  // Si algo se cuelga (compilación, red), que falle en minutos y no se coma el tiempo del job.
  globalTimeout: 15 * 60_000,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PUERTO}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: ejecutable ? { executablePath: ejecutable } : undefined,
  },
  projects: [
    { name: 'movil', use: { ...devices['Pixel 7'], viewport: { width: 393, height: 851 } } },
    { name: 'escritorio', use: { ...devices['Desktop Chrome'], viewport: { width: 1380, height: 900 } } },
  ],
  webServer: {
    // En CI corre contra el build de producción (determinista y rápido); en local, next dev para iterar.
    command: process.env.CI ? `npx next start -p ${PUERTO}` : `npx next dev -p ${PUERTO}`,
    url: `http://localhost:${PUERTO}/app`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: { NEXT_PUBLIC_USE_MOCK: 'true', MOCK_SIN_DEMO: 'true', ANTHROPIC_API_KEY: '' },
  },
});
