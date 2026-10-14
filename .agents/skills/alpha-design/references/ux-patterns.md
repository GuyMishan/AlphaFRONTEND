# Alpha UX patterns — informed by UI UX Pro Max and Vercel interface guidance
Sources: https://github.com/nextlevelbuilder/ui-ux-pro-max-skill and https://github.com/vercel-labs/agent-skills

## Financial and pension tasks
- Show employer identity and reporting period prominently; avoid ambiguous context switches.
- Format ILS, dates, percentages and identifiers consistently with locale-aware formatting and bidi isolation. Never lose numeric precision or silently round financial values.
- Display workflow status as both text and semantic visual treatment. Separate drafted, validated, submitted, accepted, rejected, and unknown states according to **actual backend semantics**; never invent state transitions.
- Clearly distinguish validation, submission, processing, and final external acknowledgment. Show correlation/reference IDs only when available.
- For destructive actions or irreversible reporting, use explicit scope, consequence, and confirmation; disable double submit while preserving recovery options.

## Tables
- Dense but breathable; sticky headers/actions only if they remain usable in RTL and horizontal scroll.
- Sorting must expose direction; filters show active state, reset, and empty results. Pagination and row actions remain keyboard accessible.
- Important amounts use tabular figures and clear currency units. Preserve column meaning in responsive layout; avoid hiding critical compliance data without a way to reveal it.
- Prefer existing table implementation; do not add a table library without need.

## Forms
- Visible labels, clear required/optional rules, field-level error tied to inputs, summary for multi-field failures when needed.
- Keep entered data after failed submissions; focus first relevant error; validate at useful moments rather than flashing errors on every keystroke.
- Distinguish draft-save vs final-submit; show dirty-state warnings when warranted. Don't use success styling before server confirmation.

## Content
- Clear, plain Hebrew. No fake metrics, invented legal requirements or generic marketing filler in operational screens.
- Empty states explain what is absent and the next useful action. Permission-denied, unavailable and zero-results are distinct.
