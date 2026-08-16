import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function GET() {
  try {
    const usersRef = adminDb.collection("users");
    const snapshot = await usersRef.limit(20).get();
    const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return NextResponse.json({ users });
  } catch (e: any) {
    return NextResponse.json({ error: e.message });
  }
}
