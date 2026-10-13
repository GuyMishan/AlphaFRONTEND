import type { Metadata } from "next";
import { Heebo } from "next/font/google";
import { Toaster } from "sonner";
import { PersistentAppLayout } from "@/features/shell/components/persistent-app-layout";
import { ThemeProvider } from "@/features/settings/components/theme-provider";
import { QueryProvider } from "@/lib/query/query-provider";
import { ValidationUxBridge } from "@/components/forms/validation-ux-bridge";
import { SessionTimeoutGuard } from "@/features/auth/components/session-timeout-guard";
// Global stylesheets. Order is the cascade: later files refine earlier ones.
import "@/styles/tokens.css";
import "@/styles/base.css";
import "@/styles/responsive.css";
import "@/styles/reporting.css";
import "@/styles/report-feedback.css";
import "@/styles/payment-editor.css";
import "@/styles/component-refinements.css";
import "@/styles/form-validation.css";
import "@/styles/layout-refinements.css";
import "@/styles/dark-theme.css";
import "@/styles/scrollbars-and-selection.css";

const heebo = Heebo({ subsets: ["hebrew", "latin"], variable: "--font-heebo" });

export const metadata: Metadata = {
  title: "Alpha - תפעול פנסיוני",
  description: "מערכת תפעול ודיווח פנסיוני למעסיקים",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="he" dir="rtl" suppressHydrationWarning>
      <body className={heebo.variable}>
        <QueryProvider>
          <ThemeProvider>
            <PersistentAppLayout>{children}</PersistentAppLayout>
            <Toaster position="top-center" richColors closeButton dir="rtl" duration={4500} />
            <ValidationUxBridge />
            <SessionTimeoutGuard />
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
