import { adminDb } from "@/lib/firebase-admin";
import DottyChatClient from "@/app/dotty/DottyChatClient";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function EmployeePage({
  params,
}: {
  params: Promise<{ slug: string; employeeSlug: string }>;
}) {
  const { slug, employeeSlug } = await params;
  const session = await auth();
  const userId = session?.user?.id;

  // Fetch the employee agent from the database
  const agentRef = adminDb
    .collection("employees")
    .doc(`${slug}_${employeeSlug}`);
  const agentSnap = await agentRef.get();

  if (!agentSnap.exists) {
    return notFound();
  }

  const agentData = agentSnap.data();

  // Determine if the current user is the owner of the office
  const officeRef = adminDb.collection("digital_offices").doc(slug);
  const officeSnap = await officeRef.get();
  let isOwner = false;

  if (officeSnap.exists && userId) {
    if (officeSnap.data()?.ownerId === userId) {
      isOwner = true;
    }
  }

  const isSuperAdmin = session?.user?.role === "SUPERADMIN";
  const userRole = isSuperAdmin
    ? "MASTER_ADMIN"
    : isOwner
      ? "MANAGER"
      : "END_USER";

  // Render a customized version of DottyChatClient for the agent.

  return (
    <div
      className="w-full h-full min-h-screen bg-[#070D1D] flex flex-col font-sans relative overflow-hidden"
      dir="rtl"
      lang="he"
    >
      {/* Top Bar: AMM Hexagon Badge */}
      <div className="p-4 flex items-center justify-center z-20 relative bg-[#070D1D]/90 border-b border-[#D4AF37]/20 shadow-[0_4px_30px_rgba(212,175,55,0.05)] backdrop-blur-md">
        <div className="text-[#D4AF37] font-bold tracking-[0.2em] text-sm flex items-center gap-3">
          <div className="w-5 h-5 border-[1.5px] border-[#D4AF37] rotate-45 flex items-center justify-center">
            <div className="w-2 h-2 bg-[#D4AF37] rotate-45"></div>
          </div>
          AMM SYSTEM
        </div>
      </div>

      <div className="flex-grow relative flex flex-col">
        {/* Background Overlay */}
        <div className="absolute inset-0 z-0 bg-gradient-to-b from-[#070D1D]/50 to-[#070D1D] pointer-events-none"></div>

        {/* Central Agent View */}
        {agentData?.mediaData && (
          <div className="absolute top-32 left-1/2 -translate-x-1/2 z-10">
            <div className="relative group">
              {/* Idle Pulse Effect */}
              <div className="absolute -inset-2 bg-[#D4AF37] rounded-full blur-xl opacity-20 animate-pulse transition duration-1000"></div>
              <img
                src={agentData.mediaData}
                alt={agentData.name}
                className="relative w-40 h-40 rounded-full object-cover border-[2px] border-[#D4AF37]/80 shadow-[0_0_30px_rgba(212,175,55,0.2)]"
              />
            </div>
          </div>
        )}

        <div className="flex-grow relative z-20 mt-48">
          <DottyChatClient
            officeSlug={slug}
            agentId={`${slug}_${employeeSlug}`}
            agentName={agentData?.name}
            userRole={userRole}
            userId={userId || null}
          />
        </div>
      </div>
    </div>
  );
}
