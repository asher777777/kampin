import { auth } from "@/lib/auth";
import { KesherManualReceiptsForm } from "@/features/kesher/KesherManualReceiptsForm";
import { redirect } from "next/navigation";

export default async function AdminReceiptsPage() {
  const session = await auth();
  if (session?.user?.role !== "SUPERADMIN") {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-3xl font-bold text-amber-500 mb-2">הפקת קבלות ידנית (קשר)</h1>
        <p className="text-slate-400">באפשרותך להפיק קבלות ידניות שיירשמו תחת מערכת קשר וישויכו לאנשי הקשר שלך.</p>
      </div>

      <div className="bg-[#0a0a0a] rounded-[2rem] border border-amber-500/20 shadow-xl p-6 min-h-[60vh] relative">
        <KesherManualReceiptsForm />
      </div>
    </div>
  );
}
