const { defineConfig, devices } = require('@playwright/test');
module.exports = defineConfig({
  testDir: __dirname, testMatch: '**/*.spec.cjs',
  timeout: 30000, expect: { timeout: 10000 }, retries: 1, workers: 2,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: { baseURL: process.env.EASY_ENGLISH_URL || 'https://jnfz92.github.io',
    screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'], viewport: {width: 1440, height:900} } },
    { name: 'mobile-chromium', use: { ...devices['Pixel 7'] } }
  ]
});
