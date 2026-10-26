import { test, expect } from '../src/fixtures/monitor-fixture';
import { TARGETS } from '../src/config/targets';

test.describe('Critical Synthetic Monitoring Probes', () => {
  for (const target of TARGETS) {
    test(`[${target.id}] availability, DOM vital element, latency SLA, and clean console @critical`, async ({
      probeTarget,
    }) => {
      const result = await probeTarget(target);

      // 1. Availability check
      expect(result.status, `Expected HTTP 200 for ${target.url}, got ${result.status}`).toBe(200);
      expect(result.ok).toBe(true);

      // 2. DOM vital element render check (anti-white-screen)
      expect(
        result.vitalElementFound,
        `Expected vital selector "${target.vitalSelector}" to be visible on ${target.url}`,
      ).toBe(true);

      // 3. Title check
      expect(result.title).toMatch(target.expectedTitle);

      // 4. Latency SLA threshold
      expect(
        result.latencyMs,
        `Response latency ${result.latencyMs}ms exceeded SLA threshold of ${target.slaLatencyMs}ms`,
      ).toBeLessThanOrEqual(target.slaLatencyMs);

      // 5. Clean console check (zero uncaught JS errors)
      expect(
        result.consoleErrors,
        `Uncaught JS console errors detected on ${target.url}: ${result.consoleErrors.join('; ')}`,
      ).toHaveLength(0);
    });
  }
});
