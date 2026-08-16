"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/useAuthStore";

export function AuthSync({ session }: { session: any }) {
  const setUser = useAuthStore((s) => s.setUser);

  useEffect(() => {
    if (session?.user) {
      setUser({
        id: session.user.id as string,
        name: session.user.name as string,
        email: session.user.email as string,
        role: session.user.role as any || "USER",
      });
    }
  }, [session, setUser]);

  return null;
}
