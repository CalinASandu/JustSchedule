# Responsive Layout Guide

Use this guide before editing any application layout. It defines how JustSchedule should adapt across phones, tablets, laptops, and large desktop screens while keeping the existing visual system from `docs/ui.md`.

## Goal

Responsive work in this app should make the same workflow feel native on each screen size. Do not treat responsiveness as shrinking the desktop UI until it fits. Recompose the layout around the user's task.

For product surfaces such as the student schedule, school dashboard, attendance, settings, and reservation management, the priority order is:

1. Preserve the current information architecture and behavior unless the task explicitly asks for a redesign.
2. Keep primary actions reachable and readable on touch devices.
3. Prevent horizontal page overflow, clipped controls, overlapping text, and unstable layouts.
4. Keep data real and state-driven. Do not hardcode fake capacities, slots, member counts, or availability to make a layout easier.
5. Maintain the existing light SaaS visual system: `#f7f8fa` page background, `.panel` surfaces, Geist, and `#2563eb` as the single primary accent.

## Styling Strategy

Use a hybrid approach:

- Use Tailwind classes for component-level responsive layout, spacing, visibility, and alignment.
- Use small semantic classes in `app/globals.css` only for repeated page-level layout primitives.
- Extract repeated responsive markup into components when the pattern appears more than once.
- Keep `.panel` as the shared card surface. Do not recreate its background, border, and radius inline.

Prefer this:

```tsx
<main className="mx-auto w-full max-w-[1400px] px-4 pb-12 sm:px-6 lg:px-8">
  <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
    ...
  </section>
</main>
```

Avoid this:

```tsx
<main style={{ maxWidth: 1400, margin: "0 auto", padding: "0 24px 64px" }}>
  ...
</main>
```

Inline styles are acceptable for dynamic values, calculated colors already used by a component, or third-party integration constraints. Do not use inline styles for static responsive spacing, widths, grids, or breakpoints.

## Breakpoint Model

Use mobile-first classes. The unprefixed class is the phone layout. Add larger-screen behavior with `sm:`, `md:`, `lg:`, and `xl:`.

| Range | Intent | Typical layout |
|---|---|---|
| `320px-639px` | Phone | Single column, full-width controls, card lists, compact headers |
| `640px-767px` | Large phone / small tablet | Single column with more breathing room, two-up only for tiny repeated controls |
| `768px-1023px` | Tablet | Two-column where useful, master/detail or content plus secondary panel |
| `1024px-1279px` | Laptop | Main dashboard grids, tables, persistent secondary panels |
| `1280px+` | Desktop | Wider grids with max-width constraints, never unbounded stretching |

Use content-driven breakpoints when a component breaks before or after the standard Tailwind breakpoint. The rule is simple: if text wraps badly, controls crowd, or a table becomes unusable, change the component at that width.

## Page Shell Rules

Every app page should follow these shell rules:

- Use `min-h-dvh` for full-height app screens.
- Use responsive page padding: `px-4 sm:px-6 lg:px-8`.
- Use max-widths on wide screens. Most dashboard surfaces should stay within `max-w-[1400px]`.
- Keep authenticated account actions reachable on phone. If the desktop navbar has a text `Sign out` button, the phone navbar still needs an icon button with `aria-label="Sign out"`.
- Avoid fixed pixel widths unless they are guarded by `w-full`, `max-w-*`, or a responsive grid.
- Use `min-w-0` on flex/grid children that contain text, tables, or long labels.
- Use `overflow-x-auto` only inside the component that needs it, never on the whole page.
- Do not hide core functionality on mobile. Reformat it.

Good shell:

```tsx
<div className="min-h-dvh bg-[#f7f8fa]">
  <Navbar ... />
  <main className="mx-auto w-full max-w-[1400px] px-4 pb-12 sm:px-6 lg:px-8">
    ...
  </main>
</div>
```

## Component Rules

### Panels

Panels should be readable on phones and efficient on desktop.

- Use `className="panel"` for the surface.
- Use `p-4 sm:p-5 lg:p-6` when a panel needs more desktop breathing room.
- Avoid nested panels. Use dividers, tinted rows, or grouped spacing inside one panel.
- Use `gap-3 sm:gap-4` for stacked content.
- Use `min-w-0` when a panel contains truncating text.

