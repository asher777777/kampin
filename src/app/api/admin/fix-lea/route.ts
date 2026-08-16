import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function GET() {
  try {
    const snap = await adminDb.collectionGroup("settings").where("miniSiteSlug", "==", "lea").get();
    
    const docs = snap.docs.map(doc => ({
      id: doc.id,
      path: doc.ref.path,
      data: doc.data()
    }));

    // Find ALL settings, just to see what users exist and what their slugs are
    const allSettings = await adminDb.collectionGroup("settings").get();
    const allDocs = allSettings.docs.map(d => ({ path: d.ref.path, slug: d.data().miniSiteSlug }));

    return NextResponse.json({ 
      leaDocs: docs,
      allSlugs: allDocs
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
