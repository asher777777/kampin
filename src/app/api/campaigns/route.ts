import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function GET() {
  try {
    const [campaignsSnap, servicesSnap, landingSnap, postsSnap, pagesSnap] = await Promise.all([
      adminDb.collection("campaigns").get().catch(() => ({ docs: [] })),
      adminDb.collection("services").get().catch(() => ({ docs: [] })),
      adminDb.collection("landing").get().catch(() => ({ docs: [] })),
      adminDb.collection("posts").get().catch(() => ({ docs: [] })),
      adminDb.collection("pages").get().catch(() => ({ docs: [] })),
    ]);

    const items: Array<{
      id: string;
      title: string;
      type: "home" | "campaign" | "landing" | "service" | "post" | "page";
      category: string;
      url?: string;
      targetGoal?: number;
      totalRaised?: number;
    }> = [];

    // 1. Always include Home Page
    items.push({
      id: "home",
      title: "דף הבית הראשי (Home)",
      type: "home",
      category: "עמוד ראשי",
      url: "/",
    });

    // 2. Campaigns
    campaignsSnap.docs.forEach((doc: any) => {
      const data = doc.data();
      items.push({
        id: doc.id,
        title: data.title || data.name || `קמפיין (${doc.id})`,
        type: "campaign",
        category: "קמפיינים",
        url: `/c/${doc.id}`,
        targetGoal: data.targetGoal,
        totalRaised: data.totalRaised,
      });
    });

    // 3. Landing Pages
    landingSnap.docs.forEach((doc: any) => {
      const data = doc.data();
      items.push({
        id: doc.id,
        title: data.title || data.name || `דף נחיתה (${doc.id})`,
        type: "landing",
        category: "דפי נחיתה",
        url: `/landing-pages/${doc.id}`,
      });
    });

    // 4. Services Pages
    servicesSnap.docs.forEach((doc: any) => {
      const data = doc.data();
      items.push({
        id: doc.id,
        title: data.title || data.name || `עמוד שירות (${doc.id})`,
        type: "service",
        category: "עמודי שירות",
        url: `/service/${doc.id}`,
      });
    });

    // 5. Posts / Articles
    postsSnap.docs.forEach((doc: any) => {
      const data = doc.data();
      items.push({
        id: doc.id,
        title: data.title || data.name || `פוסט / מאמר (${doc.id})`,
        type: "post",
        category: "פוסטים ומאמרים",
        url: `/post/${doc.id}`,
      });
    });

    // 6. Custom Pages
    pagesSnap.docs.forEach((doc: any) => {
      const data = doc.data();
      if (doc.id !== "home") {
        items.push({
          id: doc.id,
          title: data.title || data.name || `עמוד (${doc.id})`,
          type: "page",
          category: "עמודים נוספים",
          url: `/${doc.id}`,
        });
      }
    });

    return NextResponse.json({
      success: true,
      items,
      count: items.length,
    });
  } catch (error: any) {
    console.error("Error fetching system pages and campaigns:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch pages" },
      { status: 500 }
    );
  }
}
