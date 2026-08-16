import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { DEFAULT_SMART_WORKER_CONFIG, SmartWorkerConfig } from "@/lib/types/office";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const docRef = adminDb.collection("digital_offices").doc(slug);
    const docSnap = await docRef.get();

    if (docSnap.exists) {
      const data = docSnap.data();
      if (data?.smartWorkerConfig) {
        return NextResponse.json({
          success: true,
          slug,
          smartWorkerConfig: data.smartWorkerConfig,
        });
      }
    }

    return NextResponse.json({
      success: true,
      slug,
      smartWorkerConfig: DEFAULT_SMART_WORKER_CONFIG,
    });
  } catch (error: any) {
    console.error("GET /api/office/[slug]/settings error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch smart worker config" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const body = await req.json();
    const { smartWorkerConfig } = body;

    if (!smartWorkerConfig) {
      return NextResponse.json({ error: "Missing smartWorkerConfig" }, { status: 400 });
    }

    const docRef = adminDb.collection("digital_offices").doc(slug);
    
    // Save under schema header root\{slug}\smart_worker_config
    await docRef.set(
      {
        smartWorkerConfig,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    // Also persist in subcollection root\{slug}\settings\smart_worker_config for strict schema isolation
    await docRef
      .collection("settings")
      .doc("smart_worker_config")
      .set({
        schemaHeader: `root\\${slug}\\smart_worker_config`,
        ...smartWorkerConfig,
        updatedAt: new Date().toISOString(),
      });

    return NextResponse.json({
      success: true,
      message: "Smart Worker settings & permission matrix saved successfully.",
      schemaHeader: `root\\${slug}\\smart_worker_config`,
      smartWorkerConfig,
    });
  } catch (error: any) {
    console.error("POST /api/office/[slug]/settings error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to save smart worker config" },
      { status: 500 }
    );
  }
}
