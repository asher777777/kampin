import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const campaignId = searchParams.get("campaignId");
  const contactId = searchParams.get("contactId");

  if (campaignId && contactId) {
    try {
      const db = adminDb;
      const ref = db.collection("campaign_opens").doc(`${campaignId}_${contactId}`);
      
      await ref.set({
        campaignId,
        contactId,
        openedAt: new Date().toISOString(),
      }, { merge: true });
      
    } catch (error) {
      console.error("Failed to track email open:", error);
    }
  }

  // Return a 1x1 transparent GIF
  const pixel = Buffer.from(
    "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
    "base64"
  );

  return new NextResponse(pixel, {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      "Pragma": "no-cache",
      "Expires": "0",
    },
  });
}
