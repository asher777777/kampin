import { adminDb } from "@/lib/firebase-admin";
import DottyChatClient from "@/app/dotty/DottyChatClient";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function AgentPage({
  params,
}: {
  params: Promise<{ slug: string; agentSlug: string }>;
}) {
  const { slug, agentSlug } = await params;
  const session = await auth();
  const userId = session?.user?.id;

  // Fetch the employee agent from the database
  const agentRef = adminDb.collection("employees").doc(`${slug}_${agentSlug}`);
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
      className="w-full h-full min-h-screen bg-[#000] flex flex-col font-sans"
      dir="rtl"
      lang="he"
    >
      <div className="p-6 flex items-center justify-between z-10 relative bg-black/50 border-b border-amber-500/20 shadow-[0_4px_30px_rgba(245,158,11,0.1)]">
        <h1 className="font-bold text-2xl text-white tracking-wide">
          {agentData?.name || "Agent"}
        </h1>
        <div className="text-sm font-semibold text-amber-500 uppercase tracking-widest bg-amber-500/10 px-4 py-1 rounded-full border border-amber-500/30">
          {agentData?.role}
        </div>
      </div>

      {agentData?.mediaData && (
        <div className="flex justify-center pt-8 bg-gradient-to-b from-black/50 to-black relative z-10">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-amber-400 to-amber-600 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
            <img
              src={agentData.mediaData}
              alt={agentData.name}
              className="relative w-32 h-32 rounded-full object-cover border-2 border-amber-500 shadow-2xl"
            />
          </div>
        </div>
      )}

      <div className="flex-grow relative">
        <DottyChatClient
          officeSlug={slug}
          agentId={`${slug}_${agentSlug}`}
          agentName={agentData?.name}
          userRole={userRole}
          userId={userId || null}
        />
      </div>
    </div>
  );
}
