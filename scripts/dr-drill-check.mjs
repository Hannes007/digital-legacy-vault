#!/usr/bin/env node
/**
 * DR drill helper (Phase 9). Two jobs:
 *
 *   1. `preflight` — assert the replication pre-conditions hold (RDS replica lag,
 *      S3 CRR latency) against the RPO budget, using metrics passed in as env or
 *      flags (wired to CloudWatch in the live drill; accepts fixtures in CI).
 *   2. `measure` — given failover declare/promote/recovery timestamps, compute
 *      RPO and RTO and check them against the targets, emitting a log row for
 *      docs/09-operations/dr-drill-log.md.
 *
 * Pure Node, no dependencies, so it runs anywhere (CI, a jump host, laptop).
 * Exit code is non-zero when a target is breached, so it gates a drill.
 */

const RPO_BUDGET_MIN = 15;
const RTO_BUDGET_HOURS = 4;

function arg(name, fallback) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : process.env[name.toUpperCase().replaceAll('-', '_')] ?? fallback;
}

function fail(msg) {
  console.error(`✗ ${msg}`);
  process.exitCode = 1;
}
function ok(msg) {
  console.log(`✓ ${msg}`);
}

function preflight() {
  const replicaLagMin = Number(arg('replica-lag-min', 'NaN'));
  const s3LatencyMin = Number(arg('s3-latency-min', 'NaN'));
  if (Number.isNaN(replicaLagMin) || Number.isNaN(s3LatencyMin)) {
    fail('preflight needs --replica-lag-min and --s3-latency-min (minutes).');
    return;
  }
  (replicaLagMin <= 5 ? ok : fail)(`RDS replica lag ${replicaLagMin} min (alarm at 5).`);
  (s3LatencyMin <= RPO_BUDGET_MIN ? ok : fail)(`S3 CRR latency ${s3LatencyMin} min (RPO ${RPO_BUDGET_MIN}).`);
  if (process.exitCode) return;
  ok('Preflight passed — replication is within the RPO budget.');
}

function minutesBetween(a, b) {
  return (new Date(b).getTime() - new Date(a).getTime()) / 60_000;
}

function measure() {
  const lastReplicated = arg('last-replicated', '');
  const promoted = arg('promoted', '');
  const declared = arg('declared', '');
  const recovered = arg('recovered', '');
  if (!lastReplicated || !promoted || !declared || !recovered) {
    fail('measure needs --last-replicated --promoted --declared --recovered (ISO timestamps).');
    return;
  }
  const rpoMin = minutesBetween(lastReplicated, promoted);
  const rtoHours = minutesBetween(declared, recovered) / 60;
  (rpoMin <= RPO_BUDGET_MIN ? ok : fail)(`Measured RPO ${rpoMin.toFixed(1)} min (target ${RPO_BUDGET_MIN}).`);
  (rtoHours <= RTO_BUDGET_HOURS ? ok : fail)(`Measured RTO ${rtoHours.toFixed(2)} h (target ${RTO_BUDGET_HOURS}).`);
  const result = process.exitCode ? 'FAIL' : 'PASS';
  const date = new Date(declared).toISOString().slice(0, 10);
  console.log('\nDrill log row (append to docs/09-operations/dr-drill-log.md):');
  console.log(`| ${date} | live/drill | ${rpoMin.toFixed(1)} min | ${rtoHours.toFixed(2)} h | pending | pending | ${result} | IC |`);
}

const command = process.argv[2];
if (command === 'preflight') preflight();
else if (command === 'measure') measure();
else {
  console.log('Usage:\n  dr-drill-check.mjs preflight --replica-lag-min=<n> --s3-latency-min=<n>\n  dr-drill-check.mjs measure --last-replicated=<iso> --promoted=<iso> --declared=<iso> --recovered=<iso>');
  process.exitCode = 2;
}
