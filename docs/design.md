# JustSchedule — UI Design Reference

Use this document before building any new UI in this project. All new pages and components must follow these conventions exactly.

---

## Aesthetic Direction

Clean, professional, light-mode SaaS. Think: Notion × Linear × Vercel dashboard. Restrained whitespace, one dominant blue accent, no gradients on core surfaces. Everything feels precise and fast. Dark mode is **not implemented** — build only light-mode.

---

## Color Palette

| Token | Value | Usage |
|---|---|---|
| Page background | `#f7f8fa` | Every page body |
| Surface / card | `#ffffff` | Panels, modals, inputs |
| Border | `#e4e8ef` | Cards, dividers, input borders, navbar bottom |
| Border (interactive) | `#e2e8f0` | SlotCard default border |
| Text primary | `#111827` | Headings, body |
| Text secondary | `#374151` | Labels |
| Text muted | `#6b7280` | Sub-labels, descriptions |
| Text placeholder | `#9ca3af` | Input placeholders, footer notes |
| Text faint | `#94a3b8` | Section labels (e.g. "TIME SLOT") |
| Blue primary | `#2563eb` | Buttons, avatar bg, logo mark, active borders |
| Blue hover | `#1d4ed8` | Button hover |
| Blue focus ring | `rgba(59,130,246,0.12)` | Input box-shadow on focus |
| Blue badge bg | `#dbeafe` | Available seat badge |
| Blue badge text | `#1d4ed8` | Available seat text |
| Blue muted | `#93c5fd` | Disabled button fill |
| Warning badge bg | `#fef3c7` | Low-availability badge |
| Warning badge text | `#b45309` | Low-availability text |
| Neutral badge bg | `#e2e8f0` | Full / disabled badge |
| Neutral badge text | `#94a3b8` | Full / disabled text |
| Error text | `#dc2626` | Inline error messages |
| Error bg | `#fef2f2` | Error banner background |
| Error border | `#fecaca` | Error banner border |

---

## Typography

Font: **Geist** (loaded via `next/font/google`, variable `--font-geist`). Already applied globally — do not import again.

| Role | Size | Weight | Color | Notes |
|---|---|---|---|---|
| Page heading (h1) | `1.35rem` | 700 | `#111827` | letter-spacing: `-0.025em`, line-height: 1.25 |
| Section heading | `0.9375rem` | 600 | `#111827` | letter-spacing: `-0.01em` |
| Body / description | `0.875rem` | 400 | `#6b7280` | line-height: 1.5 |
| Label | `0.8125rem` | 500 | `#374151` | |
| Small muted | `0.78rem` | 400 | `#9ca3af` | Footer notes |
| Navbar brand | `15px` | 600 | `#111827` | |
| Badge / slot meta | `11px` | 500 | `#94a3b8` | uppercase |
| Input value | `0.9375rem` | 400 | `#111827` | |

---

## Spacing & Sizing

- Page padding: `1.5rem` on all sides
- Card padding: `2rem`
- Navbar height: `h-14` (56px)
- Standard gap between stacked items: `1rem`
- Gap between heading and description: `0.4rem`
- Heading block bottom margin: `1.75rem`

---

## Border Radius

| Component | Radius |
|---|---|
| Panel / card | `18px` |
| Input | `10px` |
| Button | `10px` |
| Logo mark / avatar | `8px` (logo mark), `rounded-full` (avatar) |
| Navbar utility buttons | `rounded-xl` (12px) |
| SlotCard | `rounded-xl` (12px) |
| Badge / pill | `rounded-full` |
| Error banner | `8px` |

---

## Panel (Card Surface)

Use the `.panel` CSS class for all card surfaces:

```css
/* already in globals.css */
.panel {
  background: #ffffff;
  border: 1px solid #e4e8ef;
  border-radius: 18px;
}
```

Never recreate this inline. Always use `className="panel"`.

---

## Logo Mark

Blue `#2563eb` rounded square (`8px` radius), `30–32px` side. Contains a white calendar-grid or schedule icon. Always sits left of the "JustSchedule" wordmark.

```tsx
<div style={{ width: 30, height: 30, borderRadius: 8, background: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
  {/* schedule icon SVG, white strokes/fills */}
</div>
<span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#111827', letterSpacing: '-0.01em' }}>
  JustSchedule
</span>
```

---

## Navbar

```
height: h-14 (56px)
background: white
border-bottom: 1px solid #e4e8ef
position: sticky top-0 z-30
padding: px-6
```

Layout: logo left → `flex-1` spacer → utility buttons right (institution selector, bell, sign-out, avatar).

Utility buttons: `rounded-xl`, `border: 1px solid #e4e8ef`, `hover:bg-slate-50`.
Avatar: `w-8 h-8 rounded-full bg-[#2563eb]` showing 2-letter initials in white `text-[11px] font-semibold`.

---

## Buttons

### Primary (blue CTA)

