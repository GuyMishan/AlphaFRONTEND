import type { Metadata } from "next";
import { Heebo } from "next/font/google";
import { Toaster } from "sonner";
import { NotificationCenter } from "@/components/notifications";
import { PersistentAppLayout } from "@/components/persistent-app-layout";
import { SalaryFileUploadEnhancer } from "@/components/salary-file-upload-enhancer";
import { ThemeProvider } from "@/components/theme-provider";
import { ValidationUxBridge } from "@/components/validation-ux-bridge";
import "./globals.css";
import "./mobile.css";
import "./reporting.css";
import "./report-feedback.css";
import "./payment-editor.css";
import "./notifications.css";
import "./ui-fixes.css";
import "./form-feedback.css";
import "./visual-hotfixes.css";
import "./dark-mode.css";

const heebo = Heebo({ subsets: ["hebrew", "latin"], variable: "--font-heebo" });

export const metadata: Metadata = {
  title: "Alpha | תפעול פנסיוני",
  description: "מערכת תפעול ודיווח פנסיוני למעסיקים",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="he" dir="rtl" suppressHydrationWarning>
      <body className={heebo.variable}>
        <ThemeProvider>
          <PersistentAppLayout>{children}</PersistentAppLayout>
          <Toaster position="top-center" richColors closeButton dir="rtl" duration={4500} />
          <NotificationCenter />
          <ValidationUxBridge />
          <SalaryFileUploadEnhancer />
        </ThemeProvider>
      </body>
    </html>
  );
}
