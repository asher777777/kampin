import { adminDb } from "@/lib/firebase-admin";

export async function RecentActivity() {
  let recentServices: any[] = [];
  
  try {
    const snapshot = await adminDb.collection("services")
      .limit(10)
      .get();

    recentServices = snapshot.docs.map((doc: any) => {
      const data = doc.data();
      return { 
        id: doc.id, 
        title: data.hero?.title || doc.id,
        updatedAt: data.updatedAt || new Date().toISOString()
      };
    });

    // Sort by updatedAt descending
    recentServices.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    // Limit to top 5
    recentServices = recentServices.slice(0, 5);
  } catch (error) {
    console.warn("Failed to fetch recent activity:", (error as Error).message);
  }

  return (
    <div className="rounded-xl border bg-card shadow-sm" dir="rtl">
      <div className="p-6">
        <h3 className="text-lg font-semibold">פעילות אחרונה</h3>
        <p className="text-sm text-muted-foreground">השינויים האחרונים שבוצעו במערכת.</p>
      </div>
      <div className="border-t">
        {recentServices.length > 0 ? (
          <ul className="divide-y">
            {recentServices.map((service) => (
              <li key={service.id} className="flex items-center p-4 hover:bg-muted/50 transition-colors justify-between">
                <div className="flex-1 text-right">
                  <p className="text-sm font-medium text-primary">עודכן עמוד: {service.title}</p>
                  <p className="text-xs text-muted-foreground">כתובת: /service/{service.id}</p>
                </div>
                <time className="text-xs text-muted-foreground mr-4">
                  {new Date(service.updatedAt).toLocaleDateString("he-IL", {
                    day: "numeric",
                    month: "numeric",
                    hour: "2-digit",
                    minute: "2-digit"
                  })}
                </time>
              </li>
            ))}
          </ul>
        ) : (
          <div className="p-8 text-center text-sm text-muted-foreground">
            לא נמצאה פעילות אחרונה במערכת.
          </div>
        )}
      </div>
    </div>
  );
}
