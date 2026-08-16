import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { auth } from "@/lib/auth";

const GLOBAL_COLLECTIONS = [
  "contacts",
  "landing_pages",
  "form_templates",
  "communities",
  "automations",
  "emails",
  "expenses",
  "services",
  "posts"
];

export async function GET() {
  try {
    const session = await auth();
    // Only allow ADMIN/SUPERADMIN
    if (session?.user?.role !== "ADMIN" && session?.user?.role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const usersSnap = await adminDb.collection("users").get();
    
    const usersToDelete: string[] = [];
    const logs: string[] = [];
    
    usersSnap.forEach((doc: any) => {
      const data = doc.data();
      // Keep 'ovt5771', 'admin', 'ovt5771@gmail.com' and fallback '1'
      const username = data.username?.toLowerCase() || "";
      if (doc.id !== "1" && username !== "ovt5771" && username !== "admin" && username !== "ovt5771@gmail.com") {
        usersToDelete.push(doc.id);
        logs.push(`Identified user for deletion: ${doc.id} (${username})`);
      }
    });

    if (usersToDelete.length === 0) {
      return NextResponse.json({ message: "No test users found to delete.", logs });
    }

    for (const uid of usersToDelete) {
      logs.push(`Cleaning up data for user ${uid}...`);
      
      for (const col of GLOBAL_COLLECTIONS) {
        const snap = await adminDb.collection(col).where("ownerId", "==", uid).get();
        if (!snap.empty) {
          const batch = adminDb.batch();
          snap.forEach((doc: any) => batch.delete(doc.ref));
          await batch.commit();
          logs.push(`  Deleted ${snap.size} documents from ${col}`);
        }
      }
      
      await adminDb.collection("users").doc(uid).delete();
      logs.push(`  Deleted user record ${uid}`);
    }

    return NextResponse.json({ message: "Cleanup complete!", logs });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
