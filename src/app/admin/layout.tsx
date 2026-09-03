import { signOut } from "@/lib/auth";
import { AdminLayoutClient } from "./AdminLayoutClient";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminLayoutClient
      signOutAction={async () => {
        "use server";
        await signOut();
      }}
    >
      {children}
    </AdminLayoutClient>
  );
}
