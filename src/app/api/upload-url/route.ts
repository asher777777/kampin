import { NextResponse } from "next/server";
import { adminStorage } from "@/lib/firebase-admin";

export async function POST(req: Request) {
  try {
    const { fileName, contentType } = await req.json();

    if (!fileName) {
      return NextResponse.json({ error: "Missing fileName" }, { status: 400 });
    }

    let bucket;
    try {
      bucket = adminStorage.bucket();
    } catch (e) {
      const projId = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
      if (projId) {
        bucket = adminStorage.bucket(`${projId}.appspot.com`);
      } else {
        throw e;
      }
    }

    const file = bucket.file(`agent_assets/${Date.now()}_${fileName}`);

    // Generate a signed URL for uploading
    const [uploadUrl] = await file.getSignedUrl({
      version: 'v4',
      action: "write",
      expires: Date.now() + 15 * 60 * 1000, // 15 minutes
      contentType: contentType || "application/octet-stream",
    });

    // Generate a signed URL for reading (or assume it's public)
    const [downloadUrl] = await file.getSignedUrl({
      action: "read",
      expires: "01-01-2099",
    });

    return NextResponse.json({ uploadUrl, downloadUrl });
  } catch (error: any) {
    console.error("Error generating signed URL:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
