import { createStore } from "zustand/vanilla";
import type { GlobalScopeContext, Session } from "./types";

export type EmployerSelection = { organizationId: string; employerId: string };

export type AppStoreState = {
  session: Session | null;
  sessionHydrated: boolean;
  scope: GlobalScopeContext | null;
  selectedOrganizationId: string | null;
  selectedEmployer: EmployerSelection | null;
  selectedEmployeeId: string | null;
  setSession: (session: Session | null, hydrated?: boolean) => void;
  setScope: (scope: GlobalScopeContext | null) => void;
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
  scope: null,
  selectedOrganizationId: null,
  selectedEmployer: null,
  selectedEmployeeId: null,
  setSession: (session, hydrated = true) => set({ session, sessionHydrated: hydrated }),
  setScope: (scope) => set({ scope }),
  setOrganizationSelection: (selectedOrganizationId) => set({ selectedOrganizationId }),
  setEmployerSelection: (selectedEmployer) => set({ selectedEmployer }),
  setEmployeeSelection: (selectedEmployeeId) => set({ selectedEmployeeId }),
  hydrateBrowserState: (state) => set({ ...state, sessionHydrated: true }),
  clearBrowserState: () => set({
    session: null,
    sessionHydrated: true,
    scope: null,
    selectedOrganizationId: null,
    selectedEmployer: null,
    selectedEmployeeId: null,
  }),
}));
