# Accessibility and UI quality audit
Inspired by Vercel web-design-guidelines and W3C WCAG 2.2: https://www.w3.org/TR/WCAG22/

- Semantic HTML and accessible names; no clickable divs without keyboard equivalence.
- Visible focus; dialogs and mobile drawers trap focus, restore focus, and support Escape where appropriate.
- Forms: labels, descriptions, `aria-invalid`, connected errors, correct autocomplete; errors not conveyed by color alone.
- Contrast: target WCAG AA for text and essential controls; inspect actual colors in both themes.
- RTL: `dir=rtl` where appropriate, logical CSS properties, bidi isolation for IDs/currency/dates, arrows and directional icons checked.
- Mobile: 320–390px layouts, touch targets, scroll locking for overlays, no clipped action menus, usable horizontally scrolling tables.
- Respect reduced motion, zoom, browser back/forward and deep links.
- Test states: loading, zero, partial, error, unauthorized, stale, success, long names, huge numbers, mixed Hebrew/English, slow network.
- Compare screenshots against both references; preserve authentic Alpha assets and existing behavior.
