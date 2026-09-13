import { Construction } from "lucide-react";
import { AppShell } from "./app-shell";

export function PendingPage({ title, description }: { title: string; description: string }) {
  return <AppShell title={title}><div className="page-head"><div><h1>{title}</h1><p>{description}</p></div></div><section className="card empty"><Construction size={40} /><h2>ממתין לחוזה Backend</h2><p>המסך מוכן בניווט, אך לא יחזיר מידע מדומה לפני שיוגדר endpoint תואם.</p></section></AppShell>;
}
