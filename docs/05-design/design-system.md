# Digital Legacy Vault — Design System

| Document control | |
|---|---|
| Version | 1.0.0 |
| Date | 2026-07-05 |
| Status | Draft for Review |
| Owner | Design Team |
| Related | `docs/05-design/design-tokens.md`, `PROJECT_MEMORY.md` §3, §8 |

---

## 1. Design principles

Digital Legacy Vault is used by people preparing for death, and by people grieving one. Every design decision is filtered through that reality.

1. **Calm.** Generous whitespace, muted colour, low visual density. No badges screaming for attention, no gamification, no artificial urgency ("Act now!"). The interface should feel like a quiet, well-organised room.
2. **Trustworthy.** The product safeguards wills, identity documents, and end-of-life wishes. Visual precision (aligned grids, consistent radii, deliberate typography) signals operational precision. Security states (encrypted, sealed, legal-hold) are always visible but never alarmist.
3. **Uncluttered.** One primary action per screen. Progressive disclosure for advanced options. Empty states teach; they do not upsell.
4. **Honest about the law.** Per PROJECT_MEMORY §2.2, DLV is a secure repository and evidence-preservation layer — not a substitute for legally executing a will. UI copy must never imply a stored will is legally executed. Legal-status labels ("Stored copy — original requires wet-ink signature and witnesses") are a first-class component concern, not an afterthought.
5. **Accessible by default.** WCAG 2.2 AA is a hard requirement (PROJECT_MEMORY §3). Many users are elderly or in distress; accessibility is core UX, not compliance theatre.
6. **Apple-inspired restraint.** Soft depth via subtle shadows, continuous rounded corners, physics-like but brief motion, typography-led hierarchy instead of boxes and borders.

---

## 2. Layout grid & spacing

### 2.1 Grid

| Breakpoint | Columns | Margin | Gutter | Max content width |
|---|---|---|---|---|
| `xs` < 640px | 4 | 16px | 16px | fluid |
| `sm` ≥ 640px | 8 | 24px | 16px | fluid |
| `md` ≥ 768px | 8 | 32px | 24px | fluid |
| `lg` ≥ 1024px | 12 | 32px | 24px | 960px |
| `xl` ≥ 1280px | 12 | 40px | 24px | 1120px |
| `2xl` ≥ 1536px | 12 | 40px | 32px | 1280px |

- App shell: fixed left sidebar 264px (`lg`+), collapsing to icon rail 72px, then to bottom tab bar on mobile.
- Reading measure for long-form content (legal explanations, help): max 68ch.

### 2.2 Spacing scale (4px base)

All spacing uses the token scale only — no arbitrary pixel values.

| Token | rem | px | Typical use |
|---|---|---|---|
| `space-0` | 0 | 0 | reset |
| `space-1` | 0.25 | 4 | icon-to-label gap |
| `space-2` | 0.5 | 8 | intra-component padding |
| `space-3` | 0.75 | 12 | input padding-y |
| `space-4` | 1 | 16 | default component padding |
| `space-5` | 1.25 | 20 | card padding (compact) |
| `space-6` | 1.5 | 24 | card padding (default) |
| `space-8` | 2 | 32 | section gap within page |
| `space-10` | 2.5 | 40 | large section gap |
| `space-12` | 3 | 48 | page-block separation |
| `space-16` | 4 | 64 | hero / page top padding |
| `space-20` | 5 | 80 | marketing sections |
| `space-24` | 6 | 96 | marketing hero |

---

## 3. Typography

**Typeface:** Inter Variable (self-hosted, `font-display: swap`, subset latin + latin-ext). Fallback stack: `Inter, -apple-system, "Segoe UI", Roboto, sans-serif`. Tabular numerals (`font-variant-numeric: tabular-nums`) for dates, file sizes, and audit timestamps.

### 3.1 Type scale

