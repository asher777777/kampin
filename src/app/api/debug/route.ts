import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function GET() {
  try {
    const collections = await adminDb.listCollections();
    const collectionIds = collections.map((c: any) => c.id);

    const pagesRef = adminDb.collection("pages").doc("home");
    const pageSnap = await pagesRef.get();
    const pageExists = pageSnap.exists;
    const pageData = pageExists ? pageSnap.data() : null;

    return NextResponse.json({
      success: true,
      projectId: adminDb.projectId || (adminDb as any)._projectId,
      databaseId: adminDb.databaseId || (adminDb as any)._databaseId,
      collections: collectionIds,
      pageExists,
      pageDataSample: pageData ? Object.keys(pageData) : null,
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message, stack: e.stack });
  }
}
