"use server";

import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function impersonateUser(userId: string) {
  const session = await auth();
  if (session?.user?.role !== "SUPERADMIN") {
    throw new Error("Unauthorized: Only SUPERADMIN can impersonate users.");
  }

  // Set the impersonation cookie
  const cookieStore = await cookies();
  cookieStore.set("impersonated_user_id", userId, { path: "/", httpOnly: true, sameSite: "lax" });
}

export async function stopImpersonating() {
  const session = await auth();
  if (!session?.user) return;

  // Remove the impersonation cookie
  const cookieStore = await cookies();
  cookieStore.delete("impersonated_user_id");
}
