# Design system

How Alpha looks and how to build screens that match. Read this before adding UI; `docs/DEVELOPMENT.md` has the general recipes.

Visual direction: quiet, Apple-inspired productivity. A floating navigation rail and topbar on a soft canvas (luminous neutrals in light, layered graphite with a navy undertone in dark), electric blue reserved for actions and the current location, turquoise as the secondary accent, crisp borders, calibrated radii and soft navy-tinted shadows. Gradients and brand artwork are limited to brand moments (dashboard hero, auth panel). The visual references and review checklist are in the `alpha-design` skill (`.claude/skills/alpha-design`). The brand anchors come from `public/branding/` (`#06254e`, `#086bfa`, `#1bc4b4`). The UI is Hebrew RTL, in light and dark themes.

## Structure

Global stylesheets are imported once by `src/app/layout.tsx`, in this cascade order:

```text
src/styles/
├── theme/palette.css        Raw color scales (navy, blue, teal, slate, ink, red, amber). Theme files only.
├── theme/tokens.css         Semantic tokens, light on :root and dark under html[data-theme="dark"]
├── foundation.css           Element defaults, typography, focus, scrollbars, reduced motion, a11y modes
├── components/              One file per shared pattern (each names its React component in a header comment)
│   ├── brand.css            AlphaLogo / AlphaSymbol / Brand
│   ├── buttons.css          .btn and variants
│   ├── surfaces.css         PageHeader, cards, StatCard, grids, profile summary, list toolbar
│   ├── feedback.css         Notices, badges, status pill, EmptyState
│   ├── notifications.css    AlphaToaster (branded Sonner toasts)
│   ├── forms.css            Field, text controls, date, select, autocomplete, checkbox, choice cards, upload, validation
│   ├── data-display.css     DataTable, row action menu, table links
│   ├── navigation.css       AppTabs, step indicator
│   ├── overlays.css         AppModal, Tooltip
│   └── loading.css          Skeletons, animated symbol, AppLoader, LoadingState, fetch and nav indicators
├── layout/shell.css         App shell: floating navigation rail and topbar, scope context strip, mobile drawer, accessibility widget
├── layout/auth.css          Sign-in, registration, invitation and session-timeout pages
└── features/                Refinements for feature screens (management screens, reporting, feedback, payment editor)
```

Styles used by one screen only sit next to it and are imported by the screen (`src/features/dashboard/screens/dashboard-screen.css`, `src/features/reporting/screens/reports-screen.css`).

## Tokens

Two layers: the **palette** holds raw values, and **semantic tokens** decide what each value is for, per theme. Components and features use semantic tokens only, so dark mode needs no extra rules: a component written with tokens is already themed. `npm run check:tokens` rejects raw colors (`#hex`, `rgb()`, `hsl()`), `--palette-*` references and retired token names outside `src/styles/theme`, and any `var(--name)` that is not defined anywhere.

| Group | Tokens | Notes |
| --- | --- | --- |
| Canvas and surfaces | `--color-bg`, `--color-surface`, `-raised`, `-sunken`, `-muted`, `-hover`, `-selected`, `--color-overlay` | `sunken` for table headers, footers and wells; `raised` for menus and popovers |
| Borders | `--color-border`, `-subtle`, `-strong`, `-hover` | |
| Text | `--color-heading`, `--color-text`, `-secondary`, `-muted`, `-placeholder`, `-disabled`, `-inverse` | Body pairs meet WCAG AA in both themes |
| Primary | `--color-primary` (text, icons, borders), `--color-primary-solid` (+`-hover`, `-active`) for fills with `--color-on-primary`, `--color-primary-soft`, `-soft-hover`, `-border` | Never put white text on `--color-primary`; use `-solid` |
| Accent | `--color-accent`, `-solid`, `-soft`, `-border` | Turquoise: positive progress and secondary emphasis |
| Status | `--color-{success,warning,danger,info,neutral}` + `-soft`, `-border`; `-solid` for fills | Same rule as primary: the base token is for text, `-solid` for fills |
| Controls | `--color-control-bg`, `-bg-disabled`, `-border`, `-border-hover`, `--control-height` (44), `-compact` (36), `-dense` (30) | |
| Brand | `--color-brand-navy/-blue/-teal`, `--color-brand-mark` (navy arm and wordmark), `--gradient-brand`, `--gradient-brand-surface`, `--gradient-brand-on-dark` | |
| On brand surfaces | `--color-on-brand`, `-muted`, `-border`, `-fill` | Navy brand panels (auth) |
| Navigation rail | `--nav-bg`, `--nav-border`, `--nav-text`, `-text-strong`, `-label`, `--nav-item-hover`, `-active` | Follows the theme; blue marks only the current location |
| Type | `--font-sans` (Heebo), `--text-2xs` … `--text-4xl` (11–34px), `--weight-*`, `--leading-*`, `--tracking-*` | Use `.num` / `tabular-nums` for figures |
| Space, radius | `--space-0-5` … `--space-16` (4px grid), `--radius-xs` … `--radius-3xl`, `--radius-control`, `-card`, `-modal`, `-full` | |
| Elevation, focus | `--shadow-xs` … `--shadow-xl`, `--shadow-primary`, `--focus-ring`, `--focus-outline` | |
| Motion, layers | `--duration-fast/base/slow`, `--ease-standard`, `--ease-out`; `--z-sticky` … `--z-toast` | |

