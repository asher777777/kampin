import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN" && session?.user?.role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const contactsSnap = await adminDb.collection("contacts").get();
    const logs: string[] = [];
    
    logs.push(`Found ${contactsSnap.size} contacts in global collection.`);

    const batch = adminDb.batch();
    let migratedCount = 0;

    contactsSnap.forEach((doc: any) => {
      const data = doc.data();
      const ownerId = data.ownerId;
      
      if (!ownerId) {
        logs.push(`Skipping contact ${doc.id} - missing ownerId`);
        return;
      }

      // Target subcollection: users/{ownerId}/contacts/{contactId}
      const newRef = adminDb.collection("users").doc(ownerId).collection("contacts").doc(doc.id);
      
      // We set the data in the subcollection
      batch.set(newRef, data);
      
      // And delete from global
      batch.delete(doc.ref);
      
      migratedCount++;
    });

    if (migratedCount > 0) {
      await batch.commit();
      logs.push(`Successfully migrated ${migratedCount} contacts to subcollections.`);
    } else {
      logs.push("No contacts migrated.");
    }

    return NextResponse.json({ message: "Migration complete", logs });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
