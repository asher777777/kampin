import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const body = await req.json();
    const { action, collectionName, recordId, recordData } = body;

    if (!recordData && action !== "delete") {
      return NextResponse.json({ error: "Missing recordData" }, { status: 400 });
    }

    const targetCollection = collectionName || (recordData && (recordData["Full Name"] || recordData["Phone"]) ? "users" : "pages");
    const targetDocId = recordId || (recordData && (recordData.ID || recordData.id)) || `rec_${Date.now()}`;

    console.log(`[Database Sync] Action: ${action}, Collection: ${targetCollection}, Doc ID: ${targetDocId}`);

    const docRef = adminDb.collection(targetCollection).doc(targetDocId);

    if (action === "delete") {
      await docRef.delete();
      return NextResponse.json({
        success: true,
        action: "delete",
        message: `Record ${targetDocId} deleted successfully from ${targetCollection}`,
      });
    }

    // Default action: UPDATE / SET
    const updatePayload: Record<string, any> = {
      updatedAt: new Date().toISOString(),
    };

    if (recordData["Full Name"]) updatePayload.name = recordData["Full Name"];
    if (recordData["Email"]) updatePayload.email = recordData["Email"];
    if (recordData["Phone"]) updatePayload.phone = recordData["Phone"];
    if (recordData["Role"]) updatePayload.role = recordData["Role"];
    if (recordData["Collection / Title"]) updatePayload.title = recordData["Collection / Title"];
    if (recordData["Status"]) updatePayload.status = recordData["Status"];
    if (recordData["Amount"]) updatePayload.amount = recordData["Amount"];

    // Preserve any raw fields
    Object.keys(recordData).forEach((key) => {
      if (!updatePayload[key]) updatePayload[key] = recordData[key];
    });

    await docRef.set(updatePayload, { merge: true });

    return NextResponse.json({
      success: true,
      action: "update",
      docId: targetDocId,
      message: `Record ${targetDocId} saved to ${targetCollection} in Firestore database`,
      updatedPayload: updatePayload,
    });
  } catch (error: any) {
    console.error("Error in /api/office/[slug]/update-record:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to persist record in database" },
      { status: 500 }
    );
  }
}
