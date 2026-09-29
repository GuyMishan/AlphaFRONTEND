"use client";

import { useStore } from "zustand";
import { appStore, type AppStoreState } from "./app-store";

export function useAppStore<T>(selector: (state: AppStoreState) => T): T {
  return useStore(appStore, selector);
}
