"use client";

import React, { useState } from "react";
import { X, Heart, CreditCard, Lock, Check, Repeat, Calendar, User, ArrowRight, ShieldCheck, FileText, Loader2 } from "lucide-react";
import { recordPendingDonationAction, completeDonationAction, failDonationAction, recordDonationAction } from "@/features/campaigns/actions";
import { DonationTier } from "@/lib/types/campaign";
import { CampaignTiersList, defaultTiers } from "./CampaignTiersList";

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
  initialSelectedTierId?: string;
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
  initialSelectedTierId,
}) => {
  const tiers = configTiers && configTiers.length > 0 ? configTiers : defaultTiers;

  const [step, setStep] = useState<"details" | "payment" | "success">("details");

  const [donationMode, setDonationMode] = useState<"recurring" | "one_time">(
    configDonationType === "recurring" ? "recurring" : "recurring"
  );

  const defaultTierAmount = tiers.find(t => t.isDefault)?.monthlyAmount || tiers[0]?.monthlyAmount || 360;
  const [selectedTierId, setSelectedTierId] = useState<string>(initialSelectedTierId || tiers.find(t => t.isDefault)?.id || tiers[0]?.id || "");
  const [monthlyAmount, setMonthlyAmount] = useState<number | "">(defaultTierAmount);
  const [customAmount, setCustomAmount] = useState<string>("");
  const [months, setMonths] = useState<number>(configRecurringMonths || 12);

  React.useEffect(() => {
    if (isOpen && initialSelectedTierId) {
      if (initialSelectedTierId === "custom") {
        setSelectedTierId("custom");
        setMonthlyAmount("");
      } else {
        const t = tiers.find(x => x.id === initialSelectedTierId);
        if (t) {
          setSelectedTierId(t.id);
          setMonthlyAmount(t.monthlyAmount);
          setCustomAmount("");
        }
      }
    }
  }, [isOpen, initialSelectedTierId, tiers]);

  // Donor Details with Autofill
  const [donorName, setDonorName] = useState("");
  const [dedication, setDedication] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);

  // Payment Method Selection (for one-time donations)
  const [paymentMethodType, setPaymentMethodType] = useState<"credit_card" | "bit" | "google_pay">("credit_card");
  const [iframeUrl, setIframeUrl] = useState<string>("");

  // Load saved donor info from localStorage for instant autofill
  React.useEffect(() => {
    if (isOpen) {
      try {
        const saved = localStorage.getItem("kampin_donor_info");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.donorName && !donorName) setDonorName(parsed.donorName);
          if (parsed.phone && !phone) setPhone(parsed.phone);
          if (parsed.email && !email) setEmail(parsed.email);
        }
      } catch (e) {}
    }
  }, [isOpen]);

  // Pending donation tracking
  const [pendingDonationId, setPendingDonationId] = useState("");
  const [pendingContactId, setPendingContactId] = useState("");

  // Credit Card Details with Autofill
  const [ccData, setCcData] = useState({
    creditNumber: "",
    expiryMonth: "",
    expiryYear: "",
    cvv2: "",
    idNumber: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [receiptUrl, setReceiptUrl] = useState("");

  if (!isOpen) return null;

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

  // Save donor details to localStorage on proceed
  const saveDonorToLocalStorage = () => {
    try {
      localStorage.setItem("kampin_donor_info", JSON.stringify({ donorName, phone, email }));
    } catch (e) {}
  };

  // STEP 1: Record pending donor details in CRM & DB when proceeding to payment
  const handleProceedToPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentMonthly || currentMonthly <= 0) {
      setError("אנא בחר סכום תרומה תקין");
      return;
    }
    if (!donorName.trim() && !isAnonymous) {
      setError("אנא הזן את שם התורם או סמן 'תרומה אנונימית'");
      return;
    }
    if (!phone.trim()) {
      setError("אנא הזן מספר טלפון ליצירת קשר וקבלת אישור סליקה");
      return;
    }
    setError("");
    setLoading(true);
    saveDonorToLocalStorage();

    try {
      const selectedTierObj = tiers.find(t => t.id === selectedTierId);
      const res = await recordPendingDonationAction({
        campaignId,
        donorName: isAnonymous ? "אנונימי" : donorName,
        amount: calculatedTotal,
        monthlyAmount: donationMode === "recurring" ? currentMonthly : undefined,
        recurringMonths: donationMode === "recurring" ? months : 1,
        isRecurring: donationMode === "recurring",
        tier: selectedTierObj?.title || (selectedTierId === "custom" ? "סכום אישי" : ""),
        dedication,
        isAnonymous,
        ambassadorId: ambassadorId || null,
        ambassadorName: ambassadorName || null,
        phone,
        email,
      });

      if (res.success) {
        if (res.donationId) setPendingDonationId(res.donationId);
        if (res.contactId) setPendingContactId(res.contactId);
        setStep("payment");
      } else {
        setError(res.error || "שגיאה ברישום פרטי התורם במערכת");
      }
    } catch (err: any) {
      console.error("Error creating pending donation:", err);
      // Even if network warning, allow proceeding to payment
      setStep("payment");
    } finally {
      setLoading(false);
    }
  };

  // Launch Digital Wallet (Bit or Google Pay / Apple Pay) via Kesher LinkToken
  const handlePayWithDigitalWallet = async (walletType: "bit" | "google_pay") => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/kesher/get-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: calculatedTotal,
          clientName: isAnonymous ? "אנונימי" : (donorName || "תורם קמפיין"),
          phone,
          email,
          details: `תרומה בקמפיין - ${walletType === "bit" ? "ביט" : "Google Pay"}`,
          transactionId: pendingDonationId || `Donation-${campaignId}-${Date.now()}`,
          installments: 1,
        }),
      });

      const data = await res.json();
      if (data.success && data.iframeUrl) {
        setIframeUrl(data.iframeUrl);
      } else {
        setError(data.error || "שגיאה בהפקת קישור לתשלום דיגיטלי מול קשר");
      }
    } catch (err: any) {
      console.error("Digital wallet error:", err);
      setError(err.message || "שגיאת תקשורת עם שרתי קשר");
    } finally {
      setLoading(false);
    }
  };


  // STEP 2: Process Kesher payment and complete donation upon success
  const handleProcessPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const cleanCC = ccData.creditNumber.replace(/\D/g, "");
    if (!cleanCC || cleanCC.length < 8) {
      setError("אנא הזן מספר כרטיס אשראי תקין");
      return;
    }
    if (!ccData.expiryMonth || !ccData.expiryYear) {
      setError("אנא בחר תוקף כרטיס (חודש ושנה)");
      return;
    }
    if (!ccData.cvv2 || ccData.cvv2.length < 3) {
      setError("אנא הזן 3 או 4 ספרות ביקורת (CVV בגב הכרטיס)");
      return;
    }

    setLoading(true);

    try {
      const expiry = `${ccData.expiryMonth.padStart(2, "0")}${ccData.expiryYear.padStart(2, "0")}`; // MMYY
      const isRecurring = donationMode === "recurring";
      const amountToCharge = isRecurring ? currentMonthly : calculatedTotal;

      const res = await fetch("/api/kesher/send-transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: amountToCharge,
          creditNumber: cleanCC,
          expiry,
          cvv2: ccData.cvv2,
          clientName: isAnonymous ? "אנונימי" : (donorName || "תורם קמפיין"),
          phone,
          email,
          id: ccData.idNumber,
          transactionId: `Donation-${campaignId}-${Date.now()}`,
          installments: isRecurring ? months : 1,
          paymentFrequency: isRecurring ? "recurring" : "one-time",
        }),
      });

      const data = await res.json();
      console.log("Kesher payment response:", data);

      if (data.success || data.code === 499 || data.code === 0) {
        const tranNum = data.transactionId || data.CompanyTranId || data.NumTransaction || "";
        const pdf = data.receiptUrl || data.pdfUrl || "";
        
        setTransactionId(tranNum);
        setReceiptUrl(pdf);

        // Complete donation in Firestore & CRM (Atomically adds to campaign totalRaised & donorCount!)
        if (pendingDonationId) {
          await completeDonationAction({
            campaignId,
            donationId: pendingDonationId,
            contactId: pendingContactId,
            amount: calculatedTotal,
            monthlyAmount: isRecurring ? currentMonthly : undefined,
            recurringMonths: isRecurring ? months : 1,
            isRecurring,
            dedication,
            isAnonymous,
            ambassadorId: ambassadorId || null,
            ambassadorName: ambassadorName || null,
            transactionId: tranNum,
            receiptUrl: pdf,
            paymentMethod: isRecurring ? "kesher_standing_order_creditType_10" : "kesher_credit_card_creditType_1",
            donorName: isAnonymous ? "אנונימי" : donorName,
            phone,
            email,
          });
        } else {
          // Fallback direct record if pending ID not present
          await recordDonationAction({
            campaignId,
            donorName: isAnonymous ? "אנונימי" : (donorName || "אנונימי"),
            amount: calculatedTotal,
            monthlyAmount: isRecurring ? currentMonthly : undefined,
            recurringMonths: isRecurring ? months : 1,
            isRecurring,
            dedication,
            isAnonymous,
            ambassadorId: ambassadorId || null,
            ambassadorName: ambassadorName || null,
            transactionId: tranNum,
            receiptUrl: pdf,
            paymentMethod: isRecurring ? "kesher_standing_order_creditType_10" : "kesher_credit_card_creditType_1",
            phone,
            email,
          });
        }

        setStep("success");
        if (onDonationCompleted) {
          onDonationCompleted();
        }
      } else {
        const errorMsg = data.error || "שגיאה בביצוע התשלום בכרטיס האשראי. אנא ודא את פרטי הכרטיס ונסה שנית.";
        setError(errorMsg);

        // Record failure in pending donation & CRM
        if (pendingDonationId) {
          await failDonationAction({
            campaignId,
            donationId: pendingDonationId,
            contactId: pendingContactId,
            error: errorMsg,
          });
        }
      }
    } catch (err: any) {
      console.error("Payment error:", err);
      const errorMsg = err.message || "שגיאת תקשורת עם שרתי הסליקה";
      setError(errorMsg);

      if (pendingDonationId) {
        await failDonationAction({
          campaignId,
          donationId: pendingDonationId,
          contactId: pendingContactId,
          error: errorMsg,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCloseAll = () => {
    setStep("details");
    setError("");
    setLoading(false);
    onClose();
  };


  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 dir-rtl overflow-y-auto">
      <div className="bg-slate-900 text-white rounded-t-3xl sm:rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative border border-slate-700 my-auto">
        
        {/* Close Button */}
        <button
          onClick={handleCloseAll}
          className="absolute top-4 left-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* ================= STEP 1: DETAILS ================= */}
        {step === "details" && (
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
                  className={`flex-1 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
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
                  className={`flex-1 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
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

            <form onSubmit={handleProceedToPayment} className="space-y-6 text-sm">
              
              {/* Tiers Row */}
              <div>
                <label className="block text-xs font-bold mb-3 text-slate-300">
                  {donationMode === "recurring" ? "בחר מדרגת תרומה חודשית (הוראת קבע)" : "בחר סכום תרומה"}
                </label>

                <CampaignTiersList
                  tiers={tiers}
                  donationMode={donationMode === "recurring" ? "recurring" : "one_time"}
                  selectedTierId={selectedTierId}
                  onSelectTier={handleSelectTier}
                  onSelectCustomTier={handleSelectCustomTier}
                  theme="dark"
                />
              </div>

              {/* Display & Manual Amount Input Box */}
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

                {donationMode === "recurring" && (
                  <div className="bg-emerald-950/60 border border-emerald-600/40 p-3 rounded-xl text-center text-xs text-emerald-200 font-bold">
                    תרומה חודשית בהוראת קבע: ברצוני לתרום ₪{currentMonthly} במשך {months} חודשים (סה"כ: ₪{calculatedTotal.toLocaleString()}.00)
                  </div>
                )}
              </div>

              {/* Donor Details Fields with Browser Autofill */}
              <div className="space-y-3 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="donor-name" className="block text-xs font-bold mb-1 text-slate-300">שם מלא / משפחה *</label>
                    <input
                      id="donor-name"
                      name="name"
                      autoComplete="name"
                      type="text"
                      disabled={isAnonymous}
                      value={donorName}
                      onChange={(e) => setDonorName(e.target.value)}
                      placeholder="למשל: משפחת כהן"
                      className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none text-white disabled:opacity-40"
                    />
                  </div>

                  <div>
                    <label htmlFor="donor-phone" className="block text-xs font-bold mb-1 text-slate-300">טלפון נייד *</label>
                    <input
                      id="donor-phone"
                      name="tel"
                      autoComplete="tel"
                      type="tel"
                      dir="ltr"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="050-0000000"
                      className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none text-white text-right"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="donor-email" className="block text-xs font-bold mb-1 text-slate-300">דוא&quot;ל (לקבלת קבלה)</label>
                  <input
                    id="donor-email"
                    name="email"
                    autoComplete="email"
                    type="email"
                    dir="ltr"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none text-white text-right"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isAnonymous"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                    className="rounded text-emerald-500 focus:ring-emerald-500 bg-slate-800 border-slate-700 w-4 h-4 cursor-pointer"
                  />
                  <label htmlFor="isAnonymous" className="text-xs text-slate-300 font-semibold cursor-pointer">
                    תרומה אנונימית (השם לא יוצג ברשימת התורמים הפומבית)
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

              {/* Proceed to Payment CTA */}
              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-4 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-2xl transition-all shadow-lg shadow-rose-600/40 text-base flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                >
                  <Lock className="w-5 h-5" />
                  <span>
                    {donationMode === "recurring"
                      ? `המשך לתשלום (₪${currentMonthly}/חודש בהוראת קבע)`
                      : `המשך לתשלום (₪${calculatedTotal})`}
                  </span>
                </button>
              </div>

            </form>
          </>
        )}

        {/* ================= STEP 2: KESHER PAYMENT (CC / BIT / GOOGLE PAY) ================= */}
        {step === "payment" && (
          <div className="space-y-5 animate-in fade-in duration-300">
            {/* Header & Back Button */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <button
                type="button"
                onClick={() => {
                  setIframeUrl("");
                  setStep("details");
                }}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700"
              >
                <ArrowRight className="w-4 h-4" />
                <span>חזור לעריכת פרטים</span>
              </button>

              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <span className="text-sm font-bold text-white">סליקה מאובטחת (Kesher)</span>
              </div>
            </div>

            {/* Donation Summary Card */}
            <div className="bg-slate-800/90 p-3.5 rounded-2xl border border-slate-700/80 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 font-semibold block">סיכום תרומה עבור:</span>
                <span className="text-sm font-bold text-white">{isAnonymous ? "אנונימי" : (donorName || "תורם")}</span>
                {dedication && <p className="text-xs text-slate-400 italic line-clamp-1 mt-0.5">&quot;{dedication}&quot;</p>}
              </div>

              <div className="text-left">
                <span className="text-xs text-slate-400 font-semibold block">
                  {donationMode === "recurring" ? `הוראת קבע (${months} חודשים)` : "תשלום חד פעמי"}
                </span>
                <span className="text-2xl font-black text-emerald-400 dir-rtl">
                  ₪{calculatedTotal.toLocaleString()}
                </span>
                {donationMode === "recurring" && (
                  <span className="text-[11px] text-slate-400 block">
                    (₪{currentMonthly} לחודש)
                  </span>
                )}
              </div>
            </div>

            {error && (
              <div className="bg-rose-500/20 border border-rose-500/40 text-rose-200 p-3.5 rounded-xl text-xs font-semibold text-center">
                {error}
              </div>
            )}

            {/* Payment Method Selector Tabs (For One-Time Donations) */}
            {donationMode === "one_time" && !iframeUrl && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 block">בחר אמצעי תשלום:</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethodType("credit_card")}
                    className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                      paymentMethodType === "credit_card"
                        ? "bg-slate-800 border-emerald-500 text-white shadow-md ring-1 ring-emerald-500"
                        : "bg-slate-800/50 border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800"
                    }`}
                  >
                    <CreditCard className={`w-5 h-5 ${paymentMethodType === "credit_card" ? "text-emerald-400" : "text-slate-400"}`} />
                    <span className="text-xs font-bold">כרטיס אשראי</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethodType("bit")}
                    className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                      paymentMethodType === "bit"
                        ? "bg-emerald-950/80 border-emerald-400 text-emerald-300 shadow-md ring-1 ring-emerald-400"
                        : "bg-slate-800/50 border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800"
                    }`}
                  >
                    <div className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 font-black text-[11px] flex items-center justify-center">
                      bit
                    </div>
                    <span className="text-xs font-bold">אפליקציית Bit</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethodType("google_pay")}
                    className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                      paymentMethodType === "google_pay"
                        ? "bg-indigo-950/80 border-indigo-400 text-indigo-200 shadow-md ring-1 ring-indigo-400"
                        : "bg-slate-800/50 border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800"
                    }`}
                  >
                    <div className="flex items-center gap-0.5 text-xs font-black">
                      <span className="text-blue-400">G</span>
                      <span className="text-red-400">P</span>
                      <span className="text-amber-400">a</span>
                      <span className="text-green-400">y</span>
                    </div>
                    <span className="text-xs font-bold">Google Pay</span>
                  </button>
                </div>
              </div>
            )}

            {/* IFRAME EMBEDDED VIEW (When Bit or Google Pay iframe URL is active) */}
            {iframeUrl ? (
              <div className="space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setIframeUrl("")}
                    className="text-xs text-slate-400 hover:text-white flex items-center gap-1 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700 cursor-pointer"
                  >
                    <ArrowRight className="w-4 h-4" />
                    <span>חזור לבחירת אמצעי תשלום</span>
                  </button>
                  <a
                    href={iframeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-emerald-400 hover:underline flex items-center gap-1 font-bold"
                  >
                    פתח בעמוד מלא ↗
                  </a>
                </div>
                <div className="w-full h-[460px] rounded-2xl overflow-hidden border border-slate-700 bg-white shadow-xl">
                  <iframe
                    src={iframeUrl}
                    className="w-full h-full border-0"
                    title="Kesher Digital Payment"
                    allow="payment"
                  />
                </div>
              </div>
            ) : paymentMethodType === "bit" && donationMode === "one_time" ? (
              /* BIT PAYMENT CARD */
              <div className="p-6 rounded-2xl bg-gradient-to-b from-emerald-950/60 to-slate-900 border border-emerald-500/40 text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
                  <span className="font-black text-2xl">bit</span>
                </div>
                <div className="space-y-1">
                  <h4 className="font-black text-white text-base">תשלום מהיר ומאובטח באפליקציית Bit</h4>
                  <p className="text-xs text-slate-300 max-w-sm mx-auto leading-relaxed">
                    בלחיצה על הכפתור תיפתח סליקת Bit מאובטחת דרך קשר (Kesher) עבור סכום של ₪{calculatedTotal.toLocaleString()}.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handlePayWithDigitalWallet("bit")}
                  className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black rounded-2xl transition-all shadow-lg shadow-emerald-500/30 text-base flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>מייצר קישור מאובטח ל-Bit...</span>
                    </>
                  ) : (
                    <>
                      <span>מעבר לתשלום ₪{calculatedTotal.toLocaleString()} ב-Bit</span>
                    </>
                  )}
                </button>
              </div>
            ) : paymentMethodType === "google_pay" && donationMode === "one_time" ? (
              /* GOOGLE PAY / APPLE PAY CARD */
              <div className="p-6 rounded-2xl bg-gradient-to-b from-indigo-950/60 to-slate-900 border border-indigo-500/40 text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center mx-auto border border-indigo-500/30">
                  <ShieldCheck className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-black text-white text-base">תשלום בארנק דיגיטלי (Google Pay / Apple Pay)</h4>
                  <p className="text-xs text-slate-300 max-w-sm mx-auto leading-relaxed">
                    תשלום מיידי בנגיעה אחת ללא צורך בהקלדת פרטי כרטיס אשראי, מאובטח ישירות דרך קשר (Kesher).
                  </p>
                </div>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handlePayWithDigitalWallet("google_pay")}
                  className="w-full py-4 bg-white hover:bg-slate-100 text-slate-950 font-black rounded-2xl transition-all shadow-lg text-base flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>מתחבר לארנק הדיגיטלי...</span>
                    </>
                  ) : (
                    <>
                      <span>שלם ₪{calculatedTotal.toLocaleString()} באמצעות Google Pay</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              /* DIRECT CREDIT CARD FORM WITH BROWSER AUTOFILL */
              <form onSubmit={handleProcessPayment} className="space-y-4 text-sm">
                
                {/* Card Number */}
                <div className="space-y-1.5">
                  <label htmlFor="cc-number" className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-slate-400" /> מספר כרטיס אשראי *
                  </label>
                  <input
                    id="cc-number"
                    name="cc-number"
                    autoComplete="cc-number"
                    type="text"
                    dir="ltr"
                    placeholder="0000 0000 0000 0000"
                    value={ccData.creditNumber}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, "").slice(0, 16);
                      const formatted = raw.replace(/(\d{4})(?=\d)/g, "$1 ");
                      setCcData({ ...ccData, creditNumber: formatted });
                    }}
                    className="w-full bg-slate-800 text-white border border-slate-700 focus:border-emerald-500 rounded-xl p-3 text-base outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all font-mono tracking-widest text-left"
                    maxLength={19}
                  />
                </div>

                {/* ID Number */}
                <div className="space-y-1.5">
                  <label htmlFor="cardholder-id" className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <User className="w-4 h-4 text-slate-400" /> תעודת זהות (בעל הכרטיס)
                  </label>
                  <input
                    id="cardholder-id"
                    name="cardholder-id"
                    autoComplete="off"
                    type="text"
                    maxLength={9}
                    dir="ltr"
                    placeholder="000000000"
                    value={ccData.idNumber}
                    onChange={(e) => setCcData({ ...ccData, idNumber: e.target.value.replace(/\D/g, "") })}
                    className="w-full bg-slate-800 text-white border border-slate-700 focus:border-emerald-500 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all font-mono tracking-widest text-left"
                  />
                </div>

                {/* Expiry & CVV Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor="cc-exp-month" className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-slate-400" /> תוקף (חודש/שנה) *
                    </label>
                    <div className="flex gap-2">
                      <select
                        id="cc-exp-month"
                        name="cc-exp-month"
                        autoComplete="cc-exp-month"
                        dir="ltr"
                        value={ccData.expiryMonth}
                        onChange={(e) => setCcData({ ...ccData, expiryMonth: e.target.value })}
                        className="w-full bg-slate-800 text-white border border-slate-700 focus:border-emerald-500 rounded-xl p-3 text-xs outline-none font-mono"
                      >
                        <option value="" disabled className="bg-slate-900 text-white">MM</option>
                        {Array.from({ length: 12 }, (_, i) => {
                          const m = String(i + 1).padStart(2, "0");
                          return <option key={m} value={m} className="bg-slate-900 text-white">{m}</option>;
                        })}
                      </select>
                      <span className="text-slate-400 self-center font-bold">/</span>
                      <select
                        id="cc-exp-year"
                        name="cc-exp-year"
                        autoComplete="cc-exp-year"
                        dir="ltr"
                        value={ccData.expiryYear}
                        onChange={(e) => setCcData({ ...ccData, expiryYear: e.target.value })}
                        className="w-full bg-slate-800 text-white border border-slate-700 focus:border-emerald-500 rounded-xl p-3 text-xs outline-none font-mono"
                      >
                        <option value="" disabled className="bg-slate-900 text-white">YY</option>
                        {Array.from({ length: 15 }, (_, i) => {
                          const y = String((new Date().getFullYear() % 100) + i).padStart(2, "0");
                          return <option key={y} value={y} className="bg-slate-900 text-white">{y}</option>;
                        })}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="cc-csc" className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <Lock className="w-4 h-4 text-slate-400" /> CVV (3 ספרות בגב) *
                    </label>
                    <input
                      id="cc-csc"
                      name="cc-csc"
                      autoComplete="cc-csc"
                      type="password"
                      dir="ltr"
                      placeholder="123"
                      value={ccData.cvv2}
                      onChange={(e) => setCcData({ ...ccData, cvv2: e.target.value.replace(/\D/g, "") })}
                      className="w-full bg-slate-800 text-white border border-slate-700 focus:border-emerald-500 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all font-mono tracking-widest text-left"
                      maxLength={4}
                    />
                  </div>
                </div>

                {/* Submit Payment CTA */}
                <div className="pt-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl transition-all shadow-lg shadow-emerald-600/40 text-base flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>מבצע סליקה מאובטחת מול Kesher...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-5 h-5" />
                        <span>
                          {donationMode === "recurring"
                            ? `אשר תרומה חודשית ₪${currentMonthly} (סה"כ ₪${calculatedTotal})`
                            : `אשר תשלום מאובטח ₪${calculatedTotal}`}
                        </span>
                      </>
                    )}
                  </button>
                  <p className="text-[11px] text-slate-400 text-center mt-2 flex items-center justify-center gap-1">
                    <Lock className="w-3 h-3 text-emerald-400 inline" /> הסליקה מוצפנת ומאובטחת בתקן PCI-DSS המחמיר ביותר
                  </p>
                </div>

              </form>
            )}
          </div>
        )}


        {/* ================= STEP 3: THANK YOU ================= */}
        {step === "success" && (
          <div className="text-center space-y-4 py-8 dir-rtl animate-in fade-in zoom-in-95 duration-300">
            <div className="w-20 h-20 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-xl">
              <Check className="w-10 h-10" />
            </div>
            
            <h3 className="text-2xl sm:text-3xl font-black text-white">תודה רבה על תרומתך! ❤️</h3>
            
            <p className="text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
              תרומתך {donationMode === "recurring" ? `בהוראת קבע חודשית בסך ₪${currentMonthly} (למשך ${months} חודשים)` : `על סך ₪${calculatedTotal}`} עברה בהצלחה ונוספה מיידית ליעד הקמפיין!
            </p>

            {transactionId && (
              <div className="inline-block bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-xs font-mono text-slate-300">
                מספר אישור עסקה: <span className="font-bold text-emerald-400">{transactionId}</span>
              </div>
            )}

            {receiptUrl && (
              <div className="pt-2">
                <a
                  href={receiptUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-colors shadow-md"
                >
                  <FileText className="w-4 h-4" />
                  <span>צפה בקבלה שהופקה (PDF)</span>
                </a>
              </div>
            )}

            <div className="pt-4">
              <button
                onClick={handleCloseAll}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl transition-all text-sm shadow-lg shadow-emerald-600/30 cursor-pointer"
              >
                סגור וצפה בלוח התורמים המעודכן
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
