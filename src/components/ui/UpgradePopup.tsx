"use client";

import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Sparkles, MessageCircle } from "lucide-react";
import { useState } from "react";

export function UpgradePopup({ isOpen, onClose, message }: { isOpen: boolean; onClose: () => void; message: string }) {
  const [showForm, setShowForm] = useState(false);

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <Modal.Content className="max-w-md rounded-[2rem] p-6 text-right">
        <Modal.Close className="left-4 right-auto" />
        
        {!showForm ? (
          <div className="space-y-6 text-center mt-4">
            <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-slate-800">שדרג למשתמש פרו</h2>
            <p className="text-slate-600 font-medium px-4">
              {message || "כדי להמשיך להשתמש בתכונה זו, עליך לשדרג את חשבונך למשתמש פרו ולהסיר את כל ההגבלות."}
            </p>
            
            <div className="bg-slate-50 p-4 rounded-xl text-right space-y-2 mt-4 text-sm border">
              <h3 className="font-bold text-slate-800">מה מקבלים בפרו?</h3>
              <ul className="list-disc list-inside text-slate-600 space-y-1">
                <li>אנשי קשר ללא הגבלה ב-CRM</li>
                <li>דפי נחיתה ושירותים ללא הגבלה</li>
                <li>שימוש מלא בכל תכונות ה-AI</li>
                <li>אפשרות סליקה מתקדמת (קשר)</li>
                <li>טפסים חכמים ללא הגבלה</li>
              </ul>
            </div>

            <div className="flex gap-3 justify-center mt-6">
              <Button onClick={() => setShowForm(true)} className="bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 px-6 font-bold shadow-md hover:shadow-lg transition-all">
                צור קשר לשדרוג עכשיו
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 text-right mt-2">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-indigo-600" />
              טופס פנייה לשדרוג
            </h2>
            <p className="text-sm text-slate-500">
              השאר את פרטיך ונציג יחזור אליך בהקדם האפשרי עם פרטים על מסלול פרו.
            </p>
            
            <div className="space-y-3 mt-4">
              <input type="text" placeholder="שם מלא" className="w-full bg-slate-50 border rounded-xl p-3 outline-none focus:ring-2 ring-indigo-500/20" />
              <input type="tel" placeholder="מספר טלפון" className="w-full bg-slate-50 border rounded-xl p-3 outline-none focus:ring-2 ring-indigo-500/20" />
              <textarea placeholder="הערות (אופציונלי)" rows={3} className="w-full bg-slate-50 border rounded-xl p-3 outline-none focus:ring-2 ring-indigo-500/20 resize-none"></textarea>
            </div>
            
            <div className="flex gap-3 justify-end mt-4">
              <Button onClick={() => setShowForm(false)} variant="outline" className="rounded-xl">חזור</Button>
              <Button onClick={() => {
                alert("פנייתך נשלחה בהצלחה! נציג יחזור אליך בקרוב.");
                onClose();
              }} className="bg-indigo-600 text-white rounded-xl">
                שלח פנייה
              </Button>
            </div>
          </div>
        )}
      </Modal.Content>
    </Modal>
  );
}
