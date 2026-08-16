import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    // Fetch saved prompts from Firestore collection
    const snapshot = await adminDb
      .collection("digital_offices")
      .doc(slug)
      .collection("saved_prompts")
      .orderBy("createdAt", "desc")
      .get();

    let prompts: any[] = [];
    if (!snapshot.empty) {
      prompts = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } else {
      // Fallback: check root saved_prompts collection
      const rootSnapshot = await adminDb.collection("saved_prompts").get();
      if (!rootSnapshot.empty) {
        prompts = rootSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
      }
    }

    return NextResponse.json({ success: true, prompts });
  } catch (error: any) {
    console.error("Error fetching saved prompts from Firestore:", error);
    return NextResponse.json({ success: false, prompts: [] }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const body = await req.json();
    const { action, id, prompt } = body;

    const docId = id || prompt?.id || `p_${Date.now()}`;
    const docRef = adminDb.collection("digital_offices").doc(slug).collection("saved_prompts").doc(docId);
    const rootDocRef = adminDb.collection("saved_prompts").doc(docId);

    if (action === "delete") {
      await docRef.delete();
      await rootDocRef.delete();
      return NextResponse.json({ success: true, action: "delete", id: docId });
    }

    const payload = {
      id: docId,
      title: prompt?.title || "Saved Prompt",
      icon: prompt?.icon || "Bookmark",
      promptText: prompt?.promptText || "",
      createdAt: new Date().toISOString(),
    };

    await docRef.set(payload, { merge: true });
    await rootDocRef.set(payload, { merge: true });

    return NextResponse.json({ success: true, action: "save", prompt: payload });
  } catch (error: any) {
    console.error("Error saving prompt to Firestore:", error);
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
  }
}
