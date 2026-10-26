import { test, expect } from '@playwright/test';
import { TARGETS } from '../src/config/targets';

test.describe('Full Ring Synthetic Checks (Nightly)', () => {
  for (const target of TARGETS) {
    test(`[${target.id}] critical assets (scripts, styles, favicon) load without HTTP errors @full`, async ({
      page,
    }) => {
      const failedAssets: { url: string; status: number }[] = [];

      page.on('response', (res) => {
        const url = res.url();
        const isStaticAsset =
          url.endsWith('.js') ||
          url.endsWith('.css') ||
          url.includes('favicon') ||
          url.endsWith('.png') ||
          url.endsWith('.svg');

        if (isStaticAsset && res.status() >= 400) {
          failedAssets.push({ url, status: res.status() });
        }
      });

      await page.goto(target.url, { waitUntil: 'domcontentloaded' });
      await page.locator(target.vitalSelector).waitFor({ state: 'visible', timeout: 5_000 });

      expect(
        failedAssets,
        `Detected broken assets on ${target.url}: ${JSON.stringify(failedAssets)}`,
      ).toHaveLength(0);
    });

    test(`[${target.id}] protocol security and edge CDN headers @full`, async ({ request }) => {
      expect(target.url.startsWith('https://'), `Target ${target.url} must use HTTPS`).toBe(true);

      const response = await request.get(target.url);
      expect(response.status()).toBe(200);

      const headers = response.headers();
      // Ensure edge/CDN or web server responded properly
      const hasServerHeader = Boolean(headers['server'] || headers['x-vercel-id'] || headers['via']);
      expect(hasServerHeader, `Missing edge/CDN routing headers on ${target.url}`).toBe(true);
    });
  }
});
