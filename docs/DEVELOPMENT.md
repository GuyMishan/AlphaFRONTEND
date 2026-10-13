# Development guide

Practical recipes. Read `docs/ARCHITECTURE.md` first for the why.

## Add a page

1. Create the screen in the owning feature, e.g. `src/features/employers/screens/employer-audit-screen.tsx` (`"use client"`, default export, wrapped in `AppShell`, title through `PageHeader`; see the example in `docs/DESIGN-SYSTEM.md`).
2. Add the route file, which only re-exports it:

```ts
// src/app/employers/[id]/audit/page.tsx
export { default } from "@/features/employers/screens/employer-audit-screen";
```

3. Public (no session) routes must also be listed in `src/features/shell/components/persistent-app-layout.tsx`.

## Add an API endpoint

Add a function to the feature's `api.ts` and its DTOs to `types.ts`. Use the shared client; pass `signal` through for reads.

```ts
// src/features/employers/api.ts
employerAudit: (organizationId: string, employerId: string, signal?: AbortSignal) =>
  apiRequest<EmployerAuditEntry[]>(`${employerPath(organizationId, employerId)}/audit`, { signal }),
```

- Bodies are plain objects (serialized for you); uploads pass a `FormData`; downloads use `apiBlob` + `saveBlob` (`src/lib/download.ts`).
- Endpoint-specific Hebrew wording: `{ messages: { SOME_ERROR_CODE: "..." } }` or `{ fallbackMessage: "..." }`.
- Do not call `fetch` for backend data anywhere else.

## Add a query

Extend the feature's key factory and add a hook in `queries.ts`. Keys start from the feature and the tenant scope.

```ts
export const employerKeys = {
  // ...
  audit: (organizationId: string, employerId: string) =>
    [...employerKeys.detail(organizationId, employerId), "audit"] as const,
};

export function useEmployerAudit(organizationId: string, employerId: string) {
  return useQuery({
    queryKey: employerKeys.audit(organizationId, employerId),
    queryFn: ({ signal }) =>
      employersApi.employerAudit(organizationId, employerId, signal),
    enabled: Boolean(organizationId && employerId),
  });
}
```

In the screen: `const audit = useEmployerAudit(org, employer);` then render `audit.isPending`, `errorMessage(audit.error, "…")` and `audit.data`. For a query that may be disabled, use `isLoading` (pending **and** fetching) for spinners.

## Add a mutation

Wrap the API call in `useMutation` and invalidate what it changes (see `useCreateOrganization`, `invalidateEmployerData`, `invalidateEmployeeData`):

```ts
export function useArchiveEmployer(organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (employerId: string) =>
      employersApi.archiveEmployer(organizationId, employerId),
    onSuccess: () => invalidateEmployerData(queryClient, organizationId),
  });
}
```

Show success/failure in the component (`toast.success(...)`, `toast.error(errorMessage(err, "…"))`). Mutations are never retried automatically.

## Add a form

1. Schema in the feature's `schemas.ts`, composed from `src/lib/forms/zod-rules.ts`, with Hebrew messages. Use `superRefine` for cross-field rules.
2. In the component:

```tsx
const {
  register,
  handleSubmit,
  setError,
  formState: { errors, isSubmitting },
} = useZodForm(employerSchema, { defaultValues });

async function save(values: EmployerInput) {
  try {
    await employersApi.updateEmployer(org, id, values);
    toast.success("נשמר");
  } catch (err) {
    if (!applyServerErrors(err, EMPLOYER_FIELDS, setError))
      toast.error(errorMessage(err, "השמירה נכשלה"));
  }
}

<form
  onSubmit={handleSubmit(save, () => toast.error(INVALID_FORM_MESSAGE))}
  noValidate
>
  <Field label="שם משפטי *" error={errors.legalName?.message}>
    <UiInput {...register("legalName")} />
  </Field>
  <Field label="מספר חברה *" error={errors.registrationNumber?.message}>
    <UiInput
      inputMode="numeric"
      {...digitsOnly(register("registrationNumber"), 10)}
    />
  </Field>
</form>;
```

3. Selects: `<FormSelect control={control} name="type" numeric>` (keeps `UiSelect`'s label in sync). Dates and autocompletes: `Controller` or `setValue` (see `employee-form.tsx`).
4. Add a schema test next to the schema (`schemas.test.ts`).
5. Keep a form in local state instead when it is an edit workspace around sensitive or tightly coupled data (e.g. bank-account editors); share its rules through a schema anyway (`isCompletePaymentAccount`).

Search boxes and filters stay plain `useState` (debounce with `useDebouncedValue`).

## Shared client state

Only cross-screen client state goes into Zustand (`src/lib/session/app-store.ts`): the session's display metadata and the selected organization/employer/employee. Read it with `useAppStore(selector)`; change the selection through `src/lib/session/storage.ts` helpers so it is persisted. Never copy server data into the store.

## Components and styles

- Use `src/components/ui` primitives (`UiInput`, `UiSelect`, `UiAutocomplete`, `UiDateInput`, `UiCheckbox`, `AppModal`, `DataTable`, `AppTabs`, `UiFileUpload`) and `Field`. A component used by one feature stays in that feature; promote it to `src/components` only when two features need it and it has no business logic.
- Follow `docs/DESIGN-SYSTEM.md`: semantic tokens only (`npm run check:tokens` rejects raw colors), `PageHeader` for page titles, `StatCard` / `EmptyState` / the `.btn`, `.card`, `.badge`, `.notice` class APIs for common patterns.
- Shared component styles live in `src/styles/components`, shell and auth layout in `src/styles/layout`, feature refinements in `src/styles/features`; styles for one screen sit next to it and are imported by the screen. Breakpoint rules stay in the same file as the component they adjust. Check a new component in light, dark and at phone width.
- Loading: `PageSkeleton` while a screen resolves its first data, `DataTable`'s `loading` or `TableSkeleton` for lists, `CardSkeleton` / `FormSkeleton` for cards and forms, `LoadingState` in dialogs. Never add artificial delays. A new top-level route folder gets a `loading.tsx` that re-exports `@/features/shell/components/route-loading`.
- Formatting helpers: `src/lib/format` (dates DD/MM/YYYY, months, money). Domain labels belong to the feature (e.g. `src/features/reporting/labels.ts`).

## Before you push

```bash
npm run verify
```

Update `docs/CODEMAP.md` when files or flows move, and this guide or `ARCHITECTURE.md` when a convention changes.
