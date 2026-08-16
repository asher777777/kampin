import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { auth } from "@/lib/auth";
import { DEFAULT_OFFICE_DATA, SmartOfficeDocument } from "@/lib/types/office";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    if (!slug) {
      return NextResponse.json({ error: "Slug required" }, { status: 400 });
    }

    const docSnap = await adminDb.collection("digital_offices").doc(slug).get();
    if (!docSnap.exists) {
      // Return default schema for this slug if not yet saved in DB
      const initialData: SmartOfficeDocument = {
        ...DEFAULT_OFFICE_DATA,
        id: slug,
        slug: slug,
      };
      return NextResponse.json({ office: initialData, isDefault: true });
    }

    const data = docSnap.data() as SmartOfficeDocument;
    return NextResponse.json({ office: { ...data, id: docSnap.id, slug }, isDefault: false });
  } catch (error: any) {
    console.error("GET /api/office/[slug] error:", error);
    return NextResponse.json({ error: error?.message || "Failed to fetch office" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const session = await auth();

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { officeName, agentName, agentTitle, headerBrand, headerSubtitle, tabs } = body;

    const docRef = adminDb.collection("digital_offices").doc(slug);
    const existingDoc = await docRef.get();

    const updatedData: Partial<SmartOfficeDocument> = {
      slug,
      officeName: officeName || "Agent Office",
      agentName: agentName || "Agent",
      agentTitle: agentTitle || `Check with ${agentName || "Agent"}.`,
      headerBrand: headerBrand || "M.A.M",
      headerSubtitle: headerSubtitle || "Smart digital offices",
      tabs: tabs || [],
      updatedAt: new Date().toISOString(),
    };

    if (!existingDoc.exists) {
      updatedData.ownerId = session.user.id || "admin";
      updatedData.createdAt = new Date().toISOString();
      await docRef.set(updatedData);
    } else {
      await docRef.update(updatedData);
    }

    const savedSnap = await docRef.get();
    return NextResponse.json({ success: true, office: { ...savedSnap.data(), id: slug } });
  } catch (error: any) {
    console.error("POST /api/office/[slug] error:", error);
    return NextResponse.json({ error: error?.message || "Failed to update office" }, { status: 500 });
  }
}
