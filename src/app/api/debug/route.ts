import { NextResponse } from "next/server";
import { adminDb, firebaseAdminInitError } from "@/lib/firebase-admin";

export async function GET() {
  try {
    const pagesRef = adminDb.collection("pages").doc("home");
    const pageSnap = await pagesRef.get();
    const pageExists = pageSnap.exists;
    const pageData = pageExists ? pageSnap.data() : null;

    const mediaSnap = await adminDb.collection("media").limit(10).get();
    const mediaItems = mediaSnap.docs ? mediaSnap.docs.map((d: any) => ({ id: d.id, ...d.data() })) : [];

    return NextResponse.json({
      success: true,
      firebaseAdminInitError,
      pageExists,
      pageVideoGallery: pageData?.videoGallery,
      mediaCount: mediaItems.length,
      mediaItems,
    });
  } catch (e: any) {
    return NextResponse.json({ 
      success: false, 
      firebaseAdminInitError, 
      error: e.message, 
      stack: e.stack 
    });
  }
}
