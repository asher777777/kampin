import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function GET() {
  try {
    const contactsSnap = await adminDb.collection("users").doc("1").collection("contacts").get();
    
    const contacts = contactsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Sort by createdAt or similar if possible
    // contacts might have createdAt or timestamp
    
    return NextResponse.json({ 
      total: contacts.length,
      sample: contacts.slice(0, 5),
      lastCreated: contacts.filter(c => c.createdAt && c.createdAt.includes('2026-06-22')).length
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
