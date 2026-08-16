import { adminDb } from "@/lib/firebase-admin";

export async function DashboardStats() {
  const [userCount, serviceCount] = await Promise.all([
    adminDb.collection("users").get().then((s: any) => s.size).catch(() => 0),
    adminDb.collection("services").get().then((s: any) => s.size).catch(() => 0),
  ]);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4" dir="rtl">
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <p className="text-sm font-medium text-muted-foreground">סה"כ משתמשים</p>
        <p className="text-2xl font-bold">{userCount}</p>
      </div>
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <p className="text-sm font-medium text-muted-foreground">עמודי שירות פעילים</p>
        <p className="text-2xl font-bold">{serviceCount}</p>
      </div>
      {/* Placeholder stats */}
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <p className="text-sm font-medium text-muted-foreground">הכנסות החודש</p>
        <p className="text-2xl font-bold text-success">₪12,450</p>
      </div>
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <p className="text-sm font-medium text-muted-foreground">תקינות מערכת</p>
        <p className="text-2xl font-bold text-primary">תקין לחלוטין</p>
      </div>
    </div>
  );
}
