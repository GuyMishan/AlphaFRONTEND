---
name: alpha-design
description: Design, implement, refine, or audit Alpha's Hebrew RTL Next.js frontend using its established Apple-inspired light/dark visual language, existing brand assets, reusable components, accessibility, and high-quality interactions. Use for UI/UX work, dashboards, tables, forms, feedback, and loading states.
---
# Alpha Design — visual and interaction authority

## Non-negotiable identity
- Alpha is a trustworthy, precise Israeli pension-operations SaaS, not an Apple product. Apple HIG is inspiration, never a claim of compliance or a license to reproduce Apple trade dress.
- **Preserve the repository's existing Alpha logo, symbol, favicon, icon set, icon mappings, and brand assets.** Never redraw, replace, generate or recolor brand artwork without authorization. Toasts may use the existing symbol discreetly.
- Use `assets/alpha-light-reference.png` and `assets/alpha-dark-reference.png` as visual-direction references, **not literal layouts, business data, functionality, or assets to copy into the UI**. Their sample names, charts, metrics, dates, and counts are fictitious.
- Preserve brand navy `#06254e`, blue `#086bfa`, turquoise `#1bc4b4` as brand anchors; existing repo tokens and contrast/accessibility requirements decide actual UI values. Never introduce a second token system.
- Hebrew RTL is the primary layout; preserve bidi-safe numbers, dates, currency, IDs, and keyboard behavior.

## Source-aware workflow
1. Inspect the current repo first: `src/styles/theme/palette.css`, `tokens.css`, shared UI components, feature modules, docs, icon assets, current dependencies, and test commands. Paths are hints; verify before relying on them.
2. Read only the relevant reference file(s):
   - `references/visual-craft.md` for composition, typography, visual direction and critique.
   - `references/apple-hig.md` for Apple-inspired principles, surfaces, hierarchy and dark mode.
   - `references/ux-patterns.md` for pension workflow UX, financial data and edge cases.
   - `references/component-standards.md` for shared component boundaries, tokens and modularity.
   - `references/loading-feedback.md` for branded toasts, skeletons, loading, progress and errors.
   - `references/accessibility-quality.md` for audits, focus, semantics and regression QA.
3. Briefly state the current design-system primitives to reuse, the screens/components affected, and the visual plan. Avoid generic card-kit layouts and ornamental gradients.
4. Implement the smallest cohesive changes. Prefer existing primitives; only extract shared components for genuine reuse. Do not rewrite architecture or add dependencies by default.
5. Verify light/dark, desktop/mobile, keyboard, Hebrew, reduced-motion, and real data states; run available project checks. Report tested vs not tested honestly.

## Visual signature
- Quiet macOS-inspired premium productivity: clear hierarchy, intentional whitespace, restrained translucency, crisp edges, soft shadows, calibrated radii, subtle blue highlights and highly legible financial content.
- Light: luminous neutral surfaces, very subtle cool tints, crisp borders, understated depth. Dark: deep navy/graphite layered surfaces, distinct elevated surfaces, low-glare text, restrained electric-blue accents. Avoid pure black on everything and excessive blur.
- Hero artwork only when useful; preserve existing brand assets. Don't generate a new Alpha letterform. A finance dashboard prioritizes meaningful information over spectacle.
- 4/8-point spacing rhythm as a starting convention, not a license to overwrite existing tokens. Typography must support Hebrew; don't assume SF Pro renders Hebrew appropriately.
- Semantic status colors must be accessible and never rely on color alone. Keep numeric data readable with tabular digits and bidi isolation.

## Architecture and safety
- Preserve existing Next.js/React/TypeScript, TanStack Query, Zustand, React Hook Form/Zod, API contracts, auth/session logic, business validation, and established styles.
- Reuse shared primitives for Button, Input, Select, Card, Modal, Drawer, Toast, Skeleton, EmptyState, ErrorState, Table and page layout; feature-specific composition remains within its feature.
- Do not invent production metrics, employers, statuses, clearinghouse integrations, or regulatory behavior. Mockups are illustrative only.
- No commit, push, merge, deployment, dependency installation or destructive refactor without explicit permission.

## Completion checklist
- Same brand logo/icon assets? Both themes? RTL and LTR fragments? Focus trap/return and keyboard access? Accessible errors and labels? Responsive financial tables? Loading/empty/error/success/partial states? No misleading success toasts? Motion reduced? No new duplicate primitives or raw color sprawl? No changed business behavior? Tests/build reported?

## Provenance
See `SOURCES.md` in the package root. Reference documents here are **original Alpha-specific syntheses**, informed by inspected upstream project documentation, not verbatim copies of their skills. The upstream repositories are linked for optional separate installation and updates.
