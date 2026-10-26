import { test, expect } from '@playwright/test';

test.describe('Synthetic Monitoring Harness Smoke', () => {
  test('verify test runner can load and probe target app @smoke @critical', async ({ page }) => {
    const targetUrl = 'https://maikonfcosta.github.io/qa-playbook/';
    const response = await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });

    expect(response?.status()).toBe(200);
    await expect(page).toHaveTitle(/QA Playbook/i);
  });
});
