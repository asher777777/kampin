"use client";

import React, { useState } from "react";
import { X, Sparkles, Share2, Copy, Check, Target, Globe, ImageIcon, Trash2 } from "lucide-react";
import { createAmbassadorAction } from "@/features/campaigns/actions";
import { ImageUpload } from "@/components/ui/ImageUpload";

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
  const [leaderName, setLeaderName] = useState("");
  const [targetGoal, setTargetGoal] = useState<number | "">(5000);
  const [message, setMessage] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [customSlug, setCustomSlug] = useState("");
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
      setError("אנא מלא את שם הקהילה וסכום היעד");
      return;
    }

    setLoading(true);
    setError("");

    const res = await createAmbassadorAction({
      campaignId,
      name,
      leaderName: leaderName.trim() || undefined,
      targetGoal: Number(targetGoal),
      message,
      gallery: imageUrl ? [imageUrl] : [],
      customSlug: customSlug.trim() || undefined,
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
      setError(res.error || "שגיאה ביצירת קהילה");
    }
  };

  const getShareUrl = () => {
    if (!createdAmbassador) return "";
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}/${createdAmbassador.slug}`;
  };

  const handleCopyLink = () => {
    const url = getShareUrl();
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsAppShare = () => {
    const url = getShareUrl();
    const text = encodeURIComponent(`שלום! פתחתי עמוד קהילה ויעד אישי בקמפיין: ${url}\nאשמח מאוד לתמיכה ולשותפות שלך!`);
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 dir-rtl">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl relative border border-slate-100 flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
        
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
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto mb-2 shadow-xs">
                <Target className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-black text-slate-900">הקמת קהילה חדשה ויעד אישי</h3>
              <p className="text-xs text-slate-500">קבל עמוד קמפיין וקהילה ייעודי עם קישור אישי לשיתוף עם מכרים ותורמים</p>
            </div>

            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-xs font-semibold text-center">
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4 text-slate-700 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-800">שם הקהילה / קבוצה *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (!customSlug) {
                        // Auto suggest slug if empty
                        const slugCandidate = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "");
                        if (slugCandidate) setCustomSlug(slugCandidate);
                      }
                    }}
                    placeholder="למשל: קהילת חב&quot;ד חיפה"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-none text-slate-900 font-semibold text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-800">שם מוביל הקהילה</label>
                  <input
                    type="text"
                    value={leaderName}
                    onChange={(e) => setLeaderName(e.target.value)}
                    placeholder="למשל: דניאל כהן"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-none text-slate-900 text-xs"
                  />
                </div>
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
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-none text-slate-900 font-black text-base"
                />
              </div>

              {/* Community Vision & Message */}
              <div>
                <label className="block text-xs font-bold mb-1 text-slate-800">חזון הקהילה / מסר לתורמים</label>
                <textarea
                  rows={2}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="החזון שלנו: יחד נגיע ליעד ונגדיל את הפעילות החשובה..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-none text-slate-900 text-xs"
                />
              </div>

              {/* Photo Upload for Community Leader */}
              <div>
                <label className="block text-xs font-bold mb-1 text-slate-800 flex items-center justify-between">
                  <span>תמונת מוביל הקהילה / תמונה מייצגת</span>
                  <span className="text-[10px] text-slate-400 font-normal">יופיע בהירו ובעמוד הקהילה</span>
                </label>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <ImageUpload
                      currentImage={imageUrl}
                      onSelect={(url) => setImageUrl(url)}
                    />
                  </div>
                  {imageUrl && (
                    <button
                      type="button"
                      onClick={() => setImageUrl("")}
                      className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                      title="הסר תמונה"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Custom English Slug */}
              <div>
                <label className="block text-xs font-bold mb-1 text-slate-800 flex items-center justify-between">
                  <span>כתובת מותאמת אישית לעמוד (באנגלית בלבד)</span>
                  <span className="text-[10px] text-slate-400 font-mono">letters, numbers, dash</span>
                </label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={customSlug}
                    onChange={(e) => {
                      const formatted = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "");
                      setCustomSlug(formatted);
                    }}
                    placeholder="e.g. cohen-family, beit-chabad"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-none text-slate-900 font-mono text-xs text-left"
                    dir="ltr"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1 font-mono text-left truncate" dir="ltr">
                  Preview: /<span className="text-emerald-700 font-bold">{customSlug || "custom-slug"}</span>
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1 text-slate-600">טלפון ליצירת קשר</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="050-0000000"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none font-mono"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 text-slate-600">דוא"ל (רשות)</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none text-left"
                    dir="ltr"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl transition-colors shadow-lg shadow-emerald-700/20 text-sm flex items-center justify-center gap-2 mt-2 cursor-pointer"
              >
                {loading ? (
                  <span>יוצר עמוד קהילה...</span>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>צור את עמוד הקהילה שלי</span>
                  </>
                )}
              </button>
            </form>
          </>
        ) : (
          /* Success & Share View */
          <div className="text-center space-y-4 py-2">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto shadow-xs">
              <Check className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-black text-slate-900">מזל טוב! עמוד הקהילה שלך מוכן 🎉</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              עמוד מוביל הקהילה של <span className="font-bold text-slate-900">{createdAmbassador.name}</span> הוקם בהצלחה עם יעד של ₪{createdAmbassador.targetGoal.toLocaleString()}.
            </p>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs font-mono break-all text-slate-700 select-all" dir="ltr">
              {getShareUrl()}
            </div>

            <div className="flex flex-col gap-2.5 pt-2">
              <button
                onClick={handleWhatsAppShare}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 text-sm shadow-md cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
                <span>שתף ב-WhatsApp</span>
              </button>

              <button
                onClick={handleCopyLink}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 text-xs border border-slate-200 cursor-pointer"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? "הקישור הועתק!" : "העתק קישור לעמוד האישי"}</span>
              </button>

              <button
                onClick={() => {
                  window.location.href = `/${createdAmbassador.slug}`;
                }}
                className="text-xs text-emerald-800 font-bold underline pt-2 cursor-pointer"
              >
                עבור לעמוד הקהילה שלי עכשיו
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

