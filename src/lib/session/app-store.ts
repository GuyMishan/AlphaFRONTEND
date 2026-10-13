import { createStore } from "zustand/vanilla";
import type { Session } from "@/lib/session/types";

/**
 * Shared client state: session presentation metadata and the user's selected
 * organization/employer/employee. Server data (scope, lists, details) belongs in
 * TanStack Query, not here. Persistence is handled by ./storage.
 */

export type EmployerSelection = { organizationId: string; employerId: string };

export type AppStoreState = {
  session: Session | null;
  sessionHydrated: boolean;
  selectedOrganizationId: string | null;
  selectedEmployer: EmployerSelection | null;
  selectedEmployeeId: string | null;
  setSession: (session: Session | null, hydrated?: boolean) => void;
  setOrganizationSelection: (organizationId: string | null) => void;
  setEmployerSelection: (selection: EmployerSelection | null) => void;
  setEmployeeSelection: (employeeId: string | null) => void;
  hydrateBrowserState: (state: {
    session: Session | null;
    selectedOrganizationId: string | null;
    selectedEmployer: EmployerSelection | null;
    selectedEmployeeId: string | null;
  }) => void;
  clearBrowserState: () => void;
};

export const appStore = createStore<AppStoreState>()((set) => ({
  session: null,
  sessionHydrated: false,
  selectedOrganizationId: null,
  selectedEmployer: null,
  selectedEmployeeId: null,
  setSession: (session, hydrated = true) => set({ session, sessionHydrated: hydrated }),
  setOrganizationSelection: (selectedOrganizationId) => set({ selectedOrganizationId }),
  setEmployerSelection: (selectedEmployer) => set({ selectedEmployer }),
  setEmployeeSelection: (selectedEmployeeId) => set({ selectedEmployeeId }),
  hydrateBrowserState: (state) => set({ ...state, sessionHydrated: true }),
  clearBrowserState: () => set({
    session: null,
    sessionHydrated: true,
    selectedOrganizationId: null,
    selectedEmployer: null,
    selectedEmployeeId: null,
  }),
}));
