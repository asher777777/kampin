"use client";

import React, { useState } from "react";
import * as LucideIcons from "lucide-react";
import { X, Heart, CreditCard, Lock, Check, Repeat, Calendar, User, ArrowRight, ShieldCheck, FileText, Loader2, ArrowLeft } from "lucide-react";
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
  initialDonationMode?: "one_time" | "recurring";
  drawerConfig?: any;
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
  initialDonationMode,
  drawerConfig,
}) => {
  const tiers = configTiers && configTiers.length > 0 ? configTiers : defaultTiers;
  const isDark = drawerConfig?.theme !== 'light';

  const [step, setStep] = useState<"amount" | "details" | "payment" | "success">("amount");

  const [donationMode, setDonationMode] = useState<"recurring" | "one_time">(
    initialDonationMode || (configDonationType === "one_time" ? "one_time" : "recurring")
  );

  const defaultTierAmount = tiers.find(t => t.isDefault)?.monthlyAmount || tiers[0]?.monthlyAmount || 360;
  const [selectedTierId, setSelectedTierId] = useState<string>(initialSelectedTierId || tiers.find(t => t.isDefault)?.id || tiers[0]?.id || "");
  const [monthlyAmount, setMonthlyAmount] = useState<number | "">(defaultTierAmount);
  const [customAmount, setCustomAmount] = useState<string>("");
  const [months, setMonths] = useState<number>(configRecurringMonths || 12);

  React.useEffect(() => {
    if (isOpen) {
      if (initialDonationMode) {
        setDonationMode(initialDonationMode);
      } else if (configDonationType === "one_time") {
        setDonationMode("one_time");
      }
    }
  }, [isOpen, initialDonationMode, configDonationType]);

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

    const renderIcon = (iconName?: string, defaultIcon?: any) => {
    if (!iconName) return defaultIcon ? defaultIcon : null;
    const IconComponent = (LucideIcons as any)[iconName];
    return IconComponent ? <IconComponent className="w-5 h-5" /> : (defaultIcon ? defaultIcon : null);
  };

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
          campaignId,
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
          campaignId,
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
    setStep("amount");
    setError("");
    setLoading(false);
    onClose();
  };


  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 dir-rtl overflow-y-auto">
      <div className={`max-w-lg w-full p-5 sm:p-6 shadow-2xl relative my-auto rounded-t-3xl sm:rounded-3xl border transition-colors ${
        isDark
          ? "bg-slate-900 text-white border-slate-700/80"
          : "bg-white text-slate-900 border-slate-200"
      }`}>
        
        {/* Close Button */}
        <button
          onClick={handleCloseAll}
          className={`absolute top-4 left-4 p-2 rounded-full transition-colors cursor-pointer ${
            isDark ? "text-slate-400 hover:text-white hover:bg-slate-800" : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <X className="w-5 h-5" />
        </button>

                                {/* ================= STEP 1: AMOUNT ================= */}
        {step === "amount" && (
          <div className="space-y-4 animate-in slide-in-from-right fade-in">
            {/* Step Header Pinned to Top */}
            <div className={`flex items-center justify-between pb-2 border-b ${isDark ? "border-slate-700/40" : "border-slate-200"}`}>
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-xs ${
                  isDark ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-emerald-100 text-emerald-700 border border-emerald-300"
                }`}>
                  {renderIcon(drawerConfig?.step1Icon, "1")}
                </div>
                <h4 className={`text-base sm:text-lg font-black ${isDark ? "text-white" : "text-slate-900"}`}>
                  {drawerConfig?.step1Title || "שלב א: בחירת סכום"}
                </h4>
              </div>

              {ambassadorName && (
                <span className="bg-amber-500/20 text-amber-400 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-amber-500/30">
                  שגריר: {ambassadorName}
                </span>
              )}
            </div>

            {/* Amount Summary & Input Row (Pinned directly under header) */}
            <div className={`p-4 rounded-2xl border ${
              isDark ? "bg-slate-800/80 border-slate-700/80" : "bg-slate-50 border-slate-200"
            }`} style={{ backgroundColor: drawerConfig?.fieldBgColor, borderColor: drawerConfig?.borderColor }}>
              <div className="flex items-center justify-between gap-4">
                
                {/* Right: Calculated Total Amount Display (No 'ממגל ממש מקבלים' title!) */}
                <div className="text-right flex-1">
                  <div className="text-3xl sm:text-4xl font-black text-emerald-500 dir-rtl">
                    ₪{calculatedTotal.toLocaleString()}
                  </div>
                  {donationMode === "recurring" && (
                    <span className={`text-[11px] font-medium block mt-0.5 ${isDark ? "text-slate-400" : "text-slate-500"}`} style={{ fontSize: drawerConfig?.fontSizeScale ? `${0.75 * drawerConfig.fontSizeScale}rem` : undefined }}>
                      במשך {months} חודשים ({currentMonthly}₪/חודש)
                    </span>
                  )}
                </div>

                {/* Left: Monthly/Custom Input Field */}
                <div className="flex flex-col items-end gap-1">
                  <label className={`text-xs font-bold ${isDark ? "text-slate-300" : "text-slate-700"}`} style={{ fontSize: drawerConfig?.fontSizeScale ? `${0.75 * drawerConfig.fontSizeScale}rem` : undefined }}>
                    תרומתך{donationMode === "recurring" ? " החודשית:" : ":"}
                  </label>
                  <div className={`flex items-center gap-1.5 border rounded-xl px-3 py-1.5 text-xl sm:text-2xl font-black dir-ltr shadow-inner ${
                    isDark ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-300 text-slate-900"
                  }`} style={{ backgroundColor: drawerConfig?.fieldBgColor ? 'rgba(0,0,0,0.2)' : undefined, borderColor: drawerConfig?.borderColor }}>
                    <span className="text-xs text-slate-400 font-bold px-1 border-r border-slate-700 pr-1.5">₪ ILS</span>
                    <input
                      type="number"
                      min="1"
                      value={monthlyAmount}
                      onChange={handleCustomInputChange}
                      className="w-20 sm:w-24 bg-transparent text-right focus:outline-none font-black"
                    />
                  </div>
                </div>
              </div>

              {/* Inline Switcher for recurring vs one-time */}
              {configDonationType === "both" && (
                <div className={`mt-3 pt-3 border-t flex items-center justify-center gap-3 ${isDark ? "border-slate-700/50" : "border-slate-200"}`}>
                  <button
                    type="button"
                    onClick={() => setDonationMode("recurring")}
                    className={`text-xs font-bold transition-colors cursor-pointer ${
                      donationMode === "recurring" ? "text-emerald-500 font-black" : isDark ? "text-slate-400 hover:text-slate-200" : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    הוראת קבע (הו״ק)
                  </button>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={donationMode === "recurring"}
                    onClick={() => setDonationMode(donationMode === "recurring" ? "one_time" : "recurring")}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      donationMode === "recurring" ? "bg-emerald-500" : "bg-slate-500"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                        donationMode === "recurring" ? "translate-x-0" : "-translate-x-5"
                      }`}
                    />
                  </button>

                  <button
                    type="button"
                    onClick={() => setDonationMode("one_time")}
                    className={`text-xs font-bold transition-colors cursor-pointer ${
                      donationMode === "one_time" ? "text-emerald-500 font-black" : isDark ? "text-slate-400 hover:text-slate-200" : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    תרומה חד פעמית
                  </button>
                </div>
              )}
            </div>

            {/* Tiers Grid */}
            <div>
              <label className={`block text-xs font-bold mb-2.5 ${isDark ? "text-slate-300" : "text-slate-700"}`} style={{ fontSize: drawerConfig?.fontSizeScale ? `${0.75 * drawerConfig.fontSizeScale}rem` : undefined }}>
                {donationMode === "recurring" ? "בחר מדרגת תרומה חודשית (הוראת קבע):" : "בחר סכום תרומה:"}
              </label>

              <CampaignTiersList
                tiers={tiers}
                donationMode={donationMode === "recurring" ? "recurring" : "one_time"}
                selectedTierId={selectedTierId}
                onSelectTier={handleSelectTier}
                onSelectCustomTier={handleSelectCustomTier}
                theme={isDark ? "dark" : "light"}
                drawerConfig={drawerConfig}
              />
            </div>
            
            {error && (
              <div className="bg-rose-500/20 border border-rose-500/40 text-rose-200 p-2.5 rounded-xl text-xs font-semibold text-center">
                {error}
              </div>
            )}

            {/* Bottom Action Button (Smaller padding, text, Arrow pointing left) */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  if (!currentMonthly || currentMonthly <= 0) {
                    setError("אנא בחר סכום תרומה תקין");
                    return;
                  }
                  setError("");
                  setStep("details");
                }}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all shadow-md text-sm sm:text-base flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
              >
                <span>המשך לפרטים אישיים</span>
                <ArrowLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 2: DETAILS ================= */}
        {step === "details" && (
          <div className="space-y-4 animate-in slide-in-from-left fade-in">
            <div className={`flex items-center justify-between pb-2 border-b ${isDark ? "border-slate-700/40" : "border-slate-200"}`}>
              <button
                type="button"
                onClick={() => setStep("amount")}
                className={`flex items-center gap-1.5 text-xs transition-colors cursor-pointer px-3 py-1.5 rounded-xl border ${
                  isDark ? "text-slate-400 hover:text-white bg-slate-800 border-slate-700" : "text-slate-600 hover:text-slate-900 bg-slate-100 border-slate-200"
                }`}
              >
                <ArrowRight className="w-3.5 h-3.5" />
                <span>חזור לבחירת סכום</span>
              </button>
              
              <div className="flex items-center gap-2">
                <h4 className={`text-base sm:text-lg font-black ${isDark ? "text-white" : "text-slate-900"}`}>
                  {drawerConfig?.step2Title || "שלב ב: פרטים אישיים"}
                </h4>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-xs ${
                  isDark ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-emerald-100 text-emerald-700 border border-emerald-300"
                }`}>
                  {renderIcon(drawerConfig?.step2Icon, "2")}
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-rose-500/20 border border-rose-500/40 text-rose-200 p-2.5 rounded-xl text-xs font-semibold text-center mb-2">
                {error}
              </div>
            )}

            <form onSubmit={handleProceedToPayment} className="space-y-4 text-sm">
              <div className="space-y-3 pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="donor-name" className={`block text-xs font-bold mb-1 ${isDark ? "text-slate-300" : "text-slate-700"}`} style={{ fontSize: drawerConfig?.fontSizeScale ? `${0.75 * drawerConfig.fontSizeScale}rem` : undefined }}>שם מלא / משפחה *</label>
                    <input
                      id="donor-name"
                      name="name"
                      autoComplete="name"
                      type="text"
                      disabled={isAnonymous}
                      value={donorName}
                      onChange={(e) => setDonorName(e.target.value)}
                      placeholder="למשל: משפחת כהן"
                      className={`w-full px-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none disabled:opacity-40 ${
                        isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-300 text-slate-900"
                      }`}
                      style={{ backgroundColor: drawerConfig?.fieldBgColor, borderColor: drawerConfig?.borderColor, fontSize: drawerConfig?.fontSizeScale ? `${0.875 * drawerConfig.fontSizeScale}rem` : undefined }}
                    />
                  </div>

                  <div>
                    <label htmlFor="donor-phone" className={`block text-xs font-bold mb-1 ${isDark ? "text-slate-300" : "text-slate-700"}`} style={{ fontSize: drawerConfig?.fontSizeScale ? `${0.75 * drawerConfig.fontSizeScale}rem` : undefined }}>טלפון נייד *</label>
                    <input
                      id="donor-phone"
                      name="tel"
                      autoComplete="tel"
                      type="tel"
                      dir="ltr"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="050-0000000"
                      className={`w-full px-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none text-right ${
                        isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-300 text-slate-900"
                      }`}
                      style={{ backgroundColor: drawerConfig?.fieldBgColor, borderColor: drawerConfig?.borderColor, fontSize: drawerConfig?.fontSizeScale ? `${0.875 * drawerConfig.fontSizeScale}rem` : undefined }}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="donor-email" className={`block text-xs font-bold mb-1 ${isDark ? "text-slate-300" : "text-slate-700"}`} style={{ fontSize: drawerConfig?.fontSizeScale ? `${0.75 * drawerConfig.fontSizeScale}rem` : undefined }}>דוא"ל (לקבלת קבלה)</label>
                  <input
                    id="donor-email"
                    name="email"
                    autoComplete="email"
                    type="email"
                    dir="ltr"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className={`w-full px-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none text-right ${
                      isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-300 text-slate-900"
                    }`}
                    style={{ backgroundColor: drawerConfig?.fieldBgColor, borderColor: drawerConfig?.borderColor, fontSize: drawerConfig?.fontSizeScale ? `${0.875 * drawerConfig.fontSizeScale}rem` : undefined }}
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
                  <label htmlFor="isAnonymous" className={`text-xs font-semibold cursor-pointer ${isDark ? "text-slate-300" : "text-slate-700"}`} style={{ fontSize: drawerConfig?.fontSizeScale ? `${0.75 * drawerConfig.fontSizeScale}rem` : undefined }}>
                    תרומה אנונימית (השם לא יוצג ברשימת התורמים הפומבית)
                  </label>
                </div>

                <div>
                  <label className={`block text-xs font-bold mb-1 ${isDark ? "text-slate-300" : "text-slate-700"}`} style={{ fontSize: drawerConfig?.fontSizeScale ? `${0.75 * drawerConfig.fontSizeScale}rem` : undefined }}>הקדשה / ברכה (יופיע בלוח התורמים)</label>
                  <textarea
                    rows={2}
                    value={dedication}
                    onChange={(e) => setDedication(e.target.value)}
                    placeholder="לזכות, לרפואת, או ברכה מכל הלב..."
                    className={`w-full px-3 py-2 border rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none ${
                      isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-300 text-slate-900"
                    }`}
                    style={{ backgroundColor: drawerConfig?.fieldBgColor, borderColor: drawerConfig?.borderColor, fontSize: drawerConfig?.fontSizeScale ? `${0.75 * drawerConfig.fontSizeScale}rem` : undefined }}
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all shadow-md text-sm sm:text-base flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                >
                  <Lock className="w-4 h-4" />
                  <span>
                    {donationMode === "recurring"
                      ? `המשך לתשלום (₪${currentMonthly}/חודש בהוראת קבע)`
                      : `המשך לתשלום (₪${calculatedTotal})`}
                  </span>
                  <ArrowLeft className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ================= STEP 3: KESHER PAYMENT (CC / BIT / GOOGLE PAY) ================= */}
        {step === "payment" && (
          <div className="space-y-4 animate-in fade-in duration-300">
            {/* Header & Back Button */}
            <div className={`flex items-center justify-between pb-2 border-b ${isDark ? "border-slate-700/40" : "border-slate-200"}`}>
              <button
                type="button"
                onClick={() => {
                  setIframeUrl("");
                  setStep("details");
                }}
                className={`flex items-center gap-1.5 text-xs transition-colors cursor-pointer px-3 py-1.5 rounded-xl border ${
                  isDark ? "text-slate-400 hover:text-white bg-slate-800 border-slate-700" : "text-slate-600 hover:text-slate-900 bg-slate-100 border-slate-200"
                }`}
              >
                <ArrowRight className="w-3.5 h-3.5" />
                <span>חזור לעריכת פרטים</span>
              </button>

              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <h4 className={`text-base sm:text-lg font-black ${isDark ? "text-white" : "text-slate-900"}`}>
                  {drawerConfig?.step3Title || "שלב ג: תשלום מאובטח"}
                </h4>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-xs ${
                  isDark ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-emerald-100 text-emerald-700 border border-emerald-300"
                }`}>
                  {renderIcon(drawerConfig?.step3Icon, "3")}
                </div>
              </div>
            </div>

            {/* Donation Summary Card */}
            <div className={`p-3.5 rounded-2xl border flex items-center justify-between ${
              isDark ? "bg-slate-800/80 border-slate-700/80" : "bg-slate-50 border-slate-200"
            }`}>
              <div>
                <span className={`text-[11px] font-semibold block ${isDark ? "text-slate-400" : "text-slate-500"}`}>סיכום תרומה עבור:</span>
                <span className={`text-sm font-bold ${isDark ? "text-white" : "text-slate-900"}`}>{isAnonymous ? "אנונימי" : (donorName || "תורם")}</span>
                {dedication && <p className="text-xs text-slate-400 italic line-clamp-1 mt-0.5">&quot;{dedication}&quot;</p>}
              </div>

              <div className="text-left">
                <span className={`text-[11px] font-semibold block ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                  {donationMode === "recurring" ? `הוראת קבע (${months} חודשים)` : "תשלום חד פעמי"}
                </span>
                <span className="text-2xl font-black text-emerald-500 dir-rtl">
                  ₪{calculatedTotal.toLocaleString()}
                </span>
                {donationMode === "recurring" && (
                  <span className={`text-[11px] block ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                    (₪{currentMonthly} לחודש)
                  </span>
                )}
              </div>
            </div>

            {error && (
              <div className="bg-rose-500/20 border border-rose-500/40 text-rose-200 p-2.5 rounded-xl text-xs font-semibold text-center">
                {error}
              </div>
            )}

            {/* Payment Method Selector Tabs (For One-Time Donations) */}
            {donationMode === "one_time" && !iframeUrl && (
              <div className="space-y-2">
                <label className={`text-xs font-bold block ${isDark ? "text-slate-300" : "text-slate-700"}`}>בחר אמצעי תשלום:</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethodType("credit_card")}
                    className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                      paymentMethodType === "credit_card"
                        ? isDark
                          ? "bg-slate-800 border-emerald-500 text-white shadow-md ring-1 ring-emerald-500"
                          : "bg-emerald-50 border-emerald-500 text-emerald-950 shadow-md ring-1 ring-emerald-500"
                        : isDark
                          ? "bg-slate-800/50 border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <CreditCard className={`w-5 h-5 ${paymentMethodType === "credit_card" ? "text-emerald-500" : "text-slate-400"}`} />
                    <span className="text-xs font-bold">כרטיס אשראי</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethodType("bit")}
                    className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                      paymentMethodType === "bit"
                        ? isDark
                          ? "bg-emerald-950/80 border-emerald-400 text-emerald-300 shadow-md ring-1 ring-emerald-400"
                          : "bg-emerald-50 border-emerald-500 text-emerald-950 shadow-md ring-1 ring-emerald-500"
                        : isDark
                          ? "bg-slate-800/50 border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
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
                        ? isDark
                          ? "bg-indigo-950/80 border-indigo-400 text-indigo-200 shadow-md ring-1 ring-indigo-400"
                          : "bg-indigo-50 border-indigo-500 text-indigo-950 shadow-md ring-1 ring-indigo-500"
                        : isDark
                          ? "bg-slate-800/50 border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-0.5 text-xs font-black">
                      <span className="text-blue-500">G</span>
                      <span className="text-red-500">P</span>
                      <span className="text-amber-500">a</span>
                      <span className="text-green-500">y</span>
                    </div>
                    <span className="text-xs font-bold">Google Pay</span>
                  </button>
                </div>
              </div>
            )}

            {/* IFRAME EMBEDDED VIEW */}
            {iframeUrl ? (
              <div className="space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setIframeUrl("")}
                    className={`text-xs flex items-center gap-1 px-3 py-1.5 rounded-xl border cursor-pointer ${
                      isDark ? "text-slate-400 hover:text-white bg-slate-800 border-slate-700" : "text-slate-600 hover:text-slate-900 bg-slate-100 border-slate-200"
                    }`}
                  >
                    <ArrowRight className="w-4 h-4" />
                    <span>חזור לבחירת אמצעי תשלום</span>
                  </button>
                  <a
                    href={iframeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-emerald-500 hover:underline flex items-center gap-1 font-bold"
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
              <div className={`p-5 rounded-2xl border text-center space-y-3 ${
                isDark ? "bg-gradient-to-b from-emerald-950/60 to-slate-900 border-emerald-500/40" : "bg-emerald-50/70 border-emerald-300"
              }`}>
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto border border-emerald-500/30">
                  <span className="font-black text-xl">bit</span>
                </div>
                <div className="space-y-1">
                  <h4 className={`font-black text-sm sm:text-base ${isDark ? "text-white" : "text-slate-900"}`}>תשלום מהיר ומאובטח באפליקציית Bit</h4>
                  <p className={`text-xs max-w-sm mx-auto leading-relaxed ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                    סליקת Bit מאובטחת דרך קשר (Kesher) עבור סכום של ₪{calculatedTotal.toLocaleString()}.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handlePayWithDigitalWallet("bit")}
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black rounded-xl transition-all shadow-md text-sm sm:text-base flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
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
              <div className={`p-5 rounded-2xl border text-center space-y-3 ${
                isDark ? "bg-gradient-to-b from-indigo-950/60 to-slate-900 border-indigo-500/40" : "bg-indigo-50/70 border-indigo-300"
              }`}>
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto border border-indigo-500/30">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className={`font-black text-sm sm:text-base ${isDark ? "text-white" : "text-slate-900"}`}>תשלום בארנק דיגיטלי (Google Pay / Apple Pay)</h4>
                  <p className={`text-xs max-w-sm mx-auto leading-relaxed ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                    תשלום מיידי בנגיעה אחת ללא צורך בהקלדת פרטי כרטיס אשראי, מאובטח ישירות דרך קשר (Kesher).
                  </p>
                </div>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handlePayWithDigitalWallet("google_pay")}
                  className={`w-full py-3 font-black rounded-xl transition-all shadow-md text-sm sm:text-base flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 ${
                    isDark ? "bg-white hover:bg-slate-100 text-slate-950" : "bg-slate-900 hover:bg-slate-800 text-white"
                  }`}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
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
              <form onSubmit={handleProcessPayment} className="space-y-3.5 text-sm">
                
                {/* Card Number */}
                <div className="space-y-1">
                  <label htmlFor="cc-number" className={`text-xs font-bold flex items-center gap-1.5 ${isDark ? "text-slate-300" : "text-slate-700"}`}>
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
                    className={`w-full border focus:border-emerald-500 rounded-xl p-2.5 text-sm sm:text-base outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all font-mono tracking-widest text-left ${
                      isDark ? "bg-slate-800 text-white border-slate-700" : "bg-slate-50 text-slate-900 border-slate-300"
                    }`}
                    maxLength={19}
                  />
                </div>

                {/* ID Number */}
                <div className="space-y-1">
                  <label htmlFor="cardholder-id" className={`text-xs font-bold flex items-center gap-1.5 ${isDark ? "text-slate-300" : "text-slate-700"}`}>
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
                    className={`w-full border focus:border-emerald-500 rounded-xl p-2.5 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all font-mono tracking-widest text-left ${
                      isDark ? "bg-slate-800 text-white border-slate-700" : "bg-slate-50 text-slate-900 border-slate-300"
                    }`}
                  />
                </div>

                {/* Expiry & CVV Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label htmlFor="cc-exp-month" className={`text-xs font-bold flex items-center gap-1.5 ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                      <Calendar className="w-4 h-4 text-slate-400" /> תוקף (חודש/שנה) *
                    </label>
                    <div className="flex gap-1.5">
                      <select
                        id="cc-exp-month"
                        name="cc-exp-month"
                        autoComplete="cc-exp-month"
                        dir="ltr"
                        value={ccData.expiryMonth}
                        onChange={(e) => setCcData({ ...ccData, expiryMonth: e.target.value })}
                        className={`w-full border focus:border-emerald-500 rounded-xl p-2 text-xs outline-none font-mono ${
                          isDark ? "bg-slate-800 text-white border-slate-700" : "bg-slate-50 text-slate-900 border-slate-300"
                        }`}
                      >
                        <option value="" disabled className={isDark ? "bg-slate-900 text-white" : "bg-white text-slate-900"}>MM</option>
                        {Array.from({ length: 12 }, (_, i) => {
                          const m = String(i + 1).padStart(2, "0");
                          return <option key={m} value={m} className={isDark ? "bg-slate-900 text-white" : "bg-white text-slate-900"}>{m}</option>;
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
                        className={`w-full border focus:border-emerald-500 rounded-xl p-2 text-xs outline-none font-mono ${
                          isDark ? "bg-slate-800 text-white border-slate-700" : "bg-slate-50 text-slate-900 border-slate-300"
                        }`}
                      >
                        <option value="" disabled className={isDark ? "bg-slate-900 text-white" : "bg-white text-slate-900"}>YY</option>
                        {Array.from({ length: 15 }, (_, i) => {
                          const y = String((new Date().getFullYear() % 100) + i).padStart(2, "0");
                          return <option key={y} value={y} className={isDark ? "bg-slate-900 text-white" : "bg-white text-slate-900"}>{y}</option>;
                        })}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="cc-csc" className={`text-xs font-bold flex items-center gap-1.5 ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                      <Lock className="w-4 h-4 text-slate-400" /> CVV (3 ספרות) *
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
                      className={`w-full border focus:border-emerald-500 rounded-xl p-2 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all font-mono tracking-widest text-left ${
                        isDark ? "bg-slate-800 text-white border-slate-700" : "bg-slate-50 text-slate-900 border-slate-300"
                      }`}
                      maxLength={4}
                    />
                  </div>
                </div>

                {/* Submit Payment CTA */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all shadow-md text-sm sm:text-base flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>מבצע סליקה מאובטחת...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>
                          {donationMode === "recurring"
                            ? `אשר תרומה חודשית ₪${currentMonthly} (סה"כ ₪${calculatedTotal})`
                            : `אשר תשלום מאובטח ₪${calculatedTotal}`}
                        </span>
                      </>
                    )}
                  </button>
                  <p className={`text-[10px] sm:text-[11px] text-center mt-1.5 flex items-center justify-center gap-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                    <Lock className="w-3 h-3 text-emerald-500 inline" /> הסליקה מוצפנת ומאובטחת בתקן PCI-DSS
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