To add a color: add the raw step to `palette.css` if it is new, then a semantic token in `tokens.css` with both light and dark values. Do not reference the palette from components.

## Components

Use the React component when one exists; otherwise use the CSS class API below. Do not restyle a shared pattern inside a feature unless the change is genuinely specific to that screen.

| Need | Use |
| --- | --- |
| Page title, description, actions | `PageHeader` (`src/components/layout/page-header.tsx`) |
| Card / section | `UiCard` or `<section className="card">` with `.card-head` (`h2` + `span` for the subtitle) |
| Headline figure | `StatCard` (`src/components/ui/stat-card.tsx`), `tone`: blue, teal, navy, amber, neutral; `pending` for metrics without data. Wrap in `.grid.stats` |
| Empty result | `EmptyState` (`src/components/ui/empty-state.tsx`); inside `DataTable` pass `emptyState` text instead (the table supplies the box) |
| Buttons | `.btn` + `.btn-primary` / `-secondary` / `-soft` / `-danger` / `-ghost`; sizes `.btn-lg`, `.btn-sm`; icon-only `.btn-icon` with `aria-label` |
| Status | `.badge` + `.badge-blue` / `-green` / `-teal` / `-orange` / `-red` / `-gray`; `.notice` + `.notice-info` / `-success` / `-warning` / `-error` |
| Forms, tables, dialogs, tabs, tooltips, uploads | `src/components/ui` primitives and `Field`, as before (`scripts/check-ui-primitives.mjs` enforces them) |
| Computed, non-editable value in a form | `<output className="field-readonly">` inside a `.field` with a linked label; never a disabled input |
| List toolbar | `.toolbar` with `.search` (icon + `UiInput`) and a count badge |
| Brand | `Brand` (logo + product line), `AlphaLogo`, `AlphaSymbol` (`src/components/brand`). Add `.brand-inverse` on navy brand panels (not the rail, which follows the theme). The browser icon is `src/app/icon.svg` |
| Toasts | `notify.success/error/info` (`src/components/ui/notifications.tsx`) or `toast` from `sonner`, rendered by the single `AlphaToaster` (`src/components/ui/alpha-toaster.tsx`): a compact ink capsule in both themes (`--color-toast-*`, `--shadow-toast`) that hugs its message on desktop, with a tone-colored status glyph, a quiet close button and the animated Alpha symbol only for loading toasts; RTL, keyboard dismissal, pause on hover. Messages are never truncated; pass `duration: Infinity` for critical errors. Report only what the backend confirmed |

## Loading

