import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { runAutomation } from "@/lib/automations/engine";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ webhookId: string }> }
) {
  try {
    const { webhookId } = await params;
    
    // Parse the incoming payload
    let payload = {};
    const contentType = request.headers.get("content-type") || "";
    
    if (contentType.includes("application/json")) {
      payload = await request.json();
    } else if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const obj: Record<string, any> = {};
      formData.forEach((value, key) => {
        obj[key] = value;
      });
      payload = obj;
    }

    // Find the webhook in Firestore
    const webhooksRef = adminDb.collection("webhooks");
    const snapshot = await webhooksRef.where("webhookId", "==", webhookId).limit(1).get();

    if (snapshot.empty) {
      return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
    }

    const webhookDoc = snapshot.docs[0];
    const { automationId } = webhookDoc.data();

    // Run the automation engine asynchronously so we don't block the response
    // Using void to intentionally not await it to prevent timeouts on the sender's end
    void runAutomation(automationId, payload);

    return NextResponse.json({ success: true, message: "Webhook received and processing started." });
  } catch (error: any) {
    console.error("Webhook Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ webhookId: string }> }
) {
  // Same logic for GET (usually used for simple pings or webhooks sending data in query params)
  try {
    const { webhookId } = await params;
    const url = new URL(request.url);
    
    const payload: Record<string, string> = {};
    url.searchParams.forEach((value, key) => {
      payload[key] = value;
    });

    const webhooksRef = adminDb.collection("webhooks");
    const snapshot = await webhooksRef.where("webhookId", "==", webhookId).limit(1).get();

    if (snapshot.empty) {
      return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
    }

    const webhookDoc = snapshot.docs[0];
    const { automationId } = webhookDoc.data();

    void runAutomation(automationId, payload);

    return NextResponse.json({ success: true, message: "Webhook received and processing started." });
  } catch (error: any) {
    console.error("Webhook GET Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
