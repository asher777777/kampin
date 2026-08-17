"use client";

import React, { useState } from "react";
import { X, Sparkles, Share2, Copy, Check, Target, Heart } from "lucide-react";
import { createAmbassadorAction } from "@/features/campaigns/actions";

interface AmbassadorModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaignId: string;
  onAmbassadorCreated?: (ambassador: any) => void;
}

export const AmbassadorModal: React.FC<AmbassadorModalProps> = ({
  isOpen,
  onClose,
  campaignId,
  onAmbassadorCreated,
}) => {
  const [name, setName] = useState("");
  const [targetGoal, setTargetGoal] = useState<number | "">(5000);
  const [message, setMessage] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [createdAmbassador, setCreatedAmbassador] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !targetGoal) {
      setError("אנא מלא את השם וסכום היעד");
      return;
    }

    setLoading(true);
    setError("");

    const res = await createAmbassadorAction({
      campaignId,
      name,
      targetGoal: Number(targetGoal),
      message,
      phone,
      email,
    });

    setLoading(false);

    if (res.success && res.ambassador) {
      setCreatedAmbassador(res.ambassador);
      if (onAmbassadorCreated) {
        onAmbassadorCreated(res.ambassador);
      }
    } else {
      setError(res.error || "שגיאה ביצירת יעד אישי");
    }
  };

  const getShareUrl = () => {
    if (!createdAmbassador) return "";
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}/c/${campaignId}/${createdAmbassador.slug}`;
  };

  const handleCopyLink = () => {
    const url = getShareUrl();
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsAppShare = () => {
    const url = getShareUrl();
    const text = encodeURIComponent(`שלום! פתחתי יעד אישי בקמפיין הגיוס: ${url}\nאשמח לתמיכה ולעזרה שלך!`);
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 dir-rtl">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative border border-slate-100 flex flex-col gap-5">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {!createdAmbassador ? (
          <>
            {/* Header */}
            <div className="text-center space-y-1">
              <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-2">
                <Target className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-black text-slate-900">צור יעד אישי (הפוך לשגריר)</h3>
              <p className="text-xs text-slate-500">קבל עמוד קמפיין אישי עם קישור ייחודי לשיתוף עם מכרים ותורמים</p>
            </div>

            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-xs font-semibold text-center">
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4 text-slate-700 text-sm">
              <div>
                <label className="block text-xs font-bold mb-1 text-slate-800">שם מלא או שם הקבוצה *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="למשל: משפחת כהן / ניצן"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-none text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1 text-slate-800">סכום היעד האישי (₪) *</label>
                <input
                  type="number"
                  required
                  min="100"
                  value={targetGoal}
                  onChange={(e) => setTargetGoal(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="5000"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-none text-slate-900 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1 text-slate-800">הודעה / מסר אישי לתורמים</label>
                <textarea
                  rows={2}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="הצטרפו אליי לתמיכה בקמפיין החשוב הזה..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-none text-slate-900 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1 text-slate-600">טלפון ליצירת קשר</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="050-0000000"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 text-slate-600">דוא"ל (רשות)</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl transition-colors shadow-lg shadow-emerald-700/20 text-sm flex items-center justify-center gap-2 mt-2"
              >
                {loading ? (
                  <span>יוצר עמוד שגריר...</span>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>צור את העמוד האישי שלי</span>
                  </>
                )}
              </button>
            </form>
          </>
        ) : (
          /* Success & Share View */
          <div className="text-center space-y-4 py-2">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto">
              <Check className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-black text-slate-900">מזל טוב! עמוד השגריר מוכן 🎉</h3>
            <p className="text-xs text-slate-600">
              העמוד האישי של <span className="font-bold text-slate-900">{createdAmbassador.name}</span> הוקם בהצלחה עם יעד של ₪{createdAmbassador.targetGoal.toLocaleString()}.
            </p>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs font-mono break-all text-slate-700 select-all">
              {getShareUrl()}
            </div>

            <div className="flex flex-col gap-2.5 pt-2">
              <button
                onClick={handleWhatsAppShare}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 text-sm shadow-md"
              >
                <Share2 className="w-4 h-4" />
                <span>שתף ב-WhatsApp</span>
              </button>

              <button
                onClick={handleCopyLink}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 text-xs border border-slate-200"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? "הקישור הועתק!" : "העתק קישור לעמוד האישי"}</span>
              </button>

              <button
                onClick={() => {
                  window.location.href = `/c/${campaignId}/${createdAmbassador.slug}`;
                }}
                className="text-xs text-emerald-800 font-bold underline pt-2"
              >
                עבור לעמוד השגריר שלי עכשיו
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
