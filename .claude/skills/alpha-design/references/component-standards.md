# Component standards — informed by Vercel React Best Practices
Upstream: https://github.com/vercel-labs/agent-skills/tree/main/skills/react-best-practices

## Design system first
Inventory existing shared primitives and CSS tokens before editing. Prefer extending them with variants over creating lookalike feature-local buttons, cards, inputs, status badges, dialogs, toasts or loaders. Don't centralize components with only one meaningful consumer unless the abstraction is justified.

## Separation of concerns
- `app/` route boundaries; shared visual primitives in existing UI/shared location; feature-specific composition in `features/<feature>/`; server-state hooks near features; theme tokens in existing theme layer. Actual repo conventions take precedence.
- UI primitives should not fetch backend data or know pension domain rules. Domain components may compose primitives and consume typed data.
- Prefer explicit props, typed variants, slots/children when useful, stable accessible APIs, and minimal dependencies.
- Use existing icon library and Alpha brand components. Never ship a new icon set or replace logo assets for stylistic consistency.

## Performance and React
- Avoid fetch waterfalls; keep unrelated queries independent and cache via existing TanStack Query conventions.
- Minimize client components; preserve server/client boundaries, suspense/loading behavior, and lazy-load heavy charts where justified.
- Avoid unnecessary global state and effects for derived values; stabilize expensive work only when measured.
- Preserve code-splitting, image sizing, hydration safety, and theme initialization.

## Variants and states
Each shared component needs documented variants and state behavior: default, hover, focus-visible, active, disabled, pending, invalid, and theme adaptations as applicable. A11y semantics are part of its public contract. Use existing test patterns for interactive components.

## No-regression rule
No wholesale library replacement, no new token framework, no arbitrary CSS resets, no migration of sensitive forms or state management as part of a visual request. Do not change business logic, API payloads, validation, auth or financial calculations.