| Token | Size | Weight | Line height | Tracking | Use |
|---|---|---|---|---|---|
| `display` | 3rem (48px) | 650 | 1.1 | -0.02em | Marketing hero only |
| `h1` | 2.25rem (36px) | 650 | 1.2 | -0.02em | Page title |
| `h2` | 1.5rem (24px) | 600 | 1.3 | -0.01em | Section heading |
| `h3` | 1.25rem (20px) | 600 | 1.4 | -0.01em | Card / modal title |
| `h4` | 1.125rem (18px) | 600 | 1.4 | 0 | Sub-heading |
| `body-lg` | 1.125rem (18px) | 400 | 1.6 | 0 | Long-form reading |
| `body` | 1rem (16px) | 400 | 1.5 | 0 | Default UI text |
| `body-sm` | 0.875rem (14px) | 400 | 1.5 | 0 | Secondary text, table cells |
| `caption` | 0.75rem (12px) | 500 | 1.4 | +0.01em | Timestamps, metadata |
| `overline` | 0.75rem (12px) | 600 | 1.4 | +0.06em, uppercase | Group labels |

Rules: body text never below 16px on touch devices; minimum rendered text anywhere is 12px; weight 650 (variable axis) reserved for `display`/`h1`; never use weight 300 or lighter.

---

## 4. Colour system

Full primitive and semantic token values live in `design-tokens.md`; the values below are canonical and both documents must stay in sync.

### 4.1 Palette intent

- **Backgrounds:** pure white surfaces on a soft-grey canvas (light); layered deep greys, never pure black (dark).
- **Primary:** soft, desaturated blue — calm and institutional, not "tech startup" electric blue.
- **Feedback:** muted green / amber / red, used sparingly. Danger red is reserved for destructive and estate-critical actions.

### 4.2 Light mode

| Semantic role | Token | Hex | Contrast note (WCAG 2.2 AA) |
|---|---|---|---|
| Canvas background | `bg-canvas` | `#F7F8FA` | — |
| Surface (cards, panels) | `bg-surface` | `#FFFFFF` | — |
| Surface subtle (wells, table stripes) | `bg-subtle` | `#F2F4F7` | — |
| Border default | `border-default` | `#E4E7EC` | ≥3:1 vs surface not required (decorative); inputs use `border-strong` |
| Border strong (inputs) | `border-strong` | `#98A2B3` | 3.2:1 vs `#FFFFFF` — meets 1.4.11 non-text contrast |
| Text primary | `text-primary` | `#1D2433` | 15.4:1 on white |
| Text secondary | `text-secondary` | `#4A5468` | 8.1:1 on white |
| Text muted | `text-muted` | `#6C7689` | 5.0:1 on white (AA for all sizes) |
| Primary / interactive | `accent` | `#2F6EAD` | 5.3:1 on white — AA for text and UI |
| Primary hover | `accent-hover` | `#275C91` | 6.9:1 |
| Primary subtle bg | `accent-subtle` | `#E3EEF9` | pair with `accent-text` `#224C77` (7.4:1) |
| On-accent text | `text-on-accent` | `#FFFFFF` | 5.3:1 on `#2F6EAD` |
| Focus ring | `focus-ring` | `#4288C8` | 3.4:1 vs white — meets 1.4.11 |
| Success | `success` | `#1B7F4D` | 4.6:1 on white |
| Warning | `warning` | `#A15C07` | 5.0:1 on white |
| Danger | `danger` | `#B42318` | 6.3:1 on white |
| Sealed/legal indicator | `seal` | `#5B4FB0` | 6.0:1 on white |

### 4.3 Dark mode

Dark mode is not inverted light mode; it is a layered elevation model. Higher surfaces are lighter.

| Semantic role | Token | Hex | Contrast note |
|---|---|---|---|
| Canvas background | `bg-canvas` | `#0E1116` | — |
| Surface | `bg-surface` | `#171B22` | — |
| Surface raised (modals, popovers) | `bg-raised` | `#1F242E` | — |
| Surface subtle | `bg-subtle` | `#1C212A` | — |
| Border default | `border-default` | `#2A303C` | decorative |
| Border strong (inputs) | `border-strong` | `#5D6B82` | 3.1:1 vs `#171B22` |
| Text primary | `text-primary` | `#F0F2F5` | 14.9:1 on `#171B22` |
| Text secondary | `text-secondary` | `#B4BCC9` | 8.3:1 |
| Text muted | `text-muted` | `#8B94A6` | 5.1:1 |
| Primary / interactive | `accent` | `#6BA7DB` | 5.6:1 on `#171B22` |
| Primary hover | `accent-hover` | `#8FBCE5` | 7.4:1 |
| Primary subtle bg | `accent-subtle` | `#1D3049` | pair with `accent-text` `#9CC5E8` (6.8:1) |
| On-accent text | `text-on-accent` | `#0E1116` | 5.6:1 on `#6BA7DB` |
| Focus ring | `focus-ring` | `#6BA7DB` | 3:1+ vs all dark surfaces |
| Success | `success` | `#4CC38A` | 6.9:1 |
| Warning | `warning` | `#E5A13D` | 7.6:1 |
| Danger | `danger` | `#F2716A` | 5.6:1 |
| Sealed/legal indicator | `seal` | `#A79BE8` | 6.6:1 |

