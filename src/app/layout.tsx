import type { Metadata } from "next";
import { Heebo } from "next/font/google";
import "./globals.css";
import "./mobile.css";
import "./reporting.css";

const heebo = Heebo({ subsets: ["hebrew", "latin"], variable: "--font-heebo" });

export const metadata: Metadata = {
  title: "Alpha | תפעול פנסיוני",
  description: "מערכת תפעול ודיווח פנסיוני למעסיקים",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="he" dir="rtl">
      <body className={heebo.variable}>{children}</body>
    </html>
  );
}
