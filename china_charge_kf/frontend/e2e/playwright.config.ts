import { defineConfig, devices } from '@playwright/test'

// M8.0 — full-stack Playwright e2e for china_charge_kf H5 widget.
// webServer auto-starts: backend (Dify on :8012) + frontend (Vite on :5173).
// Tests assume the dev stack is otherwise idle; CI should run in a clean env.
//
// Spec layout: ./specs/*.spec.ts (T1-T7 from M7 verification matrix).
// See e2e/M8-REPORT.md for the spec source-of-truth and CI integration roadmap.

const PYTHON_BIN = 'C:/Users/q1234/miniconda3/python'
const BACKEND_PORT = 8012
const FRONTEND_PORT = 5173
const BACKEND_HEALTH = `http://127.0.0.1:${BACKEND_PORT}/health`
const FRONTEND_BASE = `http://127.0.0.1:${FRONTEND_PORT}`

export default defineConfig({
  testDir: './specs',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'e2e-results/html' }],
    ['junit', { outputFile: 'e2e-results/junit.xml' }],
  ],
  outputDir: 'e2e-results/test-results',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: FRONTEND_BASE,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    locale: 'en-US',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      // Dify backend on :8012 — miniconda python (project has no venv).
      // cwd MUST be backend/ so pydantic_settings loads backend/.env (which
      // contains DIFY_API_KEY / DIFY_V2_API_KEY). Without this, Settings()
      // would read frontend/.env (which only has VITE_BACKEND_PORT) and crash.
      command: `"${PYTHON_BIN}" -m uvicorn app_dify.main:app --host 127.0.0.1 --port ${BACKEND_PORT}`,
      cwd: '../backend',
      url: BACKEND_HEALTH,
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
      stdout: 'ignore',
      stderr: 'pipe',
    },
    {
      // Vite dev server on :5173 — proxies /api to backend. cwd MUST be frontend/
      // because that's where package.json lives; default cwd would be e2e/.
      command: 'npm run dev -- --port 5173 --strictPort',
      cwd: '..',
      url: FRONTEND_BASE,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      stdout: 'ignore',
      stderr: 'pipe',
    },
  ],
})