Theme switching: `class="dark"` on `<html>`, default follows `prefers-color-scheme`, user override persisted per device.

### 4.4 Usage rules

- Colour never carries meaning alone (WCAG 1.4.1): every status pairs colour with icon + label.
- Maximum one `accent`-filled primary button per view.
- `danger` fill only on confirmed destructive steps; the first step of a destructive flow uses danger *outline*.

---

## 5. Component inventory

Every component ships with: keyboard support, visible focus state, disabled/loading states, dark-mode parity, RTL-safe layout. Interactive targets are ≥24×24px (WCAG 2.2 §2.5.8); primary touch targets ≥44×44px.

### 5.1 Buttons

- **Anatomy:** container (radius `radius-md` 10px), optional leading Lucide icon 16px, label (`body`, weight 500), optional trailing icon.
- **Variants:** `primary` (accent fill), `secondary` (surface + `border-strong`), `ghost` (text-only), `danger` (danger fill), `danger-outline`.
- **Sizes:** sm 32px, md 40px (default), lg 48px height; padding-x 12/16/20px.
- **States:** default → hover (bg shifts one step, 150ms) → active (scale 0.98, 150ms) → focus-visible (2px `focus-ring` ring, 2px offset) → disabled (60% opacity, `cursor: not-allowed`) → loading (spinner replaces leading icon; label persists; `aria-busy="true"`; width locked to prevent layout shift).
- **Behaviour:** loading state debounced 200ms to avoid flicker; destructive buttons never auto-focused in dialogs.

### 5.2 Inputs (text, select, textarea, date)

- **Anatomy:** label (always visible — no placeholder-as-label), optional description, field (40px min height, radius `radius-md`, `border-strong`), optional leading icon, helper/error text slot (space reserved to prevent shift).
- **States:** default, hover (border → `text-muted`), focus (border → `accent` + 2px ring), error (border + text `danger`, `aria-invalid`, error announced via `aria-describedby`), disabled, read-only (subtle bg, no border change on hover).
- **Behaviour:** validation on blur, revalidation on change after first error; errors written in plain language ("Enter the date in DD/MM/YYYY" not "Invalid format").

### 5.3 Cards

- **Anatomy:** surface (`bg-surface`, radius `radius-lg` 14px, `shadow-sm`), optional header (title `h3` + action slot), body, optional footer.
- **States:** static; interactive cards add hover (`shadow-md`, 200ms) and full-card link with a single tab stop.
- **Behaviour:** cards never nest more than one level; borders instead of shadows in dense lists.

### 5.4 Modals & dialogs

- **Anatomy:** overlay (`#101828` @ 60%, blur 4px), panel (radius `radius-xl` 20px, `shadow-lg`, max-width 480/640/800px), title `h3`, body, footer with actions right-aligned (primary rightmost).
- **States:** enter (fade + scale 0.97→1, 200ms `ease-out`), exit (150ms).
- **Behaviour:** focus trap; initial focus on first non-destructive control; `Esc` closes unless mid-upload/signing; focus returns to trigger; background `inert`; confirmation dialogs for destructive actions require typing the document name for irreversible operations (see Danger zone).

### 5.5 Navigation

- **Sidebar (desktop):** vault switcher, primary sections (Home, Documents, People, Estate plan, Activity, Settings), current item = `accent-subtle` bg + `accent` text + 3px left indicator.
- **Tab bar (mobile):** 5 items max, 56px height, labels always visible, safe-area aware.
- **Breadcrumbs:** folder paths in vault; truncate middle segments.
- **Behaviour:** sidebar is a `<nav aria-label="Primary">`; keyboard: arrow keys within nav, standard tab order across landmarks.

### 5.6 Document card

The core object of the product.

