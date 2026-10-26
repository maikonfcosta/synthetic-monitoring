import { test as base, expect } from '@playwright/test';
import type { TargetConfig, ProbeResult } from '../monitoring/types';

export interface MonitorFixtures {
  probeTarget: (target: TargetConfig) => Promise<ProbeResult>;
}

export const test = base.extend<MonitorFixtures>({
  probeTarget: async ({ page }, use) => {
    const probe = async (target: TargetConfig): Promise<ProbeResult> => {
      const consoleErrors: string[] = [];

      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      page.on('pageerror', (err) => {
        consoleErrors.push(err.message);
      });

      const startTime = performance.now();
      const response = await page.goto(target.url, {
        waitUntil: 'domcontentloaded',
        timeout: 10_000,
      });
      const endTime = performance.now();
      const timing = response?.request().timing();
      // True network latency (TTFB + response transfer) excluding browser launch overhead
      const latencyMs = timing && timing.responseEnd > 0
        ? Math.round(timing.responseEnd)
        : Math.round(endTime - startTime);

      const status = response?.status() ?? 0;
      const ok = response?.ok() ?? false;

      const vitalElement = page.locator(target.vitalSelector).first();
      let vitalElementFound = false;
      try {
        await vitalElement.waitFor({ state: 'visible', timeout: 5_000 });
        vitalElementFound = true;
      } catch {
        vitalElementFound = false;
      }

      const title = await page.title();

      return {
        targetId: target.id,
        url: target.url,
        status,
        ok,
        latencyMs,
        consoleErrors,
        vitalElementFound,
        title,
      };
    };

    await use(probe);
  },
});

export { expect };
