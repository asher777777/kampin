import { auth } from "@/lib/auth";
import { adminDb } from "@/lib/firebase-admin";
import { SmartOfficeClient } from "@/components/office/SmartOfficeClient";
import { DEFAULT_OFFICE_DATA, SmartOfficeDocument } from "@/lib/types/office";
import { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const docSnap = await adminDb.collection("digital_offices").doc(slug).get();
    if (docSnap.exists) {
      const data = docSnap.data();
      return {
        title: `${data?.officeName || data?.companyName || "Smart Office"} | M.A.M`,
      };
    }
  } catch (e) {}
  return { title: "Smart Office | M.A.M" };
}

export default async function OfficePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth();
  const userId = session?.user?.id || null;

  let officeData: SmartOfficeDocument | null = null;
  try {
    const officeDoc = await adminDb
      .collection("digital_offices")
      .doc(slug)
      .get();

    if (officeDoc.exists) {
      officeData = { ...officeDoc.data(), id: slug, slug } as SmartOfficeDocument;
    }
  } catch (error) {
    console.error("Failed to load office from DB", error);
  }

  // Fallback to default office schema if not yet customized in DB
  if (!officeData) {
    officeData = {
      ...DEFAULT_OFFICE_DATA,
      id: slug,
      slug: slug,
    };
  }

  // Determine role based on ownership
  const isOwner = userId && officeData?.ownerId === userId;
  const isSuperAdmin = session?.user?.role === "SUPERADMIN" || session?.user?.role === "ADMIN";
  const userRole = isSuperAdmin
    ? "MASTER_ADMIN"
    : isOwner
      ? "MANAGER"
      : "END_USER";

  return (
    <SmartOfficeClient
      initialOffice={officeData}
      userRole={userRole}
      userId={userId}
    />
  );
}
