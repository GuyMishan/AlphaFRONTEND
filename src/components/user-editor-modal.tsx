"use client";

import type { ReactNode } from "react";
import { AppModal } from "@/components/app-modal";

export function UserEditorModal({
  title,
  subtitle,
  children,
  actions,
  onClose,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  actions?: ReactNode;
  onClose: () => void;
}) {
  return <AppModal title={title} subtitle={subtitle} onClose={onClose} width="lg" actions={actions}>{children}</AppModal>;
}
