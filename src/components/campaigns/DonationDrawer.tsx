"use client";

import React, { useState, useEffect } from "react";
import { X, Heart, CreditCard, Lock, Sparkles, Check, Repeat, Calendar, Info } from "lucide-react";
import { recordDonationAction } from "@/features/campaigns/actions";
import { DonationTier } from "@/lib/types/campaign";

interface DonationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  campaignId: string;
  ambassadorId?: string | null;
  ambassadorName?: string | null;
  onDonationCompleted?: () => void;
  configTiers?: DonationTier[];
  configDonationType?: "one_time" | "recurring" | "both";
  configRecurringMonths?: number;
}

export const DonationDrawer: React.FC<DonationDrawerProps> = ({
  isOpen,
  onClose,
  campaignId,
  ambassadorId,
  ambassadorName,
  onDonationCompleted,
  configTiers,
  configDonationType = "both",
  configRecurringMonths = 12,
}) => {
  // Default Tiers matching Image 2
  const defaultTiers: DonationTier[] = [
    { id: "t1", title: "שותף", monthlyAmount: 100, subtitle: "₪100 לחודש ל-12 חודשים", imageShape: "circle" },
    { id: "t2", title: "תומך", monthlyAmount: 180, subtitle: "₪180 לחודש ל-12 חודשים", imageShape: "circle" },
    { id: "t3", title: "ידיד", monthlyAmount: 360, subtitle: "₪360 לחודש ל-12 חודשים", imageShape: "circle", isDefault: true },
    { id: "t4", title: "משפחה", monthlyAmount: 500, subtitle: "₪500 לחודש ל-12 חודשים", imageShape: "circle" },
    { id: "t5", title: "שותף אמת", monthlyAmount: 770, subtitle: "₪770 לחודש ל-12 חודשים", imageShape: "circle" },
    { id: "t6", title: "מייסד", monthlyAmount: 1600, subtitle: "₪1,600 לחודש ל-12 חודשים", imageShape: "circle" },
  ];

  const tiers = configTiers && configTiers.length > 0 ? configTiers : defaultTiers;

  const [donationMode, setDonationMode] = useState<"recurring" | "one_time">(
    configDonationType === "recurring" ? "recurring" : "recurring"
  );

  const defaultTierAmount = tiers.find(t => t.isDefault)?.monthlyAmount || tiers[0]?.monthlyAmount || 360;
  const [selectedTierId, setSelectedTierId] = useState<string>(tiers.find(t => t.isDefault)?.id || tiers[0]?.id || "");
  const [monthlyAmount, setMonthlyAmount] = useState<number | "">(defaultTierAmount);
  const [customAmount, setCustomAmount] = useState<string>("");
  const [months, setMonths] = useState<number>(configRecurringMonths || 12);

  const [donorName, setDonorName] = useState("");
  const [dedication, setDedication] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  // Calculate annual total for standing order
  const currentMonthly = Number(monthlyAmount) || 0;
  const calculatedTotal = donationMode === "recurring" ? currentMonthly * months : currentMonthly;

  const handleSelectTier = (tier: DonationTier) => {
    setSelectedTierId(tier.id);
    setMonthlyAmount(tier.monthlyAmount);
    setCustomAmount("");
  };

  const handleSelectCustomTier = () => {
    setSelectedTierId("custom");
    setMonthlyAmount("");
  };

  const handleCustomInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomAmount(val);
    setMonthlyAmount(val === "" ? "" : Number(val));
    setSelectedTierId("custom");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentMonthly || currentMonthly <= 0) {
      setError("אנא בחר סכום תרומה תקין");
      return;
    }

    setLoading(true);
    setError("");

    // Record donation action with Kesher API CreditType: 10 (recurring) or 1 (one_time)
    const res = await recordDonationAction({
      campaignId,
      donorName: isAnonymous ? "אנונימי" : (donorName || "אנונימי"),
      amount: calculatedTotal,
      monthlyAmount: currentMonthly,
      recurringMonths: donationMode === "recurring" ? months : 1,
      isRecurring: donationMode === "recurring",
      dedication,
      isAnonymous,
      ambassadorId: ambassadorId || null,
      ambassadorName: ambassadorName || null,
      paymentMethod: donationMode === "recurring" ? "kesher_standing_order_creditType_10" : "kesher_credit_card_creditType_1",
      phone,
      email,
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
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 dir-rtl overflow-y-auto">
      <div className="bg-slate-900 text-white rounded-t-3xl sm:rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative border border-slate-700 my-auto">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {!success ? (
          <>
            {/* Header */}
            <div className="text-center space-y-2 mb-6">
              <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-1">
                <Heart className="w-6 h-6 fill-current" />
              </div>
              <h3 className="text-2xl font-black">תרומה לקמפיין</h3>
              {ambassadorName && (
                <span className="inline-block bg-amber-500/20 text-amber-300 text-xs font-semibold px-3 py-1 rounded-full border border-amber-500/30">
                  מיועד לשגריר: {ambassadorName}
                </span>
              )}
            </div>

            {/* Donation Type Selector (Mode Switch: הוראת קבע vs חד פעמי) */}
            {configDonationType === "both" && (
              <div className="flex bg-slate-800 p-1 rounded-2xl mb-6 border border-slate-700">
                <button
                  type="button"
                  onClick={() => setDonationMode("recurring")}
                  className={`flex-1 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 ${
                    donationMode === "recurring"
                      ? "bg-emerald-600 text-white shadow-lg"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Repeat className="w-4 h-4" />
                  <span>הוראת קבע חודשית</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDonationMode("one_time")}
                  className={`flex-1 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 ${
                    donationMode === "one_time"
                      ? "bg-emerald-600 text-white shadow-lg"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  <span>תרומה חד פעמית</span>
                </button>
              </div>
            )}

            {error && (
              <div className="bg-rose-500/20 border border-rose-500/40 text-rose-200 p-3 rounded-xl text-xs font-semibold text-center mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6 text-sm">
              
              {/* Tiers Row with Images/Badges (Matching Image 2) */}
              <div>
                <label className="block text-xs font-bold mb-3 text-slate-300">
                  {donationMode === "recurring" ? "בחר מדרגת תרומה חודשית (הוראת קבע)" : "בחר סכום תרומה"}
                </label>

                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-2">
                  {tiers.map((t) => {
                    const isSelected = selectedTierId === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => handleSelectTier(t)}
                        className={`flex flex-col items-center justify-center p-2 rounded-2xl transition-all border text-center group ${
                          isSelected
                            ? "bg-emerald-800/80 border-emerald-500 shadow-lg shadow-emerald-900/40 scale-105"
                            : "bg-slate-800/70 border-slate-700/80 hover:bg-slate-800 hover:border-slate-600"
                        }`}
                      >
                        {/* Image / Circle Badge */}
                        <div className="w-12 h-12 rounded-full bg-emerald-900/80 border-2 border-emerald-400/60 flex flex-col items-center justify-center mb-1 text-[10px] font-black text-emerald-100 shadow-md group-hover:scale-105 transition-transform overflow-hidden relative">
                          {t.imageSrc ? (
                            <img src={t.imageSrc} alt={t.title} className="w-full h-full object-cover" />
                          ) : (
                            <>
                              <span className="leading-tight text-[11px] font-bold text-white">{t.title}</span>
                              <span className="text-[9px] text-emerald-300">₪{t.monthlyAmount}</span>
                            </>
                          )}
                        </div>

                        <span className="font-bold text-[11px] text-white line-clamp-1">{t.title}</span>
                        <span className="text-[10px] text-slate-400 font-semibold">
                          ₪{t.monthlyAmount}{donationMode === "recurring" ? "/חודש" : ""}
                        </span>
                      </button>
                    );
                  })}

                  {/* Custom Amount Button */}
                  <button
                    type="button"
                    onClick={handleSelectCustomTier}
                    className={`flex flex-col items-center justify-center p-2 rounded-2xl transition-all border text-center ${
                      selectedTierId === "custom"
                        ? "bg-emerald-800/80 border-emerald-500 shadow-lg scale-105"
                        : "bg-slate-800/70 border-slate-700/80 hover:bg-slate-800"
                    }`}
                  >
                    <div className="w-12 h-12 rounded-full bg-sky-900/80 border-2 border-sky-400/60 flex items-center justify-center mb-1 text-[11px] font-bold text-sky-100 shadow-md">
                      סכום אחר
                    </div>
                    <span className="font-bold text-[11px] text-white">אחר</span>
                    <span className="text-[10px] text-slate-400 font-semibold">חופשי</span>
                  </button>
                </div>
              </div>

              {/* Display & Manual Amount Input Box (Matching Image 2 right side) */}
              <div className="bg-slate-800/90 p-4 rounded-2xl border border-slate-700/80 space-y-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  
                  {/* Left Side: Calculated Total */}
                  <div className="text-right">
                    <span className="text-xs font-semibold text-slate-400">
                      {donationMode === "recurring" ? "ממגל ממש מקבלים:" : "סה\"כ לתשלום:"}
                    </span>
                    <div className="text-3xl font-black text-emerald-400 dir-rtl">
                      ₪{calculatedTotal.toLocaleString()}
                    </div>
                    {donationMode === "recurring" && (
                      <span className="text-xs text-slate-400 font-medium">
                        במשך {months} חודשים (₪{currentMonthly}/חודש)
                      </span>
                    )}
                  </div>

                  {/* Right Side: Interactive Monthly Price Input */}
                  <div className="flex flex-col items-end gap-1 w-full sm:w-auto">
                    <label className="text-xs font-bold text-slate-300">תרומתך{donationMode === "recurring" ? " החודשית:" : ":"}</label>
                    <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-2xl font-black text-white dir-ltr">
                      <span className="text-xs text-slate-400 font-bold px-1 border-r border-slate-700 pr-2">₪ ILS</span>
                      <input
                        type="number"
                        min="1"
                        value={monthlyAmount}
                        onChange={handleCustomInputChange}
                        className="w-28 bg-transparent text-right focus:outline-none text-white font-black"
                      />
                    </div>
                  </div>
                </div>

                {/* Summary Banner matching Image 2 */}
                {donationMode === "recurring" && (
                  <div className="bg-emerald-950/60 border border-emerald-600/40 p-3 rounded-xl text-center text-xs text-emerald-200 font-bold">
                    תרומה חודשית בהוראת קבע: ברצוני לתרום ₪{currentMonthly} במשך {months} חודשים (סה"כ: ₪{calculatedTotal.toLocaleString()}.00)
                  </div>
                )}
              </div>

              {/* Donor Details Fields */}
              <div className="space-y-3 pt-2">
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-300">שם התורם / המשפחה</label>
                  <input
                    type="text"
                    disabled={isAnonymous}
                    value={donorName}
                    onChange={(e) => setDonorName(e.target.value)}
                    placeholder="למשל: משפחת כהן"
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none text-white disabled:opacity-40"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isAnonymous"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                    className="rounded text-emerald-500 focus:ring-emerald-500 bg-slate-800 border-slate-700 w-4 h-4"
                  />
                  <label htmlFor="isAnonymous" className="text-xs text-slate-300 font-semibold cursor-pointer">
                    תרומה אנונימית (השם לא יוצג ברשימת התורמים)
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-300">הקדשה / ברכה (יופיע בלוח התורמים)</label>
                  <textarea
                    rows={2}
                    value={dedication}
                    onChange={(e) => setDedication(e.target.value)}
                    placeholder="לזכות, לרפואת, או ברכה מכל הלב..."
                    className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none text-white"
                  />
                </div>
              </div>

              {/* Kesher API Payment Action Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-2xl transition-all shadow-lg shadow-rose-600/40 text-base flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99]"
                >
                  {loading ? (
                    <span>מבצע סליקה מול Kesher API...</span>
                  ) : (
                    <>
                      <Lock className="w-5 h-5" />
                      <span>
                        {donationMode === "recurring"
                          ? `תרום עכשיו ₪${currentMonthly}/חודש בהוראת קבע (Kesher API)`
                          : `תרום עכשיו ₪${calculatedTotal} (Kesher API)`}
                      </span>
                    </>
                  )}
                </button>
              </div>

            </form>
          </>
        ) : (
          /* Thank You View */
          <div className="text-center space-y-4 py-6 dir-rtl">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <Check className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-black text-white">תודה רבה על תרומתך! ❤️</h3>
            <p className="text-sm text-slate-300">
              תרומתך {donationMode === "recurring" ? `בהוראת קבע חודשית בסך ₪${currentMonthly}` : `על סך ₪${calculatedTotal}`} התקבלה בהצלחה ותופיע מיידית ברשימת התורמים!
            </p>
            <button
              onClick={() => {
                setSuccess(false);
                onClose();
              }}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors text-sm mt-4 shadow-lg"
            >
              סגור וצפה בלוח התורמים
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