| Situation | Pattern |
| --- | --- |
| App bootstrap: session restore, access scope, redirects | `AppLoader` (full screen, animated symbol); used by the shell and `/` |
| Route change | `src/app/**/loading.tsx` re-export `RouteLoading` (`src/features/shell/components/route-loading.tsx`): a page skeleton shaped like the destination inside the shell, `AppLoader` on public pages |
| A screen waiting for its first data | `PageSkeleton` (`variant`: `table`, `dashboard`, `form`) inside `AppShell` |
| Table | `DataTable` `loading` (skeleton rows, `loadingLabel` announced) and `loadingMore`; `TableSkeleton` when the table is not mounted yet |
| Card, profile tab, form | `CardSkeleton`, `FormSkeleton` |
| Dialog body or small panel | `LoadingState` (`compact` for one line) |
| Button or inline action in progress | Disable it, set `aria-busy`, optionally `Spinner` |
| Background refetch or mutation | Automatic: the topbar `FetchIndicator` follows TanStack Query (`useIsFetching`/`useIsMutating`); navigation links show `useLinkStatus` pending state |

Rules: show real loading state only, never an artificial delay. Loaders fade in after a short CSS delay, so fast responses never flash one. Skeletons reserve the final size to avoid layout shift. Pass a Hebrew `label` to standalone skeletons and loaders so screen readers announce them once. For a query that may be disabled, drive loaders with `isLoading` (pending and fetching). All motion stops under `prefers-reduced-motion` and the accessibility menu's motion mode.

## Theme and accessibility behavior

- **Theme:** `src/features/settings/theme-init.ts` runs inline in `<head>` before first paint and resolves the theme exactly as `ThemeProvider` does (the signed-in user's cached preference, else the device's last one, else the OS setting), so dark-mode users never see a light flash. The backend preference still wins once loaded. A new choice applies immediately; if saving it fails, the last saved preference is restored and the settings screen says so. The accessibility-menu modes are restored the same way.
- **Field labels:** text inputs, textareas, date controls and `UiSelect` link themselves to the `<label>` of their `.field` (via `Field` or plain markup) after mount, which gives them an accessible name and makes label clicks focus them. Explicit `aria-label` / `aria-labelledby` win.
- **`UiSelect`:** select-only combobox (`role="combobox"` trigger, `listbox` options, arrows/Home/End/Enter/Space/Escape).
- **`UiAutocomplete`:** editable combobox with the same keys.
- **Floating menus:** `src/components/ui/floating-menu.ts` shares positioning and dismissal across selects, autocompletes and action menus. Panels align to the trigger's RTL end, stay within viewport gutters, open above when needed and scroll when space is limited. Escape dismisses the panel before its parent dialog; menu clicks do not activate a containing table row. Autocomplete selection restores input focus without reopening the list.
- **`AppTabs`:** only the selected tab is in the Tab sequence; Left/Right follow RTL order and Home/End select the first/last tab.
- **`UiActionMenu`:** menu button; opening moves focus to the first item, arrows/Home/End move, Escape or Tab closes and returns focus to the trigger.
- **`AppModal`:** focuses the dialog on open (unless content uses `autoFocus`), keeps Tab inside the top-most dialog, closes on Escape and restores focus to the opener.
- **`Tooltip`:** describes its trigger (`aria-describedby`) and is dismissed with Escape; when it wraps a button or link, that element stays the only tab stop.
- **Mobile drawer:** a modal navigation panel (`role="dialog"`, with the page behind it `inert`): focus moves in on open and Tab stays inside, Escape closes it, and closing by any route (Escape, backdrop, close button, link) returns focus to the menu button.

New overlays must follow the same rules; reuse these primitives rather than adding a headless-UI library.

## Building a screen

```tsx
export default function EmployerAuditScreen() {
  const audit = useEmployerAudit(organizationId, employerId);
  return <AppShell title="יומן פעולות">
    <PageHeader title="יומן פעולות" description="כל הפעולות שבוצעו במעסיק" actions={<button className="btn btn-secondary">ייצוא</button>} />
    {audit.error ? <div className="notice notice-error">{errorMessage(audit.error, "טעינת היומן נכשלה")}</div> : null}
    <section className="card">
      <DataTable items={audit.data ?? []} loading={audit.isPending} loadingLabel="טוען פעולות..."
        emptyState="אין פעולות להצגה" columns={columns} rowKey={(row) => row.id} renderCells={renderCells} />
    </section>
  </AppShell>;
}
```

Checklist: tokens only; logical properties (`inset-inline-start`, `margin-inline-end`) for RTL; `dir="ltr"` on identifiers and amounts that must not reorder; visible focus (`--focus-outline` / `--focus-ring`); check the screen in light, dark and at 390px width.
