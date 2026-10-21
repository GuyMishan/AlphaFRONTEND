# Feedback treatment integration audit — 2026-10-21

## Scope

Reviewed the path from the DB-backed four-mode treatment policy to the feedback resolution context and generic modal; correction-workspace guards; document attachment ownership; the existing report wizard's embedded mode; manufacturer inquiry send path; and relevant regression tests.

## Verified by code inspection

1. The UI obtains `treatmentChoice`, action flags and `correctionTarget` from the backend. No dedicated code-18 editor remains.
2. Internal correction endpoint checks the persisted DB treatment flag and the existing domain playbook before creating any workspace. Manufacturer external-case endpoint separately checks the persisted inquiry flag.
3. Existing employee, employer and deposit editors are reused, not reimplemented.
4. Document repairs targeted to `documents` open the existing report wizard from the generic modal. They do not upload to the employer library as a substitute for attachment to a report.
5. The report wizard hides its final transmission action while embedded; correction is saved as an editable draft, with actual transmission performed through the normal reports flow.
6. Document feedback with unambiguous original-report/product references uses the existing negative-report wizard flow. Missing or inconsistent source references block editing rather than choosing an arbitrary product. Official feedback remains unresolved pending subsequent producer/clearinghouse feedback.
7. Manufacturer e-mail subject and base body remain server-owned; extra user text is appended. Test routing is server-controlled.

## Gaps requiring scenario-level verification

- A stored `correctionFields` value is not yet interpreted to autofocus a particular document-type upload control. The editor performs document-type selection and validations as it normally does.
- For document issues without a supported source/workspace, the UI surfaces the error and refuses to mutate transmitted evidence. There is no universal generic upload widget, by design.
- Document requirements for negative reports must be tested individually (e.g., collective agreement, employee approval, employer declaration) with actual mapped products, feedback and attachments. An existing attachment in a library is not proof that it was transmitted with the correct report.
- Report-level feedback with multiple products needs smoke tests covering simultaneous corrections and prevention of duplicate negative movements.
- Legacy branches inside `feedback-internal-correction-resolver.tsx` and some decision messages still contain business-code-specific descriptions. They are not separate code-specific modal editors but should be transitioned to DB-backed guidance in a further cleanup.
- Browser-based E2E exercises across all 101 codes were not performed in this change. Source audit and CI are not proof of actual producer acceptance.

## Verification sources

Frontend `npm run verify` is run by repository CI on main. Backend CI restores/builds and executes its integration test suite. Results must be checked on the final head commits before declaring green.
