import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getAllServices } from "@/features/services/actions";

export const dynamic = "force-dynamic";

export default async function AuthRedirect() {
  const session = await auth();
  
  if (!session) {
    redirect("/");
  }

  const role = (session.user as any)?.role;
  
  if (role === "SUPERADMIN") {
    redirect("/admin");
  } else {
    // Direct new and registering users to our live agent onboarding builder path
    redirect("/agentonbord");
  }
}
