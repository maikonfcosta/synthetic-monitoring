import fs from 'node:fs';
import path from 'node:path';

const resultsPath = path.resolve(process.cwd(), 'test-results', 'results.json');

if (!fs.existsSync(resultsPath)) {
  console.error(`Results file not found at ${resultsPath}`);
  process.exit(1);
}

const rawData = fs.readFileSync(resultsPath, 'utf8');
const results = JSON.parse(rawData);

const probes = [];

function extractSpecs(suite) {
  if (suite.specs) {
    for (const spec of suite.specs) {
      const test = spec.tests?.[0];
      const result = test?.results?.[test.results.length - 1];
      const isFlaky = test?.results?.length > 1 && result?.status === 'passed';

      probes.push({
        title: spec.title,
        status: isFlaky ? 'flaky' : (result?.status ?? 'skipped'),
        durationMs: result?.duration ?? 0,
        error: result?.error?.message,
      });
    }
  }

  if (suite.suites) {
    for (const subSuite of suite.suites) {
      extractSpecs(subSuite);
    }
  }
}

for (const rootSuite of results.suites || []) {
  extractSpecs(rootSuite);
}

const total = probes.length;
const passed = probes.filter((p) => p.status === 'passed').length;
const flaky = probes.filter((p) => p.status === 'flaky').length;
const failed = probes.filter((p) => p.status === 'failed').length;
const allHealthy = failed === 0;

const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
const statusBadge = allHealthy ? '🟢 HEALTHY' : '🔴 DEGRADED / OUTAGE';

let markdown = `# 📡 Synthetic Monitoring — Health Report\n\n`;
markdown += `- **Timestamp:** \`${timestamp}\`\n`;
markdown += `- **Overall Status:** **${statusBadge}** (${passed + flaky}/${total} operational)\n`;
markdown += `- **Metrics:** Passed: ${passed} | Flaky (recovered on retry): ${flaky} | Failed: ${failed}\n\n`;

markdown += `| Target / Probe | Status | Duration | Detail |\n`;
markdown += `| :--- | :---: | :---: | :--- |\n`;

for (const p of probes) {
  const icon = p.status === 'passed' ? '🟢 PASS' : p.status === 'flaky' ? '🟡 FLAKY' : '🔴 FAIL';
  const detail = p.error ? `\`${p.error.replace(/\n.*/g, '').substring(0, 80)}\`` : 'OK';
  markdown += `| ${p.title} | ${icon} | ${p.durationMs}ms | ${detail} |\n`;
}

markdown += `\n*Automated synthetic probe executed via Playwright engine.*\n`;

console.log(markdown);

const summaryEnv = process.env.GITHUB_STEP_SUMMARY;
if (summaryEnv) {
  fs.appendFileSync(summaryEnv, markdown, 'utf8');
  console.log(`Report appended to GITHUB_STEP_SUMMARY at ${summaryEnv}`);
}

if (!allHealthy) {
  process.exit(1);
}
