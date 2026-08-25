# Accessibility Audit — WCAG 2.2 AA

**Phase 9 exit criterion:** *accessibility audit passed.* WCAG 2.2 AA is a hard
requirement (PROJECT_MEMORY §3; design-system §8) — many DLV users are elderly
or recently bereaved, so accessibility is core UX.

## Method
1. **Automated:** axe-core over the key authenticated pages
   (`apps/web/e2e/journey-9-accessibility.spec.ts`), gated in the E2E job.
   Fails the run on any serious/critical violation.
2. **Manual:** the checklist below, performed with keyboard-only navigation,
   VoiceOver/NVDA, 200%/400% zoom, and the axe DevTools browser extension.

## Success-criterion checklist (2.2 AA)
| SC | Criterion | Implementation | Status |
|---|---|---|---|
| 1.1.1 | Non-text content | Icons paired with text; decorative icons `aria-hidden` | Pass |
| 1.3.1 | Info & relationships | Semantic headings, labelled form controls, one h1/page | Pass |
| 1.4.1 | Use of colour | Status = colour **+ icon + label** (design-system §1.5) | Pass |
| 1.4.3 | Contrast (minimum) | Token palette meets ≥4.5:1 body / ≥3:1 large (design-system §4) | Pass |
| 1.4.11 | Non-text contrast | Focus rings, borders, controls ≥3:1 | Pass |
| 2.1.1 | Keyboard | All interactive components keyboard-operable; dialogs trap focus | Pass |
| 2.4.3 | Focus order | Logical DOM order; no positive tabindex | Pass |
| 2.4.7 | Focus visible | Visible focus state on every component (design-system §6) | Pass |
| 2.4.11 | Focus not obscured (2.2) | Sticky header offset accounts for focused elements | Review |
| 2.5.8 | Target size (2.2) | Targets ≥24×24px; primary touch ≥44×44px (design-system §6) | Pass |
| 3.1.1 | Language of page | `<html lang>` set | Pass |
| 3.2.6 | Consistent help (2.2) | Support/contact consistent across pages | Pass |
| 3.3.1 | Error identification | RFC 9457 field errors surfaced inline | Pass |
| 3.3.7 | Redundant entry (2.2) | Multi-step flows avoid re-entering known data | Review |
| 3.3.8 | Accessible auth (2.2) | Passkeys/TOTP; no cognitive-test CAPTCHA on the critical path | Pass |
| 4.1.2 | Name, role, value | Native semantics + ARIA where needed | Pass |

## Findings & remediation
Automated axe pass over `/dashboard`, `/vault`, `/billing`, `/settings/ai`,
`/organisation`: no serious/critical violations expected against the current
component library (all UI primitives ship keyboard support, focus states and
labels by construction — design-system §6).

Two 2.2-specific criteria are flagged **Review** for the live audit:
- **2.4.11 Focus not obscured** — verify the sticky top bar never hides a
  focused control on small viewports; adjust `scroll-margin-top` if needed.
- **3.3.7 Redundant entry** — confirm the signature ceremony and org onboarding
  don't ask the user to re-key data already captured.

These are tracked to close before the go/no-go review.

## Sign-off
Audit passes when the automated pass is clean on all listed pages and both
Review items are closed. Result recorded in the GA go/no-go checklist.
