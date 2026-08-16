"use client";

import { useState, useEffect } from "react";
import { Plus, Settings, Play, Pause, Trash2, Edit } from "lucide-react";
import type { Automation } from "@/lib/automations/engine";
import { createAutomation, deleteAutomation, updateAutomation } from "@/features/automations/actions";
import AutomationBuilder from "@/components/automations/AutomationBuilder";

export default function AutomationsClient({ initialAutomations }: { initialAutomations: Automation[] }) {
  const [automations, setAutomations] = useState<Automation[]>(initialAutomations);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const handleCreate = async () => {
    setIsLoading(true);
    const res = await createAutomation({ name: "אוטומציה חדשה", isActive: false });
    if (res.success && res.id) {
      setEditingId(res.id);
      setIsCreating(true);
      // Reload is handled by revalidatePath in action, but we need to fetch locally or just rely on server component refresh
      window.location.reload(); 
    }
    setIsLoading(false);
  };

  const handleToggleActive = async (auto: Automation) => {
    await updateAutomation(auto.id, { isActive: !auto.isActive });
    setAutomations(prev => prev.map(a => a.id === auto.id ? { ...a, isActive: !auto.isActive } : a));
  };

  const handleDelete = async (id: string) => {
    if (confirm("האם אתה בטוח שברצונך למחוק אוטומציה זו? (ה-Webhook יפסיק לעבוד)")) {
      await deleteAutomation(id);
      setAutomations(prev => prev.filter(a => a.id !== id));
    }
  };

  if (editingId) {
    const auto = automations.find(a => a.id === editingId);
    if (!auto) return null;
    return (
      <AutomationBuilder 
        automation={auto} 
        onClose={() => setEditingId(null)}
        onSave={(updated) => {
          setAutomations(prev => prev.map(a => a.id === updated.id ? updated : a));
          setEditingId(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={handleCreate}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          צור אוטומציה
        </button>
      </div>

      {automations.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-100 shadow-sm">
          <Settings className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-700">אין אוטומציות פעילות</h3>
          <p className="text-slate-500">צור את האוטומציה הראשונה שלך כדי להתחיל לקבל לידים מטפסים חיצוניים.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {automations.map(auto => (
            <div key={auto.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-800 text-lg truncate" title={auto.name}>{auto.name}</h3>
                <span className={`px-2 py-1 rounded-md text-xs font-semibold ${auto.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                  {auto.isActive ? 'פעיל' : 'מושהה'}
                </span>
              </div>
              
              <div className="text-sm text-slate-500 bg-slate-50 p-2 rounded-lg break-all">
                {auto.trigger && auto.trigger.type === 'webhook' && (
                  <>
                    <span className="font-semibold block mb-1">Webhook URL:</span>
                    {origin}/api/webhooks/{auto.trigger.webhookId}
                  </>
                )}
                {auto.trigger && auto.trigger.type === 'form_submission' && (
                  <>
                    <span className="font-semibold block mb-1">טופס פנימי:</span>
                    מזהה טופס: {auto.trigger.formId}
                  </>
                )}
                {auto.trigger && auto.trigger.type === 'specific_time' && (
                  <>
                    <span className="font-semibold block mb-1">שעה קבועה ביום:</span>
                    שעה: {auto.trigger.cronExpression}
                  </>
                )}
                {auto.trigger && auto.trigger.type === 'specific_date' && (
                  <>
                    <span className="font-semibold block mb-1">תאריך מדויק:</span>
                    {auto.trigger.dateIso ? new Date(auto.trigger.dateIso).toLocaleString('he-IL') : 'לא מוגדר'}
                  </>
                )}
              </div>

              <div className="text-sm text-slate-600">
                <strong>פעולות מוגדרות:</strong> {auto.steps.length}
              </div>

              <div className="flex items-center gap-2 mt-auto pt-4 border-t border-slate-100">
                <button 
                  onClick={() => handleToggleActive(auto)}
                  className={`flex-1 flex justify-center items-center gap-1 py-2 rounded-lg text-sm font-medium transition-colors ${auto.isActive ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}
                >
                  {auto.isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  {auto.isActive ? 'השהה' : 'הפעל'}
                </button>
                <button 
                  onClick={() => setEditingId(auto.id)}
                  className="flex-1 flex justify-center items-center gap-1 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-sm font-medium transition-colors"
                >
                  <Edit className="w-4 h-4" />
                  ערוך
                </button>
                <button 
                  onClick={() => handleDelete(auto.id)}
                  className="px-3 py-2 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
