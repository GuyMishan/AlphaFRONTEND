# Apple-inspired HIG translation for Alpha web
Official: https://developer.apple.com/design/human-interface-guidelines/
Principles: https://developer.apple.com/design/human-interface-guidelines/design-principles/

Apple's principles include purpose, agency, responsibility, familiarity, flexibility, simplicity, craft, and delight. Translate them to the web rather than imitating native system UI verbatim.

- **Purpose:** make pension actions and their consequences understandable at a glance.
- **Agency:** clear navigation, reversible safe actions, explicit confirmations for irreversible or financial operations, persistent context.
- **Responsibility:** honest submission/payment states; don't imply actual clearinghouse transmission when only simulated.
- **Familiarity:** stable sidebar, predictable dialogs, familiar table/filter patterns, no hidden essential actions.
- **Flexibility:** mobile layouts, keyboard use, zoom, RTL, reduced motion, screen readers.
- **Simplicity:** show the next action and the reason for blocking it; progressive disclosure for complexity.
- **Craft/delight:** precision, restraint, responsive feedback and reliable recovery rather than decorative effects.

## Surface language
Light: soft neutral canvas, white/near-white elevated content, gentle cool-tinted edges, modest shadows. Dark: graphite/navy canvas, distinguishable raised surfaces, cool subtle borders, no low-contrast grey-on-grey. Maintain distinct states for hover, active, selected, disabled, and focus.

## Material and blur
Only use translucent/backdrop effects on appropriate shell elements, never as a default for long forms/tables. Respect browser support and contrast; do not blur scrolling financial content unnecessarily.

## Navigation
Right-side RTL sidebar desktop; mobile drawer with focus management and correct Escape behavior. Search and profile menus should have clear affordances. Never mimic macOS traffic-light window controls.

## Theme
Use existing theme tokens, preserve prepaint theme initialization to avoid flash, respect user preference. Check semantic contrast and chart distinguishability in both themes. Do not hardcode theme-specific color values in feature files.
