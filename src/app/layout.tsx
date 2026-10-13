import type { Metadata } from "next";
import { Heebo } from "next/font/google";
import { Toaster } from "sonner";
import { PersistentAppLayout } from "@/features/shell/components/persistent-app-layout";
import { ThemeProvider } from "@/features/settings/components/theme-provider";
import { themeInitScript } from "@/features/settings/theme-init";
import { QueryProvider } from "@/lib/query/query-provider";
import { ValidationUxBridge } from "@/components/forms/validation-ux-bridge";
import { SessionTimeoutGuard } from "@/features/auth/components/session-timeout-guard";
// Global stylesheets in cascade order (see docs/DESIGN-SYSTEM.md):
// theme tokens → foundation → shared components → app layout → feature refinements.
import "@/styles/theme/palette.css";
import "@/styles/theme/tokens.css";
import "@/styles/foundation.css";
import "@/styles/components/brand.css";
import "@/styles/components/buttons.css";
import "@/styles/components/surfaces.css";
import "@/styles/components/feedback.css";
import "@/styles/components/forms.css";
import "@/styles/components/data-display.css";
import "@/styles/components/navigation.css";
import "@/styles/components/overlays.css";
import "@/styles/components/loading.css";
import "@/styles/layout/shell.css";
import "@/styles/layout/auth.css";
import "@/styles/features/management-screens.css";
import "@/styles/features/reporting.css";
import "@/styles/features/report-feedback.css";
import "@/styles/features/payment-editor.css";

const heebo = Heebo({ subsets: ["hebrew", "latin"], variable: "--font-heebo" });

export const metadata: Metadata = {
  title: "Alpha - תפעול פנסיוני",
  description: "מערכת תפעול ודיווח פנסיוני למעסיקים",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="he" dir="rtl" className={heebo.variable} suppressHydrationWarning>
      <head>
        {/* Applies the saved theme and accessibility modes before first paint (no light flash in dark mode). */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
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