### Headers

Panel and page headers should wrap cleanly.

- Prefer `flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between`.
- Long names should use `min-w-0`, `truncate`, or normal wrapping depending on importance.
- Secondary actions should move below the title on phones, not squeeze beside it.

### Forms

Forms must be touch-friendly.

- Inputs and buttons should be at least `h-10`; primary actions are usually `h-11`.
- Use `w-full` on phone controls.
- Use `sm:grid-cols-2` or `md:grid-cols-2` only when labels and values still fit.
- Keep labels visible. Do not rely on placeholders for meaning.
- Segmented controls should become equal-width full-row controls on phones when labels are short.

### Buttons And Touch Targets

- Minimum practical touch target: `44px` by `44px`.
- Icon-only buttons need accessible labels and enough tap area.
- Avoid hover-only disclosure. Anything needed must work by click or tap.
- Keep destructive actions separated from primary actions, especially on mobile.

### Tables

Tables are usually bad on phones. Use a responsive dual rendering pattern:

- Mobile: render cards or stacked rows with the same data and actions.
- Tablet/desktop: render the table.
- Keep the data source shared. Do not duplicate filtering, sorting, or authorization logic.
- If a table remains on mobile, wrap the table itself in `overflow-x-auto` and keep the rest of the page fixed.

Pattern:

```tsx
<>
  <div className="grid gap-3 md:hidden">
    {items.map((item) => (
      <ItemCard key={item.id} item={item} />
    ))}
  </div>

  <div className="hidden overflow-x-auto md:block">
    <table className="w-full text-sm">...</table>
  </div>
</>
```

### Tab Bars And Switchers

Workspace switchers should keep their current role in the information architecture.

- Do not move school-specific panels into global navigation.
- Do not add a sidebar for a small workspace with three or fewer primary panels. Use the existing segmented workspace switcher unless the workflow truly needs persistent deep navigation.
- On phones, use full-width segmented controls or horizontal scrolling with `overflow-x-auto`.
- Keep active state obvious with the existing blue accent.
- Do not let labels shrink below readability. If space is tight, allow horizontal scroll before clipping text.
- Shorter mobile labels are acceptable when the full desktop label remains available at `sm:` and up.

### Dialogs And Overlays

- Use `p-4` on the overlay so dialogs never touch screen edges.
- Use `max-h-[calc(100dvh-2rem)] overflow-y-auto` for dialogs with forms or long content.
- On phones, dialog actions should stack or use full-width buttons if two side-by-side buttons become cramped.
- Keep focus rings and keyboard escape behavior intact.

## Student Schedule Application

When applying this guide to `/dashboard/schedule`, keep the current workflow:

- The student workspace switcher stays above the content.
- Do not add a sidebar to the student schedule. It has only three workspace panels, and a sidebar wastes phone/tablet space without improving the workflow.
- The panels remain `Schedule`, `My Reservations`, and `School Profile`.
- The `Schedule` panel is the booking workflow.
- `My Reservations` is the detailed self-management and cancellation area.
- `School Profile` owns membership details and the leave-school action.
- The schedule navbar must expose sign-out on phones, usually as a `44px` icon button with an accessible label.

Recommended responsive composition:

### Phone

- Page padding: `px-4`.
- Header stacks: title, school name, then panel switcher.
- Panel switcher is full width.
- Booking flow is one step at a time, one column.
- Calendar, slot picker, exam details, and booking summary use full-width panels.
- Seat availability appears below the booking step as supporting context.
- Reservation lists render as cards, not tables.
- Step navigation should use full-width primary buttons and touch-sized back controls.
- Segmented controls inside forms should be equal-width rows when labels are short, such as `Midterm` / `Final`.

### Tablet

- Keep the primary booking flow readable, usually one main column with supporting panels below or beside it.
- If two columns are used, the booking action remains dominant.
- Avoid three-column booking layouts before `lg`.

### Desktop

- Use max-width constrained grids.
- For the student schedule, use a two-column booking layout at `lg`: the active booking step in a `minmax(0,640px)` column and supporting context such as seat availability in a secondary column.
- Supporting panels can sit beside or below the primary flow. Sticky supporting panels are acceptable on desktop when they stay below the navbar, e.g. `lg:sticky lg:top-20`.
- Tables are acceptable for reservation lists if columns remain readable.
- Keep broad reservation lists below the booking workspace rather than squeezing them into the same row as the booking form.

