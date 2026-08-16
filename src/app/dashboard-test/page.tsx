import { getAllServices } from "@/features/services/actions";
import { adminDb } from "@/lib/firebase-admin";
import { auth } from "@/lib/auth";
import { getGlobalSettings } from "@/features/settings/actions";
import { DashboardClientTest } from "./DashboardClientTest";

async function getUserId(): Promise<string> {
  const session = await auth();
  if (session?.user?.id) {
    return session.user.id;
  }
  throw new Error("Unauthorized");
}

export default async function DashboardPage() {
  const services = await getAllServices();
  const ownerId = await getUserId();
  const session = await auth();
  const userName = session?.user?.name || session?.user?.email?.split('@')[0] || "משתמש";

  // Query CRM stats for current owner
  const [contactCount, totalSpentResult, globalSettings] = await Promise.all([
    adminDb.collection("contacts")
      .where("ownerId", "==", ownerId)
      .where("status", "==", "active")
      .get()
      .then((s: any) => s.size)
      .catch(() => 0),
    adminDb.collection("contacts")
      .where("ownerId", "==", ownerId)
      .where("status", "==", "active")
      .get()
      .then((snap: any) => {
        let sum = 0;
        snap.docs.forEach((doc: any) => {
          sum += doc.data().total_spent || 0;
        });
        return sum;
      })
      .catch(() => 0),
    getGlobalSettings(ownerId)
  ]);

  return (
    <div className="w-full relative min-h-full pt-0 md:pt-8" dir="rtl">
      <div className="max-w-7xl mx-auto">
        <DashboardClientTest
          initialSettings={globalSettings}
          initialServices={services}
          contactCount={contactCount}
          totalSpentResult={totalSpentResult}
          userName={userName}
        />
      </div>
    </div>
  );
}