- **Anatomy:** file-type icon or thumbnail (40×40, radius `radius-sm`), title (`body`, weight 500, 1-line truncate), metadata row (`caption`: category chip, size, updated date), status indicators (encrypted 🔒 always; `Client-encrypted`, `Sealed`, `Legal hold`, `Shared`, `Scan pending` as labelled chips), overflow menu.
- **States:** default, hover, selected (checkbox + `accent-subtle` bg), quarantined (muted with "Being scanned…" chip — never alarming), infected-rejected (danger chip + plain-language explanation + remove action).
- **Behaviour:** whole card opens preview; menu exposes Download, Share, Move, Versions, Sign, Delete; multi-select via checkbox or `Shift+Click`; list and grid layouts share the same DOM semantics (`role="row"` in list).

### 5.7 Vault timeline

Renders `AuditEvent` / activity streams (GraphQL read model).

- **Anatomy:** vertical line, event nodes (icon in 32px circle keyed by event type), event title (plain language: "Anna viewed *Last Will* — 14:02"), timestamp (`caption`, tabular), day dividers, hash-chain verification badge on expanded detail.
- **States:** loading skeleton, incremental "Show earlier activity", filtered (by person / document / event type).
- **Behaviour:** newest first; events are immutable — no edit/delete affordances ever; sensitive events (emergency access requested) use `warning` styling + always notify owner per security invariant §7.6.

### 5.8 Signature pad

- **Anatomy:** ceremony stepper (Review → Identity → Sign → Seal), canvas area (min 280×120, `border-strong` dashed until first stroke), mode tabs (Draw / Type / Upload), legal notice slot (ECTA wording + wills disclaimer), consent checkbox, "Apply signature" primary button.
- **States:** empty, drawing, captured (Clear/Redo available), sealing (progress with plain explanation: "Creating tamper-evident seal…"), sealed (read-only, seal summary: SHA-256 digest, RFC 3161 timestamp, signer identity).
- **Behaviour:** pointer + touch + stylus; keyboard users get Type mode by default; canvas has `aria-label` and text alternative; nothing is submitted until explicit consent checkbox + button; sealed view links to evidence bundle.

### 5.9 Empty states

- **Anatomy:** Lucide icon (48px, `text-muted`), heading (`h3`), one sentence of guidance, single primary action, optional secondary "Learn how" link.
- **Tone:** encouraging, never guilt-inducing. "Your vault is ready for its first document." — never "You have 0 documents!".
- **Variants:** first-run (teaches), filtered-empty ("No documents match — clear filters"), permission-empty ("You'll see documents here when Maria shares them with you").

### 5.10 Danger zones

- **Anatomy:** section at the bottom of settings pages, `danger`-tinted 1px border, `radius-lg`, title + consequence description, danger-outline trigger buttons.
- **Behaviour:** two-step confirmation minimum; irreversible actions (delete vault, revoke executor, disable emergency access) require typing the resource name; each completed action produces an `AuditEvent` and owner notification; actions blocked by `LegalHold` explain why in plain language.

### 5.11 Supporting components

Toast (bottom-left desktop / top mobile, auto-dismiss 5s, pause on hover, `role="status"`), banner (page-level, dismissible unless legal), chips/badges, skeleton loaders (shimmer disabled under reduced motion), avatar + person cell, progress (uploads: per-file bar + pipeline stage label "Uploading → Scanning → Encrypting → Done"), stepper, tooltip (never sole carrier of information), table (sticky header, `caption` provided), file dropzone (whole-page drop target with visible fallback button).

---

## 6. Motion

- **Purpose-only:** motion explains spatial relationships and state change; nothing moves for decoration.
- **Durations:** micro (hover, press) 150ms; standard (fade, expand) 200ms; emphasised (modal, page transition) 250–300ms. Nothing exceeds 300ms.
- **Easings:** `ease-out` `cubic-bezier(0.2, 0, 0, 1)` for entrances; `ease-in` `cubic-bezier(0.4, 0, 1, 1)` for exits; `ease-standard` `cubic-bezier(0.25, 0.1, 0.25, 1)` for movement.
- **Reduced motion:** `prefers-reduced-motion: reduce` ⇒ all transitions collapse to opacity ≤100ms, skeleton shimmer becomes static, canvas confetti/celebration is never used anywhere in this product regardless.
- **No motion on grief-sensitive flows:** death-verification and emergency-access screens use instant state changes only.

---

## 7. Iconography

