import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const resultsPath = path.resolve(process.cwd(), 'test-results', 'results.json');

if (!fs.existsSync(resultsPath)) {
  console.log('No results.json found. Skipping incident evaluation.');
  process.exit(0);
}

const rawData = fs.readFileSync(resultsPath, 'utf8');
const results = JSON.parse(rawData);

const failures = [];

function extractFailures(suite) {
  if (suite.specs) {
    for (const spec of suite.specs) {
      const test = spec.tests?.[0];
      const result = test?.results?.[test.results.length - 1];
      if (result && result.status !== 'passed') {
        failures.push({
          title: spec.title,
          error: result.error?.message || 'Unknown probe failure',
          duration: result.duration,
        });
      }
    }
  }

  if (suite.suites) {
    for (const subSuite of suite.suites) {
      extractFailures(subSuite);
    }
  }
}

for (const rootSuite of results.suites || []) {
  extractFailures(rootSuite);
}

const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC';

function runGh(cmd) {
  try {
    return execSync(`gh ${cmd}`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
  } catch {
    return null;
  }
}

const ghAvailable = runGh('--version') !== null;
if (!ghAvailable) {
  console.log('GitHub CLI (gh) not available or not authenticated. Incident management skipped.');
  process.exit(0);
}

if (failures.length > 0) {
  console.log(`Detected ${failures.length} failing synthetic probe(s). Evaluating double-fault incidents...`);

  for (const failure of failures) {
    const issueTitle = `[OUTAGE] Synthetic probe failed: ${failure.title}`;

    const searchResult = runGh(
      `issue list --state open --label "synthetic-monitoring" --json number,title`
    );

    let existingIssueNumber = null;
    if (searchResult) {
      try {
        const issues = JSON.parse(searchResult);
        const match = issues.find((i) => i.title.includes(failure.title));
        if (match) {
          existingIssueNumber = match.number;
        }
      } catch {
        // fallback
      }
    }

    const body = `### 🚨 Synthetic Monitoring Alert

- **Target / Probe:** \`${failure.title}\`
- **Detected At:** \`${timestamp}\`
- **Failure Detail:**
\`\`\`
${failure.error}
\`\`\`

*This incident was triggered automatically by the Playwright synthetic monitoring runner after double-fault confirmation.*`;

    if (existingIssueNumber) {
      console.log(`Updating existing incident issue #${existingIssueNumber}...`);
      runGh(`issue comment ${existingIssueNumber} --body "Synthetic probe still failing at ${timestamp}."`);
    } else {
      console.log(`Opening new incident issue for ${failure.title}...`);
      runGh(
        `issue create --title "${issueTitle}" --body "${body.replace(/"/g, '\\"')}" --label "synthetic-monitoring,incident"`
      );
    }
  }
} else {
  console.log('All synthetic probes passed. Checking for open incident issues to auto-resolve...');

  const searchResult = runGh(
    `issue list --state open --label "synthetic-monitoring" --json number,title`
  );

  if (searchResult) {
    try {
      const openIssues = JSON.parse(searchResult);
      for (const issue of openIssues) {
        console.log(`Auto-resolving incident issue #${issue.number}: ${issue.title}`);
        runGh(
          `issue close ${issue.number} --comment "🟢 **Auto-resolved**: All synthetic monitoring probes passed successfully at ${timestamp}."`
        );
      }
    } catch {
      // fallback
    }
  }
}
