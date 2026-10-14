# Visual craft — informed by Anthropic frontend-design
Source reviewed: https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md

## Intentionality before code
Identify the job-to-be-done and the dominant information in the view. Produce a compact design direction (hierarchy, typography, spacing, palette, density). Critique it for template-like decisions before coding. A pension employer dashboard should communicate trust, precision, and progress, not marketing spectacle.

## Hierarchy and layout
- One primary focal point per screen; don't put every section in an identical rounded card.
- Align headers, controls, charts, and table baselines on a consistent grid; respect RTL reading order.
- Establish 3 levels of text hierarchy with purposeful weight and size; use the existing Hebrew-capable font and verify glyph rendering.
- Use whitespace to separate concepts; borders and dividers only where they convey structure.
- Prefer realistic content density: finance users need scannable numbers, not oversized decorative whitespace.
- Gradients belong in limited brand moments, not every card; translucent effects should be limited to stable surfaces and have a solid fallback.

## Craft pass
Inspect screenshots at 1440, 1024, 768, and 390 widths in both themes; check actual Hebrew copy, clipping, line wrapping, contrast, and chart labels. Remove one unnecessary decoration per screen. Ensure empty and error states are as designed as the ideal state.

## Motion
Use interaction-driven feedback, not repeated entrance choreography. A single deliberate transition is better than animation on every component. Honor reduced motion.
