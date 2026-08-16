import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminSettingsClient } from "./AdminSettingsClient";

export default async function AdminSettingsPage() {
  const session = await auth();
  if (session?.user?.role !== "SUPERADMIN") {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-3xl font-bold text-slate-800 mb-2">הגדרות מערכת ומפתחות API (גלובלי)</h1>
        <p className="text-slate-500">ניהול מפתחות ברירת מחדל שישמשו את המשתמשים במערכת במידה והוגדר להם להשתמש במפתחות מנהל.</p>
      </div>

      <AdminSettingsClient />
    </div>
  );
}