## Dashboard And Management Surfaces

For admin/professor dashboard surfaces:

- Preserve the existing tab locations documented in `AGENTS.md`.
- Keep `SchoolManagementTabs.tsx` as the shell. Put responsive tab-specific UI under `components/dashboard/school-management-tabs/`.
- Day/week reservation views should remain data-driven from loaded `ExamSlots` and `Reservations`.
- Dense operational views may use horizontal scrolling on tablet/desktop, but phones should get stacked cards or agenda rows when practical.
- Settings pages should not become one long unstructured mobile scroll. Use sections, tabs, or progressive disclosure where the workflow needs it.

## Text And Overflow

Before finishing a layout change, check for:

- Long school names.
- Long student names.
- Long subject names.
- Long emails.
- Empty states.
- Error messages.
- Loading states.
- Disabled states.

Use these tools:

- `min-w-0` on flex/grid children.
- `truncate` only for secondary text where losing the tail is acceptable.
- `break-words` for content that must remain visible.
- `whitespace-nowrap` only for short labels, badges, dates, and times.
- `text-wrap` / normal wrapping for descriptions and helper text.

Do not solve overflow by shrinking font sizes below the design system scale unless the text is truly metadata.

## Accessibility

Responsive changes must preserve accessibility:

- Interactive controls need visible focus states.
- Icon-only controls need `aria-label`.
- Tab switchers need `role="tablist"` and each button should expose selected state when applicable.
- Dialogs need `role="dialog"` and `aria-modal="true"` when custom-built.
- Touch targets should be at least `44px`.
- Do not reorder content visually in a way that makes keyboard navigation confusing.
- Do not hide headings that screen reader users need for context.

## Performance

- Prefer CSS layout changes over JavaScript viewport listeners.
- Do not add resize observers unless component-local measurement is truly required.
- Do not render expensive duplicate trees for desktop and mobile unless the UI shape must differ, such as table versus card list.
- When rendering duplicate responsive views, keep each item small and share extracted row/card components where practical.
- Avoid layout animations that move large dashboard sections. Use the existing CSS animation utilities for small state reveals.

## Verification Checklist

Run this checklist before considering a responsive layout change complete:

- `320px` phone: no horizontal page scroll, no clipped primary controls.
- `390px` phone: primary workflow is comfortable and touch targets are usable.
- `768px` tablet: layout does not look like an oversized phone or a cramped desktop.
- `1024px` laptop: grids and tables use space efficiently.
- `1280px+` desktop: content stays max-width constrained and does not stretch awkwardly.
- Long names and long subjects do not break the layout.
- Empty, loading, error, disabled, and success states still fit.
- Keyboard focus remains visible.
- Mobile actions do not depend on hover.
- Console has no relevant React or layout-related errors.

For rendered UI changes, use the browser or Playwright to inspect at least one phone viewport and one desktop viewport. A successful production build is useful, but it is not enough for responsive UI work.

## Common Fixes

| Problem | Preferred fix |
|---|---|
| Whole page scrolls horizontally | Find the overflowing child, add `min-w-0`, responsive wrapping, or local `overflow-x-auto` |
| Table unusable on phone | Render mobile cards and desktop table from shared data |
| Buttons cramped in header | Stack actions below title on phone |
| Three columns too tight | Use one column by default, two at `md`, three only at `lg` or wider |
| Long labels clip | Allow wrap, use `min-w-0`, or move metadata to second line |
| Dialog too tall on phone | Add viewport max-height and internal scroll |
| Tap targets too small | Use `h-10` or `h-11`, larger padding, and full-width mobile buttons |
| Desktop content stretches too wide | Add `max-w-*` and centered page shell |

## Implementation Order

For any substantial responsive pass:

1. Read `docs/ui.md`, this guide, and the relevant component files.
2. Identify the user workflow and the content that must stay primary on phone.
3. Fix the page shell and top-level layout first.
4. Fix repeated components next.
5. Convert phone-hostile tables or dense grids into mobile cards.
6. Check edge states and long content.
7. Validate phone, tablet, and desktop viewports.
8. Update docs only when the layout pattern or product behavior changed.
