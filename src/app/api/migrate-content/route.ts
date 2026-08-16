import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await auth();
    const adminId = session?.user?.id;
    
    if (!adminId) {
      return NextResponse.json({ error: "Unauthorized - Please login first" }, { status: 401 });
    }
    
    let migrated = 0;
    const collections = ["services", "landing", "posts", "pages", "communities"];
    
    for (const coll of collections) {
      const snap = await adminDb.collection(coll).get();
      for (const doc of snap.docs) {
        const data = doc.data();
        if (data.ownerId !== adminId) {
          await doc.ref.update({ ownerId: adminId });
          migrated++;
        }
      }
    }
    
    // Check if there are any documents in subcollections just in case
    const usersSnap = await adminDb.collection("users").get();
    for (const userDoc of usersSnap.docs) {
      for (const coll of collections) {
        const subSnap = await userDoc.ref.collection(coll).get();
        for (const subDoc of subSnap.docs) {
          const rootDocRef = adminDb.collection(coll).doc(subDoc.id);
          const rootDocSnap = await rootDocRef.get();
          if (!rootDocSnap.exists) {
             const data = subDoc.data();
             data.ownerId = adminId;
             await rootDocRef.set(data);
             migrated++;
          }
        }
      }
    }
    
    return NextResponse.json({ success: true, migrated, newOwnerId: adminId });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
