import React from "react";
import Link from "next/link";
import { Mail, Plus, Users, Calendar, Eye, AlertCircle } from "lucide-react";
import { getCampaigns } from "@/features/emails/actions";

export const dynamic = "force-dynamic";

export default async function EmailsDashboardPage() {
  const campaigns = await getCampaigns();

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Mail className="w-6 h-6 text-indigo-600" />
            קמפיינים במייל
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            ניהול ושליחת דיוור לרשימות התפוצה מה-CRM
          </p>
        </div>
        <Link
          href="/dashboard/emails/create"
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          קמפיין חדש
        </Link>
      </div>

      {/* Campaigns List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {campaigns.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mb-4">
              <Mail className="w-8 h-8 text-indigo-300" />
            </div>
            <h3 className="text-lg font-medium text-slate-800">אין קמפיינים עדיין</h3>
            <p className="text-slate-500 mt-2 max-w-md">
              צור את הקמפיין הראשון שלך כדי להתחיל לדוור לאנשי הקשר שלך בצורה חכמה ומקצועית.
            </p>
            <Link
              href="/dashboard/emails/create"
              className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-xl font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              צור קמפיין ראשון
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                <tr>
                  <th className="px-6 py-4">נושא הקמפיין</th>
                  <th className="px-6 py-4">סטטוס</th>
                  <th className="px-6 py-4">נמענים</th>
                  <th className="px-6 py-4">פתיחות</th>
                  <th className="px-6 py-4">שגיאות מסירה</th>
                  <th className="px-6 py-4">תאריך שליחה</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {campaigns.map((campaign) => (
                  <tr key={campaign.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-800">
                      {campaign.subject}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                        {campaign.status === "sent" ? "נשלח" : "טיוטה"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-slate-400" />
                        {campaign.recipientsCount}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      <div className="flex items-center gap-1.5 font-medium text-indigo-600">
                        <Eye className="w-4 h-4" />
                        {campaign.opensCount || 0}
                        <span className="text-xs text-slate-400">
                          ({campaign.recipientsCount > 0 ? Math.round(((campaign.opensCount || 0) / campaign.recipientsCount) * 100) : 0}%)
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      <div className={`flex items-center gap-1.5 ${campaign.errorCount && campaign.errorCount > 0 ? 'text-red-600 font-medium' : 'text-slate-400'}`}>
                        <AlertCircle className="w-4 h-4" />
                        {campaign.errorCount || 0}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        {campaign.sentAt
                          ? new Date(campaign.sentAt).toLocaleDateString("he-IL", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "-"}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
