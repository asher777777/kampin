import { adminDb } from "@/lib/firebase-admin";
import { auth } from "@/lib/auth";
import { AdminControlPanelClient } from "./AdminControlPanelClient";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  let totalUsers = 0;
  let totalContacts = 0;
  let adminName = "מנהל מערכת";
  
  try {
    const session = await auth();
    if (session?.user?.name) {
      adminName = session.user.name;
    }
  } catch (e) {
    console.warn("Could not fetch session name:", e);
  }

  try {
    const usersSnap = await adminDb.collection("users").count().get();
    totalUsers = usersSnap.data().count;
    
    const contactsSnap = await adminDb.collection("contacts").count().get();
    totalContacts = contactsSnap.data().count;
  } catch (e) {
    console.error("Error fetching admin stats:", e);
  }

  return (
    <AdminControlPanelClient 
      initialStats={{
        totalUsers,
        totalContacts,
      }}
      adminName={adminName}
    />
  );
}
