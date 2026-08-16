import { auth } from "@/lib/auth";
import DottyChatClient from "./DottyChatClient";
import { adminDb } from "@/lib/firebase-admin";

export default async function DottyPage() {
  const session = await auth();

  const isSuperAdmin = session?.user?.role === "SUPERADMIN";
  const userRole = isSuperAdmin ? "MASTER_ADMIN" : "END_USER";
  const userId = session?.user?.id || null;

  let missingAssetsAgents: any[] = [];
  
  if (isSuperAdmin) {
    const employeesSnap = await adminDb.collection("employees").get();
    employeesSnap.forEach(doc => {
      const data = doc.data();
      // If it is a template/global agent or just an employee missing assets
      if (!data.introVideo || !data.profilePicture || !data.speakingVideo || !data.idleVideo) {
        missingAssetsAgents.push({ id: doc.id, name: data.name || doc.id });
      }
    });
  }

  return (
    <div className="flex flex-col h-screen w-full relative">
      <div className="flex-grow relative">
        <DottyChatClient userRole={userRole} userId={userId} missingAssetsAgents={missingAssetsAgents} />
      </div>
    </div>
  );
}
