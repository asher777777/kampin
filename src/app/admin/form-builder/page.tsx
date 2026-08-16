import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminFormBuilderClient } from "./AdminFormBuilderClient";
import { Wand2 } from "lucide-react";

export default async function AdminFormBuilderPage() {
  const session = await auth();
  if (session?.user?.role !== "SUPERADMIN") {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-gradient-to-br from-yellow-300/20 to-amber-600/20 rounded-2xl border border-amber-500/20">
          <Wand2 className="w-8 h-8 text-amber-500" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-amber-500 mb-1">מחולל הטפסים מבוסס AI (מיכאל)</h1>
          <p className="text-slate-400">צור טפסים חכמים ומותאמים אישית בעזרת מיכאל המחלל והבינה המלאכותית שלנו.</p>
        </div>
      </div>

      <div className="bg-[#0a0a0a] rounded-[2rem] border border-amber-500/20 shadow-xl p-6 min-h-[60vh] relative">
        <AdminFormBuilderClient />
      </div>
    </div>
  );
}
