# SLOs, Error Budgets & Post-Launch Monitoring

Formalises the service-level objectives referenced by the deployment strategy
and the Phase 10 exit criterion (*2 weeks post-launch with SLOs met and error
budget ≥ 50% remaining*). Windows are rolling 28-day unless stated; the launch
watch evaluates the first 14 days (`slo-watch-check.mjs`).

## Service level objectives
| # | Service | SLI | SLO target | Error budget (28d) |
|---|---|---|---|---|
| SLO-1 | API availability | Successful (non-5xx) responses / total | **99.9%** | 43.2 min |
| SLO-2 | API latency | p95 request latency | **< 400 ms** (read), < 800 ms (write) | 0.1% over |
| SLO-3 | Auth success | Login/refresh non-error rate (excl. bad creds) | **99.95%** | 21.6 min |
| SLO-4 | Upload pipeline | Docs reaching READY / uploaded | **99.5%** | 0.5% |
| SLO-5 | Upload latency | p95 quarantine→READY (≤ 25 MB) | **< 60 s** | 0.5% over |
| SLO-6 | Signature seal | Ceremonies sealed + verifiable / attempted | **99.9%** | 0.1% |
| SLO-7 | Billing webhook | Stripe events processed within 5 min | **99.9%** | 0.1% |
| SLO-8 | Webhook delivery | Partner deliveries within 5 min (≤ 6 tries) | **99.9%** | 0.1% |
| SLO-9 | Notification send | Queued→sent (non-disableable within 2 min) | **99.5%** | 0.5% |

## SLIs — measurement sources
Emitted to CloudWatch/Prometheus: ALB + API 5xx and latency histograms; the
hash-chained audit log for pipeline/seal outcomes; BullMQ queue metrics for
webhook/notification latency; Stripe webhook processing timestamps. Dashboards
group by SLO; each has a burn-rate alert.

## Error-budget policy
- **Budget burn alerts:** fast-burn (2% of 28-day budget in 1 h) pages on-call;
  slow-burn (10% in 6 h) opens a ticket.
- **Budget exhausted (0% remaining):** feature freeze — only reliability fixes
  ship until the budget recovers; launch commander is notified.
- **≥ 50% remaining** at the end of the 14-day watch is the GA exit gate.

## Alerting thresholds (page vs ticket)
| Signal | Page (Sev-1/2) | Ticket |
|---|---|---|
| API 5xx | > 2% for 5 min | > 0.5% for 30 min |
| API p95 | > 2× baseline for 10 min | > 1.5× for 30 min |
| Upload READY p95 | > 60 s for 10 min | > 45 s for 30 min |
| Auth errors | > 1% for 5 min | drift vs baseline |
| Webhook/billing lag | > 5 min backlog | retries climbing |
| Replica lag / CRR | > 5 min / > 15 min | approaching |

## 2-week war-room watch
Daily: review SLO dashboards + burn rates, triage beta punch-list, confirm
backups/DR healthy, cost guardrails within budget. On-call rotation staffed
24×7 for the watch. Exit: all SLOs met across 14 days and every budget
≥ 50% remaining → record via `slo-watch-check.mjs` and flip status to Live.
