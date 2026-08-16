import { auth } from "@/lib/auth";
import CRMDashboardPage from "@/app/dashboard/crm/page";
import { redirect } from "next/navigation";

export default async function UsersPage() {
  const session = await auth();
  if (session?.user?.role !== "SUPERADMIN") {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-3xl font-bold text-amber-500 mb-2">ניהול משתמשים ואנשי קשר</h1>
        <p className="text-slate-400">כאן תוכל לנהל את כל אנשי הקשר. אנשי קשר בעלי הרשאות משתמש מסומנים בסמל מיוחד, וניתן לנהל את ההגדרות שלהם מתוך כרטיס איש הקשר.</p>
      </div>

      <div className="bg-[#111] rounded-2xl overflow-hidden min-h-[80vh] relative">
        <CRMDashboardPage />
      </div>
    </div>
  );
}
