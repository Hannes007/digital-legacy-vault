#!/usr/bin/env node
/**
 * Post-launch SLO / error-budget watch evaluator (Phase 10 GA exit criterion:
 * "2 weeks post-launch with SLOs met and error budget >= 50% remaining").
 *
 * Reads a JSON snapshot of the watch window (produced from CloudWatch/Prometheus
 * during the live watch; a fixture is committed for CI/self-test) and checks:
 *   1. every SLO's measured value meets its target, and
 *   2. every SLO's error budget has >= 50% remaining,
 *   3. across a window of at least 14 days.
 * Exits non-zero if any check fails, so it gates the status-to-Live flip.
 *
 * Usage:
 *   slo-watch-check.mjs --input=watch.json
 *   slo-watch-check.mjs --self-test
 *
 * Input shape:
 *   { "windowDays": 14,
 *     "slos": [ { "id": "SLO-1", "name": "...", "target": 99.9, "measured": 99.95,
 *                 "higherIsBetter": true, "budgetRemainingPct": 62 }, ... ] }
 */
import { readFileSync } from 'node:fs';

const MIN_WINDOW_DAYS = 14;
const MIN_BUDGET_REMAINING = 50;

function arg(name) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : undefined;
}

function evaluate(report) {
  const failures = [];
  if (!report || typeof report.windowDays !== 'number' || !Array.isArray(report.slos)) {
    return { ok: false, failures: ['Invalid report: need { windowDays, slos[] }.'], rows: [] };
  }
  if (report.windowDays < MIN_WINDOW_DAYS) {
    failures.push(`Watch window ${String(report.windowDays)}d < required ${String(MIN_WINDOW_DAYS)}d.`);
  }
  const rows = [];
  for (const s of report.slos) {
    const higher = s.higherIsBetter !== false;
    const meets = higher ? s.measured >= s.target : s.measured <= s.target;
    const budgetOk = s.budgetRemainingPct >= MIN_BUDGET_REMAINING;
    if (!meets) failures.push(`${s.id} missed SLO: measured ${String(s.measured)} vs target ${String(s.target)}.`);
    if (!budgetOk) failures.push(`${s.id} budget ${String(s.budgetRemainingPct)}% < ${String(MIN_BUDGET_REMAINING)}%.`);
    rows.push(`${meets && budgetOk ? '✓' : '✗'} ${s.id} ${s.name}: ${String(s.measured)} (target ${String(s.target)}), budget ${String(s.budgetRemainingPct)}%`);
  }
  return { ok: failures.length === 0, failures, rows };
}

const SELF_TEST_REPORT = {
  windowDays: 14,
  slos: [
    { id: 'SLO-1', name: 'API availability', target: 99.9, measured: 99.95, higherIsBetter: true, budgetRemainingPct: 62 },
    { id: 'SLO-2', name: 'API p95 latency (ms)', target: 400, measured: 310, higherIsBetter: false, budgetRemainingPct: 71 },
    { id: 'SLO-4', name: 'Upload pipeline success', target: 99.5, measured: 99.7, higherIsBetter: true, budgetRemainingPct: 80 },
    { id: 'SLO-6', name: 'Signature seal success', target: 99.9, measured: 99.99, higherIsBetter: true, budgetRemainingPct: 95 },
  ],
};

function main() {
  let report;
  if (process.argv.includes('--self-test')) {
    report = SELF_TEST_REPORT;
  } else {
    const input = arg('input');
    if (!input) {
      console.log('Usage: slo-watch-check.mjs --input=watch.json | --self-test');
      process.exitCode = 2;
      return;
    }
    report = JSON.parse(readFileSync(input, 'utf8'));
  }
  const { ok, failures, rows } = evaluate(report);
  for (const r of rows) console.log(r);
  if (ok) {
    console.log(`\n✓ GA watch PASSED — all SLOs met, every budget >= ${String(MIN_BUDGET_REMAINING)}% over ${String(report.windowDays)} days.`);
    console.log('Action: flip PROJECT_MEMORY §9 launch status to "Live".');
  } else {
    console.error('\n✗ GA watch FAILED:');
    for (const f of failures) console.error(`  - ${f}`);
    process.exitCode = 1;
  }
}

main();
