# UX/UI Design System — مسار (Masaar)

## Design Principles

1. **Operator-first clarity** — every screen answers one question: what do I need to do right now?
2. **Trust through guardrails** — AI outputs are always clearly labelled as drafts; guardrail status is prominent
3. **Arabic-first RTL** — all copy in Arabic; RTL layout correct throughout; Gulf Arabic register
4. **Mobile-capable** — dashboard usable on a phone; intake flow works on touch
5. **Calm authority** — dark sidebar + amber accent; no gratuitous animation or gradients

---

## Color Tokens

### CSS Custom Properties

```css
:root {
  --sidebar: 2 6 23;       /* slate-950 — sidebar background */
  --canvas:  248 250 252;  /* slate-50  — page background */
  --gold:    245 158 11;   /* amber-500 — brand accent */
}
```

### Tailwind Palette (extended)

| Token | Value | Usage |
|---|---|---|
| `brand.DEFAULT` | `#0f172a` (slate-900) | Primary text, buttons |
| `brand.sidebar` | `#020617` (slate-950) | Sidebar background |
| `brand.muted` | `#1e293b` (slate-800) | Sidebar hover |
| `gold.DEFAULT` | `#f59e0b` (amber-500) | Brand accent, active states |
| `gold.light` | `#fef3c7` (amber-100) | Highlight backgrounds |
| `gold.muted` | `#92400e` (amber-900) | Muted amber text |

### Semantic Colours

| Purpose | Class | Hex |
|---|---|---|
| Success / pass | `badge-pass` | Emerald-100 / Emerald-800 |
| Warning | `badge-warn` | Amber-100 / Amber-900 |
| Error / fail | `badge-fail` | Red-100 / Red-800 |
| Info | `badge-info` | Sky-100 / Sky-800 |
| Neutral | `badge-neutral` | Slate-100 / Slate-700 |
| VIP | `badge-vip` | Amber gradient |
| Hot lead | `badge-hot` | Red-100 / Red-700 |
| Warm lead | `badge-warm` | Amber-100 / Amber-800 |
| Cold lead | `badge-cold` | Sky-100 / Sky-800 |

---

## Typography

### Font Stack

```css
font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
```

### Arabic Font (Gulf script)

```css
@supports (font-family: "Noto Naskh Arabic") {
  :lang(ar) {
    font-family: "Noto Naskh Arabic", "Geeza Pro", "Arabic Typesetting", sans-serif;
  }
}
```

Arabic font only loads when the system supports it — no web font fetch penalty.

### Type Scale

| Class | Size | Weight | Use |
|---|---|---|---|
| `.h1` | 24px (text-2xl) | semibold | Page titles |
| `.h2` | 11px uppercase, wide tracking | semibold | Section labels, table headers |
| `.muted` | 14px | regular | Secondary text |
| `.kpi-value` | 24px | semibold | Dashboard KPI numbers |
| `.kpi-label` | 12px | regular | KPI description |
| `.kpi-hint` | 11px | regular | KPI secondary info |
| `badge` | 11px | medium | Status badges |

---

## Spacing and Layout

- **Sidebar width:** 256px (w-64) on desktop; hidden on mobile (≤ md breakpoint)
- **Page padding:** px-4 py-4 mobile, px-8 py-6 desktop
- **Card gap:** gap-4 (16px) standard
- **Grid:** responsive — 1 col mobile, 2–3 col desktop (md:grid-cols-2, lg:grid-cols-3)
- **Breakpoints:** Tailwind defaults (md=768px, lg=1024px)

---

## Component Library

### Cards

```css
.card        { rounded-2xl border-slate-200 bg-white p-4 shadow-sm }
.card-tight  { rounded-xl border-slate-200 bg-white p-3 shadow-sm }
.card-gold   { rounded-2xl border-amber-200 bg-amber-50 p-4 }
.card-dark   { rounded-2xl bg-slate-900 text-white p-4 }
```

### Buttons

```css
.btn         { inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium }
.btn-primary { bg-slate-900 text-white hover:bg-slate-700 }          /* primary action */
.btn-accent  { bg-amber-500 text-slate-950 hover:bg-amber-400 }      /* brand CTA */
.btn-ghost   { border border-slate-200 bg-white hover:bg-slate-50 }  /* secondary */
.btn-soft    { bg-slate-100 hover:bg-slate-200 text-slate-900 }      /* tertiary */
.btn-sm      { px-2 py-1 text-xs }                                   /* compact */
```

### Form Inputs

```css
.input {
  w-full rounded-lg border-slate-300 bg-white px-3 py-2 text-sm
  focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20
}
.label { block text-xs font-medium text-slate-600 mb-1 }
```

### Tables

```css
.tbl           { w-full text-sm }
.tbl thead th  { 11px font-semibold uppercase tracking-wide text-slate-400 }
.tbl tbody tr  { border-b hover:bg-slate-50/70 transition-colors }
.tbl th .tbl td { px-3 py-2.5 align-top }
```

### Kanban Columns

```css
.kanban { min-w-[240px] flex flex-col gap-2 rounded-2xl bg-slate-50 border-slate-200 p-3 }
```

### KPI Tiles

```css
.kpi-tile  { card flex flex-col gap-0.5 }
.kpi-value { text-2xl font-semibold tracking-tight text-slate-900 }
.kpi-label { text-xs text-slate-500 }
.kpi-hint  { text-[11px] text-slate-400 }
```

---

## RTL Rules

| Rule | Implementation |
|---|---|
| Root direction | `<html lang="ar" dir="rtl">` |
| Sidebar always left | `<aside dir="ltr">` forced override |
| Main content area | `<div dir="ltr">` for layout stability |
| Arabic text elements | `lang="ar"` attribute for correct shaping |
| Inline RTL | `.rtl { direction: rtl; text-align: right; }` |
| Number direction | Always LTR (prices, dates, codes) |
| Table alignment | `text-right` on Arabic columns |

---

## Accessibility

### Touch Targets

```css
@media (pointer: coarse) {
  .btn            { min-height: 44px; }
  .sidebar-item   { min-height: 40px; }
  a, button       { min-height: 36px; }
}
```

### Focus States

All focusable elements use `focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20` — visible amber focus ring.

### Safe Area (notched devices)

```css
.safe-bottom { padding-bottom: env(safe-area-inset-bottom, 0px); }
main         { padding-bottom: max(1.5rem, env(safe-area-inset-bottom)); }
```

### Known Accessibility Gaps

- No skip-to-main-content link
- Chart alternatives (text summaries) not yet implemented
- WCAG AA colour contrast not formally audited — visually assessed only
- Screen-reader announcements for AI analysis loading state not implemented

---

## PWA Configuration

| Property | Value |
|---|---|
| Name | مسار |
| Short name | مسار |
| Theme color | #f59e0b (amber) |
| Background | #020617 (slate-950) |
| Display | standalone |
| Start URL | / |
| Icons | SVG route-waypoints logo |
| Service worker | Network-first, skips /api/ routes |

Install prompt appears as Arabic banner at bottom of screen on supporting browsers.

---

## Known UX Gaps (Planned — Phase 2)

1. **Record pages are read-only** — no create/edit forms for orders, customers, inventory
2. **No order timeline detail view** — clicking an order shows list row only
3. **No in-app payment status update** — operator must update Supabase directly
4. **Screenshot upload not persisted** — image sent to AI for analysis but not saved
5. **No skeleton loaders** on SSR pages — content appears or doesn't (no intermediate state)
6. **No empty-state illustrations** — text-only empty states
