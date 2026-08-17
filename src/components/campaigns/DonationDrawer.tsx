"use client";

import React, { useState } from "react";
import { X, Heart, CreditCard, Lock, Sparkles, Check } from "lucide-react";
import { recordDonationAction } from "@/features/campaigns/actions";

interface DonationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  campaignId: string;
  ambassadorId?: string | null;
  ambassadorName?: string | null;
  onDonationCompleted?: () => void;
}

export const DonationDrawer: React.FC<DonationDrawerProps> = ({
  isOpen,
  onClose,
  campaignId,
  ambassadorId,
  ambassadorName,
  onDonationCompleted,
}) => {
  const [amount, setAmount] = useState<number | "">(180);
  const [customAmount, setCustomAmount] = useState<string>("");
  const [donorName, setDonorName] = useState("");
  const [dedication, setDedication] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const presetAmounts = [180, 360, 500, 1000];

  const handleSelectPreset = (val: number) => {
    setAmount(val);
    setCustomAmount("");
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomAmount(e.target.value);
    setAmount(e.target.value === "" ? "" : Number(e.target.value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalAmount = Number(amount);
    if (!finalAmount || finalAmount <= 0) {
      setError("אנא בחר סכום תרומה תקין");
      return;
    }

    setLoading(true);
    setError("");

    // Record donation action
    const res = await recordDonationAction({
      campaignId,
      donorName: isAnonymous ? "אנונימי" : (donorName || "אנונימי"),
      amount: finalAmount,
      dedication,
      isAnonymous,
      ambassadorId: ambassadorId || null,
      ambassadorName: ambassadorName || null,
      paymentMethod: "kesher_credit_card",
    });

    setLoading(false);

    if (res.success) {
      setSuccess(true);
      if (onDonationCompleted) {
        onDonationCompleted();
      }
    } else {
      setError(res.error || "שגיאה בביצוע התרומה");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 dir-rtl">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-lg w-full p-6 shadow-2xl relative border border-slate-100 max-h-[90vh] overflow-y-auto">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {!success ? (
          <>
            {/* Header */}
            <div className="text-center space-y-1 mb-4">
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-2">
                <Heart className="w-6 h-6 fill-current" />
              </div>
              <h3 className="text-2xl font-black text-slate-900">תרומה לקמפיין</h3>
              {ambassadorName && (
                <span className="inline-block bg-amber-100 text-amber-900 text-xs font-semibold px-3 py-1 rounded-full">
                  מיועד לשגריר: {ambassadorName}
                </span>
              )}
            </div>

            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-xs font-semibold text-center mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5 text-slate-700 text-sm">
              
              {/* Preset Amounts */}
              <div>
                <label className="block text-xs font-bold mb-2 text-slate-800">בחר סכום תרומה (₪)</label>
                <div className="grid grid-cols-4 gap-2 mb-2">
                  {presetAmounts.map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => handleSelectPreset(val)}
                      className={`py-2.5 rounded-xl font-bold text-sm transition-all border ${
                        amount === val && customAmount === ""
                          ? "bg-emerald-800 text-white border-emerald-800 shadow-md"
                          : "bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      ₪{val}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  placeholder="סכום אחר ב-₪..."
                  value={customAmount}
                  onChange={handleCustomChange}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              {/* Donor Details */}
              <div className="space-y-3 pt-1">
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-800">שם התורם / המשפחה</label>
                  <input
                    type="text"
                    disabled={isAnonymous}
                    value={donorName}
                    onChange={(e) => setDonorName(e.target.value)}
                    placeholder="למשל: משפחת כהן"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none disabled:opacity-50"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isAnonymous"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500 bg-slate-100 border-slate-300 w-4 h-4"
                  />
                  <label htmlFor="isAnonymous" className="text-xs text-slate-700 font-semibold cursor-pointer">
                    תרומה אנונימית (השם לא יוצג ברשימת התורמים)
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-800">הקדשה / ברכה (יופיע בלוח התורמים)</label>
                  <textarea
                    rows={2}
                    value={dedication}
                    onChange={(e) => setDedication(e.target.value)}
                    placeholder="לזכות, לרפואת, או ברכה מכל הלב..."
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* Payment Action */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-xl transition-all shadow-lg shadow-rose-600/30 text-base flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <span>מבצע תרומה...</span>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>תרום עכשיו ₪{Number(amount || 0).toLocaleString()} (Kesher API)</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          </>
        ) : (
          /* Thank You View */
          <div className="text-center space-y-4 py-4 dir-rtl">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
              <Check className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-black text-slate-900">תודה רבה על תרומתך! ❤️</h3>
            <p className="text-sm text-slate-600">
              תרומתך על סך <span className="font-bold text-slate-900">₪{Number(amount).toLocaleString()}</span> התקבלה בהצלחה ותופיע מיידית ברשימת התורמים!
            </p>
            <button
              onClick={() => {
                setSuccess(false);
                onClose();
              }}
              className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl transition-colors text-sm mt-4"
            >
              סגור וצפה בלוח התורמים
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
