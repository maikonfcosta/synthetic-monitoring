# Spec: Synthetic Monitoring

## Goal
Prove automated synthetic monitoring in production: detect outages, latency degradation, console runtime errors, and broken links across personal production web apps, triggering actionable GitHub issues on double consecutive failures and auto-resolving them upon recovery.

## System under test
Production web applications (public endpoints):
1. `qa-playbook`: `https://maikonfcosta.github.io/qa-playbook/` (GitHub Pages)
2. `champions-hq`: `https://champions-hq.vercel.app` (Vercel Production)
3. `farm-hand-tool`: `https://farm-hand-tool.vercel.app` (Vercel Production)
4. `rotine`: `https://rotine.com.br` (Vercel Production)

Why these targets: Live production environments owned by Maikon, zero third-party violation risk, realistic multi-app portfolio monitoring.

## What gets tested

### Critical ring (@critical) — every 30 minutes, must stay under 45s total
| Case | Layer | Why it matters |
|---|---|---|
| HTTP 200 availability & TTFB | Network / HTTP | Catch DNS, CDN, or server down immediately |
| Core DOM element visibility | UI / E2E | Catch white screens, client-side crashes, React hydration errors |
| SLA response time (< 3000ms) | Performance | Alert on severe edge/server performance degradation |
| Clean browser console (zero uncaught JS errors) | Front / Logs | Detect broken bundles or third-party script crashes |

### Full ring (@full) — daily at 03:00 UTC
| Case | Layer | Why it matters |
|---|---|---|
| Broken link crawl (internal links) | E2E / Navigation | Prevent dead links and broken navigation paths |
| Critical asset check (favicon, scripts, stylesheets) | Network / Assets | Catch missing builds or 404 static files |
| SSL certificate & security headers sanity | Security / HTTP | Ensure HTTPS and basic protection headers exist |

## Design rules
1. **Double-fault alert policy:** Alarms (GitHub Issues) trigger ONLY after 2 consecutive failed runs to eliminate transient network noise (flakiness guard).
2. **Auto-resolution:** An open incident issue is automatically closed when the subsequent run succeeds, logging recovery timestamp and downtime duration.
3. **Non-invasive:** Probing focuses strictly on public read-only pages; no data pollution or production database mutation.
4. **Lightweight & fast:** Strict timeout of 10s per app check, parallel execution where safe, total suite execution < 45s.
5. **Actionable evidence:** Test failures capture URL, response code, console error dumps, and latency metrics in the run summary.

## CI
- GitHub Actions workflow scheduled via cron (`*/30 * * * *`) and on-demand `workflow_dispatch`.
- Markdown report published to GitHub Actions Job Summary.
- Automated GitHub issue creation/closure using `GITHUB_TOKEN` (no external secrets needed).
- Dynamic SVG badge or status dashboard deployment to GitHub Pages.

## Out of scope (for now)
- End-to-end transactional checkout / write mutations in production DB.
- External alerting integrations (PagerDuty, SMS, Discord/Slack webhooks).
- High-frequency polling (< 15 minutes) to avoid burning GitHub Actions free minutes or Vercel edge limits.

## Done when
- Playwright synthetic monitoring suite runs locally against all 4 production apps with 100% pass rate.
- Simulated downtime diagnostic verifies that 2 consecutive failures open an incident issue and recovery auto-closes it.
- GitHub Actions pipeline runs on schedule with automated issue management and status summary reporting.