```
height: 2.625rem
border-radius: 10px
background: #2563eb  →  hover: #1d4ed8  →  disabled: #93c5fd
color: white
font-weight: 600
font-size: 0.9375rem
box-shadow: 0 1px 3px rgba(37,99,235,0.25), 0 4px 12px rgba(37,99,235,0.12)
cursor: not-allowed when disabled
transform: scale(0.985) on mousedown
```

### Secondary / outline (utility)

```
border: 1px solid #e4e8ef
border-radius: rounded-xl
background: white  →  hover: bg-slate-50
color: #6b7280
padding: px-3 py-1.5
```

---

## Inputs

```
height: 2.625rem
border-radius: 10px
border: 1.5px solid #e4e8ef  →  focus: #3b82f6 + box-shadow: 0 0 0 3px rgba(59,130,246,0.12)
background: #ffffff
padding: 0 0.875rem
font-size: 0.9375rem
color: #111827
outline: none
```

Always use `onFocus`/`onBlur` handlers to apply the focus ring — Tailwind focus utilities don't handle the combined border + ring we use here.

---

## Badges / Pills

Three states used in SlotCard and similar:

```tsx
// Available
className="rounded-full px-3 py-1 text-sm font-semibold bg-[#DBEAFE] text-[#1D4ED8]"

// Low availability (≤ 2)
className="rounded-full px-3 py-1 text-sm font-semibold bg-[#FEF3C7] text-[#B45309]"

// Full / disabled
className="rounded-full px-3 py-1 text-sm font-semibold bg-[#E2E8F0] text-[#94A3B8]"
```

---

## Animations

All keyframes and utility classes are defined in `globals.css`. Use the classes, never recreate them inline.

| Class | Effect | Duration |
|---|---|---|
| `anim-fade-in` | opacity 0 → 1 | 200ms ease-out |
| `anim-slide-up` | opacity + translateY(10px) → normal | 300ms cubic-bezier |
| `anim-slide-right` | opacity + translateX(14px) → normal | 300ms cubic-bezier |
| `anim-scale-in` | opacity + scale(0.97) → normal | 200ms cubic-bezier |
| `anim-success` | scale bounce | 400ms cubic-bezier |

Stagger delays: `anim-d1` (60ms) → `anim-d2` (110ms) → `anim-d3` (160ms) → `anim-d4` (210ms).

**Pattern for page entry:** wrap the outer container in `anim-slide-up`, then apply `anim-d1` / `anim-d2` to inner card and sub-elements.

**Spinner (loading state):** use the `swapSpin` keyframe (already in globals.css) — `animation: swapSpin 0.7s linear infinite`.

For the landing/hero: `framer-motion` is used (`motion.button`, `whileHover`, `whileTap`). For all other UI, prefer CSS-only animations via the globals.css utilities.

---

## Page Layout Pattern (full-page centered forms)

Used for `/login` and any onboarding-style pages:

```tsx
// Outer wrapper
minHeight: "100vh"
background: "#f7f8fa"
display: flex, alignItems: center, justifyContent: center
padding: "1.5rem"

// Subtle grid overlay (atmospheric, not structural)
position: fixed, inset: 0
backgroundImage: "linear-gradient(#e4e8ef 1px, transparent 1px), linear-gradient(90deg, #e4e8ef 1px, transparent 1px)"
backgroundSize: "40px 40px"
opacity: 0.35
pointerEvents: none

// Content column
width: "100%", maxWidth: 420
```

Above the card: logo mark + wordmark centered, `marginBottom: "1.75rem"`.
Below the card: small muted footnote centered, `marginTop: "1.25rem"`, color `#9ca3af`, `0.78rem`.

---

## Dashboard Layout Pattern

Used for `/schedule` and other app pages:

```
Sticky navbar (h-14) at top
Page background: #f7f8fa
Content: padded container with .schedule-main-grid and .schedule-bottom-grid (defined in globals.css)
All data panels use .panel class
```

Grid breakpoint: `1024px` — stacks to single-column below, 3-column above for main grid.

---

## Error State

Inline red banner, shown below the input it relates to:

```tsx
<p style={{
  fontSize: "0.8125rem",
  color: "#dc2626",
  background: "#fef2f2",
  border: "1px solid #fecaca",
  borderRadius: 8,
  padding: "0.5rem 0.75rem",
}}>
  {error}
</p>
```

Wrap in `className="anim-fade-in"` so it appears smoothly.

---

## Supabase Client Usage

- **Client components** (`"use client"`): import `createClient` from `@/lib/supabase/client`
- **Server components / route handlers**: import `createClient` from `@/lib/supabase/server` (async)

Always call `supabase.auth.getUser()` to get the session user — never trust `getSession()` alone on the server.

---

## Don'ts

- No dark mode — build light only.
- No gradients on backgrounds or cards (grid overlay is the only atmospheric effect).
- No Inter, Roboto, or system fonts — Geist is already loaded globally.
- No purple accents — blue (`#2563eb`) is the sole accent color.
- No Tailwind `shadow-*` utilities on panels — the `.panel` border is the only elevation signal.
- Do not recreate `.panel` inline — always use the class.
- Do not add animation durations longer than 400ms for UI transitions.
