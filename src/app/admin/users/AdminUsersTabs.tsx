"use client";

import { useState } from "react";
import { UsersTable } from "@/features/users/components/UsersTable";
import CRMDashboardPage from "@/app/dashboard/crm/page";
import { UserDoc } from "@/features/users/actions";
import { Users, Contact } from "lucide-react";

interface Props {
  initialUsers: UserDoc[];
}

export function AdminUsersTabs({ initialUsers }: Props) {
  const [activeTab, setActiveTab] = useState<"system" | "contacts">("system");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab("system")}
          className={`flex items-center gap-2 px-4 py-2 font-bold transition-colors ${
            activeTab === "system"
              ? "text-amber-500 border-b-2 border-amber-500"
              : "text-slate-400 hover:text-slate-300"
          }`}
        >
          <Users className="w-5 h-5" />
          משתמשי מערכת
        </button>
        <button
          onClick={() => setActiveTab("contacts")}
          className={`flex items-center gap-2 px-4 py-2 font-bold transition-colors ${
            activeTab === "contacts"
              ? "text-amber-500 border-b-2 border-amber-500"
              : "text-slate-400 hover:text-slate-300"
          }`}
        >
          <Contact className="w-5 h-5" />
          אנשי קשר (CRM מנהל)
        </button>
      </div>

      {activeTab === "system" && (
        <UsersTable initialUsers={initialUsers} />
      )}

      {activeTab === "contacts" && (
        <div className="bg-[#111] rounded-2xl overflow-hidden min-h-[70vh] relative">
          <CRMDashboardPage />
        </div>
      )}
    </div>
  );
}