- **Library:** Lucide (per platform standard), 1.5px stroke, sizes 16/20/24/48 (empty states only).
- Icons inherit `currentColor`; decorative icons `aria-hidden="true"`; icon-only buttons require `aria-label` and a tooltip.
- Domain mappings (canonical): Vault `vault`, Document `file-text`, Will `scroll-text`, Beneficiary `users`, Executor `user-check`, Emergency access `shield-alert`, Signature `pen-line`, Sealed `badge-check`, Legal hold `gavel`, Audit `history`, Client-encrypted `lock-keyhole`.
- No skull, coffin, or tombstone iconography anywhere. Death-related flows use neutral icons (`heart-handshake`, `shield`).

---

## 8. Accessibility requirements (WCAG 2.2 AA)

1. **Focus:** all interactive elements show a 2px `focus-ring` outline with 2px offset on `:focus-visible`; never `outline: none` without replacement; focus not obscured by sticky elements (2.4.11).
2. **Target size:** ≥24×24px for all targets (2.5.8); ≥44×44px for primary mobile actions.
3. **Keyboard:** everything operable without a pointer; no keyboard traps; standard patterns — `Esc` closes overlays, arrows within composite widgets (menus, tabs, listbox), `Enter`/`Space` activate; drag-and-drop upload always has a button alternative (2.5.7).
4. **ARIA:** landmarks (`header/nav/main/aside`), APG patterns for dialog/menu/tabs/combobox, live regions for upload progress and toasts, `aria-describedby` for errors and legal notices.
5. **Contrast:** text ≥4.5:1, large text ≥3:1, non-text UI ≥3:1 — enforced by the token pairs in §4; CI runs axe-core (see testing-strategy.md).
6. **Redundant entry & auth (3.3.7, 3.3.8):** previously entered data pre-filled in multi-step flows; passkeys/WebAuthn mean no cognitive-test-only authentication.
7. **Forms:** labels always visible, autocomplete attributes on personal fields, error summary focus-moved on submit failure.
8. **Screen-reader passes** on the five critical journeys each release (see testing-strategy.md §8).

---

## 9. Content & voice

- **Voice:** a calm, competent friend who happens to be a professional. Warm, direct, never chirpy, never morbid.
- **Plain language:** sentences ≤20 words where possible; reading level ≈ Grade 8. Every legal term is explained inline on first use: "an *executor* (the person who carries out the wishes in a will)".
- **Never:** exclamation marks in estate/death flows; "Oops!"; blame ("You entered an invalid…" → "That date doesn't look right — use DD/MM/YYYY"); euphemism stacking (say "after your death", not "if something happens").
- **Legal honesty:** wills UI always shows the wet-ink notice (PROJECT_MEMORY §2.2). E-signature flows state ECTA scope plainly.
- **Empathy patterns:** death-verification and bereavement flows open with a single acknowledgement line ("We're sorry for your loss.") and then get out of the way — short screens, no upsells, human support link visible.
- **Localisation-ready:** en-ZA is the source locale; strings externalised; dates DD MMM YYYY; currency formatted from integer minor units + code (PROJECT_MEMORY §8).

---

## 10. Responsive breakpoints

| Token | Min width | Behaviour |
|---|---|---|
| `xs` | 0 | single column, bottom tab bar, full-screen modals |
| `sm` | 640px | 2-col cards, modals become dialogs |
| `md` | 768px | icon-rail sidebar appears |
| `lg` | 1024px | full sidebar 264px, split views (list + preview) |
| `xl` | 1280px | max content 1120px, preview pane widens |
| `2xl` | 1536px | max content 1280px |

Mobile-first CSS; container queries for document cards (list vs grid) rather than viewport queries where practical.

---

## 11. PWA behaviours

- **Installable:** manifest with maskable icons, `display: standalone`, theme colour `#F7F8FA` / `#0E1116`.
- **Offline:** app shell + last-viewed document metadata cached (Workbox via next-pwa); document *contents* are never cached to disk by the service worker (security invariant — encrypted objects fetched on demand only); clear offline state banner: "You're offline — showing your last synced view."
- **Uploads:** Background Sync queues metadata operations; binary uploads require connectivity and resume via multipart.
- **Push:** web push for reminders, share notifications, and emergency-access alerts (opt-in, per-category preferences; emergency-access owner alerts cannot be disabled — security invariant §7.6).
- **Session:** biometric re-auth via WebAuthn on PWA resume after 15 min (matches JWT access lifetime).
- **Updates:** service-worker update prompts a non-blocking toast "A new version is ready — Refresh".
