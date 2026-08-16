import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function GET() {
  try {
    const snapshot = await adminDb.collection("contacts")
      .orderBy("createdAt", "desc")
      .limit(3)
      .get();
    if (snapshot.empty) return NextResponse.json({ error: "No receipts found" });
    return NextResponse.json(snapshot.docs.map((d: any) => d.data()));
  } catch (err: any) {
    return NextResponse.json({ error: err.message });
  }
}
