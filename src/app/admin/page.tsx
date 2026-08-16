import { adminDb } from "@/lib/firebase-admin";
import { Users, AlertCircle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  // Fetch some global stats for the SUPERADMIN
  let totalUsers = 0;
  let totalContacts = 0;
  
  try {
    const usersSnap = await adminDb.collection("users").count().get();
    totalUsers = usersSnap.data().count;
    
    const contactsSnap = await adminDb.collection("contacts").count().get();
    totalContacts = contactsSnap.data().count;
  } catch (e) {
    console.error("Error fetching admin stats:", e);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">ברוך הבא ללוח הבקרה למנהלים</h1>
        <p className="text-slate-400">מכאן תוכל לראות נתונים גלובליים על כל המערכת.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-[#0a0a0a] border border-amber-500/20 rounded-[2rem] p-6 flex flex-col gap-4 shadow-xl">
          <div className="flex items-center gap-3 text-amber-500">
            <div className="p-2 bg-amber-500/10 rounded-xl">
              <Users className="w-6 h-6" />
            </div>
            <h2 className="font-semibold text-lg">סה״כ משתמשים (Tenants)</h2>
          </div>
          <p className="text-4xl font-bold text-white">{totalUsers}</p>
        </div>

        <div className="bg-[#0a0a0a] border border-emerald-500/20 rounded-[2rem] p-6 flex flex-col gap-4 shadow-xl">
          <div className="flex items-center gap-3 text-emerald-500">
            <div className="p-2 bg-emerald-500/10 rounded-xl">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h2 className="font-semibold text-lg">סה״כ אנשי קשר (בכל המערכת)</h2>
          </div>
          <p className="text-4xl font-bold text-white">{totalContacts}</p>
        </div>
      </div>
    </div>
  );
}
