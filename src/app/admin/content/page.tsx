import { getAllServices } from "@/features/services/actions";
import { ServicesDashboardClient } from "@/app/dashboard/services/ServicesDashboardClient";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AdminContentPage() {
  const session = await auth();
  if (session?.user?.role !== "SUPERADMIN") {
    redirect("/dashboard");
  }

  const services = await getAllServices();

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-3xl font-bold text-slate-800 mb-2">ניהול תוכן וטפסים (האתר הראשי)</h1>
        <p className="text-slate-500">יצירה וניהול של עמודי התוכן, השירותים ודפי הנחיתה המוצגים באתר המרכזי של הפלטפורמה.</p>
      </div>

      <ServicesDashboardClient initialServices={services} />
    </div>
  );
}
