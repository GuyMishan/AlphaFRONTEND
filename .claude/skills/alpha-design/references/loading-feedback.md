# Loading, branded feedback and motion
Informed by Apple HIG feedback principles and Vercel web interface guidelines.

## Toast design
- Reuse the existing toast infrastructure. A compact, restrained Alpha-branded toast may show the **existing Alpha symbol** as a small brand signature, not as a substitute for a semantic success/warning/error icon.
- Success, info, warning and error variants use tokens, distinct text, and proper contrast. No new generated brand art.
- Place for RTL layout without covering primary actions. Keyboard dismissal and pause-on-hover/focus where supported; avoid auto-dismiss for critical or actionable errors.
- Use an accessible announcement strategy: polite for routine confirmation, assertive for urgent errors where appropriate. Avoid duplicate announcements.
- Messages must reflect backend truth: `saved` only after persisted, `submitted` only after acknowledged by Alpha API, never `delivered to clearinghouse` without confirmation.
- Keep toast text concise; show contextual field errors inline; offer retry only if safe and supported.

## Loading taxonomy
- App boot/session restoration: branded but minimal existing-symbol loader, avoid login flash and avoid falsely treating transient network errors as signed-out.
- Page/navigation: maintain stable shell and content-sized skeletons; no full-screen spinner for small query updates.
- Table/filter: preserve prior data when safe, show lightweight progress; avoid layout shifts.
- Button mutation: disable duplicate activation, maintain label width, communicate pending and result.
- Multi-step operations: show truthful progress if measurable; otherwise indeterminate progress, never fake percentages.
- Empty/error/offline: distinguish no records, no matching filters, permission issue, transient service error, and unavailable data.

## Motion
150–250ms is a starting range for subtle UI transitions, not a universal rule. Favor opacity/transform over layout thrashing. No endless pulsing except genuine pending state; honor `prefers-reduced-motion`. Avoid excessive shimmer, confetti, bouncing logos or unnecessary parallax.

## Recovery
On failure preserve form input and selection, provide meaningful next step, and do not imply that a potentially non-idempotent request is safe to retry without checking state.
