"use client";

import React, { useState } from "react";
import * as LucideIcons from "lucide-react";
import { X, Heart, CreditCard, Lock, Check, Repeat, Calendar, User, ArrowRight, ShieldCheck, FileText, Loader2, ArrowLeft, FlaskConical, Share2, Copy, ExternalLink, CheckCircle2 } from "lucide-react";
import { recordPendingDonationAction, completeDonationAction, failDonationAction, recordDonationAction } from "@/features/campaigns/actions";
import { initiateKesherDigitalWalletAction } from "@/features/kesher/actions";
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
  initialPaymentMethod?: "credit_card" | "bit";
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
  initialPaymentMethod,
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
      if (initialPaymentMethod) {
        setPaymentMethodType(initialPaymentMethod);
      }
    }
  }, [isOpen, initialDonationMode, initialPaymentMethod, configDonationType]);

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
  const [paymentMethodType, setPaymentMethodType] = useState<"credit_card" | "bit">(initialPaymentMethod || "credit_card");
  const [iframeUrl, setIframeUrl] = useState<string>("");
  const [bitStatus, setBitStatus] = useState<{ message: string; bitUrl?: string; phone?: string } | null>(null);

  // Set initial payment method when drawer opens or prop changes
  React.useEffect(() => {
    if (isOpen) {
      if (initialPaymentMethod) {
        setPaymentMethodType(initialPaymentMethod);
      }
      setBitStatus(null);
      setIframeUrl("");
    }
  }, [isOpen, initialPaymentMethod]);

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
  const [isCopied, setIsCopied] = useState(false);

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
  const handleProceedToPayment = (e?: React.FormEvent | React.MouseEvent) => {
    if (e) {
      e.preventDefault();
    }

    const currentAmount = Number(monthlyAmount) || 0;
    if (currentAmount <= 0 && calculatedTotal <= 0) {
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
    saveDonorToLocalStorage();

    // 1. Instantly generate a pending donation ID
    const initialPendingId = `pending-${Date.now()}`;
    setPendingDonationId(initialPendingId);

    // 2. Instantly switch to Step 3 (Payment step)
    setStep("payment");

    // 3. Save pending donation to CRM/DB in the background without blocking the UI
    try {
      const selectedTierObj = tiers.find((t) => t.id === selectedTierId);
      recordPendingDonationAction({
        campaignId: campaignId || "home",
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
      })
        .then((res) => {
          if (res?.donationId) setPendingDonationId(res.donationId);
          if (res?.contactId) setPendingContactId(res.contactId);
        })
        .catch((err) => {
          console.warn("Background pending donation record notice:", err);
        });
    } catch (err) {
      console.warn("Background sync notice:", err);
    }
  };

  const isTestMode = Boolean(drawerConfig?.testMode);

  // Launch Digital Wallet (Bit or Google Pay / Apple Pay) via Kesher LinkToken
  const handlePayWithDigitalWallet = async (walletType: "bit" | "google_pay") => {
    setError("");
    setLoading(true);
    try {
      const targetCampId = (campaignId === "default-campaign" || campaignId === "home") ? "home" : (campaignId || "home");

      if (isTestMode) {
        // SIMULATION IN TEST MODE (NO CREDIT CARD API CALL)
        const mockTranId = `TEST-WALLET-${Date.now()}`;
        const isRecurring = donationMode === "recurring";
        setTransactionId(mockTranId);
        setReceiptUrl("");

        try {
          if (pendingDonationId) {
            await completeDonationAction({
              campaignId: targetCampId,
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
              transactionId: mockTranId,
              receiptUrl: "",
              paymentMethod: `test_mode_${walletType}`,
              donorName: isAnonymous ? "אנונימי" : donorName,
              phone,
              email,
            });
          } else {
            await recordDonationAction({
              campaignId: targetCampId,
              donorName: isAnonymous ? "אנונימי" : (donorName || "אנונימי"),
              amount: calculatedTotal,
              monthlyAmount: isRecurring ? currentMonthly : undefined,
              recurringMonths: isRecurring ? months : 1,
              isRecurring,
              dedication,
              isAnonymous,
              ambassadorId: ambassadorId || null,
              ambassadorName: ambassadorName || null,
              transactionId: mockTranId,
              receiptUrl: "",
              paymentMethod: `test_mode_${walletType}`,
              phone,
              email,
            });
          }
        } catch (simErr) {
          console.warn("Test mode simulation notice:", simErr);
        }

        setStep("success");
        if (onDonationCompleted) {
          onDonationCompleted();
        }
        return;
      }

      const cleanDigits = (phone || "").replace(/[^0-9]/g, "");
      if (walletType === "bit" && (cleanDigits.length < 9 || !cleanDigits.startsWith("05"))) {
        setError("לתשלום ישיר באפליקציית Bit יש להזין מספר טלפון נייד ישראלי תקין (המתחיל ב-05) בשלב הפרטים.");
        setLoading(false);
        return;
      }

      const data = await initiateKesherDigitalWalletAction({
        campaignId: targetCampId,
        amount: calculatedTotal,
        clientName: donorName || "תורם קמפיין",
        phone,
        email,
        walletType,
        details: `תרומה בקמפיין - ${walletType === "bit" ? "ביט" : "Google Pay"}`,
        transactionId: pendingDonationId || `Donation-${targetCampId}-${Date.now()}`,
        installments: 1,
      });

      if (data.success && (data.bitUrl || (data as any).isDirectBit)) {
        setBitStatus({
          message: data.message || "נשלח אליך כעת מסרון לטלפון, נא אשר את התשלום",
          bitUrl: data.bitUrl,
          phone
        });
        const isMobile = typeof window !== "undefined" && (
          /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
          window.innerWidth < 768
        );
        if (data.bitUrl && isMobile) {
          try {
            window.location.href = data.bitUrl;
          } catch (e) {}
        }
      } else if (data.success && (data as any).iframeUrl) {
        setIframeUrl((data as any).iframeUrl);
      } else {
        setError(data.error || "שגיאה בהפקת קישור לתשלום דיגיטלי מול קשר. ודא כי פרטי מסוף קשר מוגדרים במערכת.");
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

    if (isTestMode) {
      // SIMULATION IN TEST MODE (NO CREDIT CARD API CALL)
      setLoading(true);
      try {
        const mockTranId = `TEST-CC-${Date.now()}`;
        const isRecurring = donationMode === "recurring";
        setTransactionId(mockTranId);
        setReceiptUrl("");

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
            transactionId: mockTranId,
            receiptUrl: "",
            paymentMethod: isRecurring ? "test_mode_standing_order" : "test_mode_credit_card",
            donorName: isAnonymous ? "אנונימי" : donorName,
            phone,
            email,
          });
        } else {
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
            transactionId: mockTranId,
            receiptUrl: "",
            paymentMethod: isRecurring ? "test_mode_standing_order" : "test_mode_credit_card",
            phone,
            email,
          });
        }

        setStep("success");
        if (onDonationCompleted) {
          onDonationCompleted();
        }
      } catch (err: any) {
        console.error("Test mode payment completion error:", err);
        setError(err.message || "שגיאה ברישום תרומת טסט");
      } finally {
        setLoading(false);
      }
      return;
    }

    // PRODUCTION FLOW: Validations and real API call to Kesher (100% UNTOUCHED)
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
          clientName: donorName || "תורם קמפיין",
          phone,
          email,
          id: ccData.idNumber,
          transactionId: `Donation-${campaignId}-${Date.now()}`,
          installments: isRecurring ? months : 1,
          paymentFrequency: isRecurring ? "recurring" : "one-time",
        }),
      });


      const resText = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(resText);
      } catch (parseErr) {
        console.error("Kesher send-transaction non-JSON response:", resText);
        throw new Error("שגיאה בתקשורת עם השרת. אנא נסה שוב.");
      }

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
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-end sm:items-center justify-center p-2 sm:p-4 dir-rtl overflow-y-auto">
      <div className={`max-w-[460px] w-full p-3.5 sm:p-4.5 shadow-2xl relative my-auto rounded-3xl border transition-colors max-h-[96vh] overflow-y-auto ${
        isDark
          ? "bg-slate-900 text-white border-slate-700/80"
          : "bg-white text-slate-900 border-slate-200"
      }`}>
        
        {/* Close Button */}
        <button
          onClick={handleCloseAll}
          className={`absolute top-3.5 left-3.5 p-1.5 rounded-full transition-colors cursor-pointer ${
            isDark ? "text-slate-400 hover:text-white hover:bg-slate-800" : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <X className="w-4 h-4" />
        </button>

                                {/* ================= STEP 1: AMOUNT ================= */}
        {step === "amount" && (
          <div className="space-y-2.5 animate-in slide-in-from-right fade-in">
            {/* Step Header Pinned to Top */}
            <div className={`flex items-center justify-between pb-1.5 border-b ${isDark ? "border-slate-700/40" : "border-slate-200"}`}>
              <div className="flex items-center gap-1.5">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-xs ${
                  isDark ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-emerald-100 text-emerald-700 border border-emerald-300"
                }`}>
                  {renderIcon(drawerConfig?.step1Icon, "1")}
                </div>
                <h4 className={`text-sm sm:text-base font-black ${isDark ? "text-white" : "text-slate-900"}`}>
                  {drawerConfig?.step1Title || "שלב א: בחירת סכום"}
                </h4>
              </div>

              {ambassadorName && (
                <span className="bg-amber-500/20 text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-500/30">
                  שגריר: {ambassadorName}
                </span>
              )}
            </div>

            {/* Amount Summary & Input Row (Pinned directly under header) */}
            <div className={`p-2.5 sm:p-3 rounded-2xl border ${
              isDark ? "bg-slate-800/80 border-slate-700/80" : "bg-slate-50 border-slate-200"
            }`} style={{ backgroundColor: drawerConfig?.fieldBgColor, borderColor: drawerConfig?.borderColor }}>
              <div className="flex items-center justify-between gap-3">
                
                {/* Right: Calculated Total Amount Display */}
                <div className="text-right flex-1 min-w-0">
                  <div className="text-2xl sm:text-3xl font-black text-emerald-500 dir-rtl tracking-tight">
                    ₪{calculatedTotal.toLocaleString()}
                  </div>
                  {donationMode === "recurring" && (
                    <span className={`text-[10px] font-medium block ${isDark ? "text-slate-400" : "text-slate-500"}`} style={{ fontSize: drawerConfig?.fontSizeScale ? `${0.7 * drawerConfig.fontSizeScale}rem` : undefined }}>
                      במשך {months} חודשים ({currentMonthly}₪/חודש)
                    </span>
                  )}
                </div>

                {/* Left: Monthly/Custom Input Field */}
                <div className="flex flex-col items-end gap-0.5">
                  <label className={`text-[11px] font-bold ${isDark ? "text-slate-300" : "text-slate-700"}`} style={{ fontSize: drawerConfig?.fontSizeScale ? `${0.7 * drawerConfig.fontSizeScale}rem` : undefined }}>
                    תרומתך{donationMode === "recurring" ? " החודשית:" : ":"}
                  </label>
                  <div className={`flex items-center gap-1 border rounded-lg px-2.5 py-1 text-lg sm:text-xl font-black dir-ltr shadow-inner ${
                    isDark ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-300 text-slate-900"
                  }`} style={{ backgroundColor: drawerConfig?.fieldBgColor ? 'rgba(0,0,0,0.2)' : undefined, borderColor: drawerConfig?.borderColor }}>
                    <span className="text-[10px] text-slate-400 font-bold px-1 border-r border-slate-700 pr-1">₪ ILS</span>
                    <input
                      type="number"
                      min="1"
                      value={monthlyAmount}
                      onChange={handleCustomInputChange}
                      className="w-16 sm:w-20 bg-transparent text-right focus:outline-none font-black"
                    />
                  </div>
                </div>
              </div>

              {/* Inline Switcher for recurring vs one-time */}
              <div className={`mt-2 pt-2 border-t flex items-center justify-center gap-1.5 ${isDark ? "border-slate-700/50" : "border-slate-200"}`}>
                <div className={`inline-flex p-0.5 rounded-xl border shadow-inner ${isDark ? "bg-slate-900/90 border-slate-700" : "bg-slate-100 border-slate-200"}`}>
                  <button
                    type="button"
                    onClick={() => setDonationMode("recurring")}
                    className={`px-3 py-1 rounded-lg text-[11px] font-black transition-all cursor-pointer flex items-center gap-1 ${
                      donationMode === "recurring"
                        ? "bg-emerald-600 text-white shadow-sm font-black"
                        : isDark ? "text-slate-400 hover:text-slate-200" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Repeat className="w-3 h-3" />
                    <span>הוראת קבע (הו״ק)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDonationMode("one_time")}
                    className={`px-3 py-1 rounded-lg text-[11px] font-black transition-all cursor-pointer flex items-center gap-1 ${
                      donationMode === "one_time"
                        ? "bg-emerald-600 text-white shadow-sm font-black"
                        : isDark ? "text-slate-400 hover:text-slate-200" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <CreditCard className="w-3 h-3" />
                    <span>תרומה חד פעמית</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Tiers Grid */}
            <div>
              <label className={`block text-[11px] font-bold mb-1.5 ${isDark ? "text-slate-300" : "text-slate-700"}`} style={{ fontSize: drawerConfig?.fontSizeScale ? `${0.7 * drawerConfig.fontSizeScale}rem` : undefined }}>
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
              <div className="bg-rose-500/20 border border-rose-500/40 text-rose-200 p-2 rounded-xl text-xs font-semibold text-center">
                {error}
              </div>
            )}

            {/* Bottom Action Button (Smaller padding, text, Arrow pointing left) */}
            <div className="pt-1">
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
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all shadow-md text-sm sm:text-base flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
              >
                <span>המשך לפרטים אישיים</span>
                <ArrowLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 2: DETAILS ================= */}
        {step === "details" && (
          <div className="space-y-2.5 animate-in slide-in-from-left fade-in">
            <div className={`flex items-center justify-between pb-1.5 border-b ${isDark ? "border-slate-700/40" : "border-slate-200"}`}>
              <button
                type="button"
                onClick={() => setStep("amount")}
                className={`flex items-center gap-1.5 text-xs transition-colors cursor-pointer px-2.5 py-1 rounded-xl border ${
                  isDark ? "text-slate-400 hover:text-white bg-slate-800 border-slate-700" : "text-slate-600 hover:text-slate-900 bg-slate-100 border-slate-200"
                }`}
              >
                <ArrowRight className="w-3.5 h-3.5" />
                <span>חזור לבחירת סכום</span>
              </button>
              
              <div className="flex items-center gap-1.5">
                <h4 className={`text-sm sm:text-base font-black ${isDark ? "text-white" : "text-slate-900"}`}>
                  {drawerConfig?.step2Title || "שלב ב: פרטים אישיים"}
                </h4>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-xs ${
                  isDark ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-emerald-100 text-emerald-700 border border-emerald-300"
                }`}>
                  {renderIcon(drawerConfig?.step2Icon, "2")}
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-rose-500/20 border border-rose-500/40 text-rose-200 p-2 rounded-xl text-xs font-semibold text-center mb-1">
                {error}
              </div>
            )}

            <form onSubmit={handleProceedToPayment} className="space-y-2.5 text-sm">
              <div className="space-y-2 pt-0.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label htmlFor="donor-name" className={`block text-[11px] font-bold mb-0.5 ${isDark ? "text-slate-300" : "text-slate-700"}`} style={{ fontSize: drawerConfig?.fontSizeScale ? `${0.7 * drawerConfig.fontSizeScale}rem` : undefined }}>שם מלא / משפחה *</label>
                    <input
                      id="donor-name"
                      name="name"
                      autoComplete="name"
                      type="text"
                      disabled={isAnonymous}
                      value={donorName}
                      onChange={(e) => setDonorName(e.target.value)}
                      placeholder="למשל: משפחת כהן"
                      className={`w-full px-3 py-1.5 border rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none disabled:opacity-40 ${
                        isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-300 text-slate-900"
                      }`}
                      style={{ backgroundColor: drawerConfig?.fieldBgColor, borderColor: drawerConfig?.borderColor, fontSize: drawerConfig?.fontSizeScale ? `${0.8 * drawerConfig.fontSizeScale}rem` : undefined }}
                    />
                  </div>

                  <div>
                    <label htmlFor="donor-phone" className={`block text-[11px] font-bold mb-0.5 ${isDark ? "text-slate-300" : "text-slate-700"}`} style={{ fontSize: drawerConfig?.fontSizeScale ? `${0.7 * drawerConfig.fontSizeScale}rem` : undefined }}>טלפון נייד *</label>
                    <input
                      id="donor-phone"
                      name="tel"
                      autoComplete="tel"
                      type="tel"
                      dir="ltr"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="050-0000000"
                      className={`w-full px-3 py-1.5 border rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none text-right ${
                        isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-300 text-slate-900"
                      }`}
                      style={{ backgroundColor: drawerConfig?.fieldBgColor, borderColor: drawerConfig?.borderColor, fontSize: drawerConfig?.fontSizeScale ? `${0.8 * drawerConfig.fontSizeScale}rem` : undefined }}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="donor-email" className={`block text-[11px] font-bold mb-0.5 ${isDark ? "text-slate-300" : "text-slate-700"}`} style={{ fontSize: drawerConfig?.fontSizeScale ? `${0.7 * drawerConfig.fontSizeScale}rem` : undefined }}>דוא"ל (לקבלת קבלה)</label>
                  <input
                    id="donor-email"
                    name="email"
                    autoComplete="email"
                    type="email"
                    dir="ltr"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className={`w-full px-3 py-1.5 border rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none text-right ${
                      isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-300 text-slate-900"
                    }`}
                    style={{ backgroundColor: drawerConfig?.fieldBgColor, borderColor: drawerConfig?.borderColor, fontSize: drawerConfig?.fontSizeScale ? `${0.8 * drawerConfig.fontSizeScale}rem` : undefined }}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isAnonymous"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                    className="rounded text-emerald-500 focus:ring-emerald-500 bg-slate-800 border-slate-700 w-3.5 h-3.5 cursor-pointer"
                  />
                  <label htmlFor="isAnonymous" className={`text-[11px] font-semibold cursor-pointer ${isDark ? "text-slate-300" : "text-slate-700"}`} style={{ fontSize: drawerConfig?.fontSizeScale ? `${0.7 * drawerConfig.fontSizeScale}rem` : undefined }}>
                    תרומה אנונימית (השם לא יוצג ברשימת התורמים הפומבית)
                  </label>
                </div>

                <div>
                  <label className={`block text-[11px] font-bold mb-0.5 ${isDark ? "text-slate-300" : "text-slate-700"}`} style={{ fontSize: drawerConfig?.fontSizeScale ? `${0.7 * drawerConfig.fontSizeScale}rem` : undefined }}>הקדשה / ברכה (יופיע בלוח התורמים)</label>
                  <textarea
                    rows={2}
                    value={dedication}
                    onChange={(e) => setDedication(e.target.value)}
                    placeholder="לזכות, לרפואת, או ברכה מכל הלב..."
                    className={`w-full px-3 py-1.5 border rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none ${
                      isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-300 text-slate-900"
                    }`}
                    style={{ backgroundColor: drawerConfig?.fieldBgColor, borderColor: drawerConfig?.borderColor, fontSize: drawerConfig?.fontSizeScale ? `${0.75 * drawerConfig.fontSizeScale}rem` : undefined }}
                  />
                </div>
              </div>

              <div className="pt-1">
                <button
                  type="submit"
                  onClick={(e) => handleProceedToPayment(e)}
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all shadow-md text-sm sm:text-base flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
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
          <div className="space-y-2.5 animate-in fade-in duration-300">
            {/* Header & Back Button */}
            <div className={`flex items-center justify-between pb-1.5 border-b ${isDark ? "border-slate-700/40" : "border-slate-200"}`}>
              <button
                type="button"
                onClick={() => {
                  setIframeUrl("");
                  setStep("details");
                }}
                className={`flex items-center gap-1.5 text-xs transition-colors cursor-pointer px-2.5 py-1 rounded-xl border ${
                  isDark ? "text-slate-400 hover:text-white bg-slate-800 border-slate-700" : "text-slate-600 hover:text-slate-900 bg-slate-100 border-slate-200"
                }`}
              >
                <ArrowRight className="w-3.5 h-3.5" />
                <span>חזור לעריכת פרטים</span>
              </button>

              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <h4 className={`text-sm sm:text-base font-black ${isDark ? "text-white" : "text-slate-900"}`}>
                  {drawerConfig?.step3Title || "שלב ג: תשלום מאובטח"}
                </h4>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-xs ${
                  isDark ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-emerald-100 text-emerald-700 border border-emerald-300"
                }`}>
                  {renderIcon(drawerConfig?.step3Icon, "3")}
                </div>
              </div>
            </div>

            {/* Test Mode Notification Banner */}
            {isTestMode && (
              <div className="p-2 bg-amber-500/20 border border-amber-500/70 rounded-xl flex items-center gap-2 text-xs text-amber-200 shadow-sm">
                <FlaskConical className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
                <div className="text-right">
                  <span className="font-black text-amber-300 block text-xs">🧪 מצב טסט פעיל (סימולציה)</span>
                  <span className="text-[10px] text-amber-100/90 leading-tight">
                    לא תבוצע פנייה לשרתי האשראי. התרומה תאושר מיידית ותירשם כ'משולם'.
                  </span>
                </div>
              </div>
            )}

            {/* Donation Summary Card */}
            <div className={`p-2.5 rounded-xl border flex items-center justify-between ${
              isDark ? "bg-slate-800/80 border-slate-700/80" : "bg-slate-50 border-slate-200"
            }`}>
              <div>
                <span className={`text-[10px] font-semibold block ${isDark ? "text-slate-400" : "text-slate-500"}`}>תרומה עבור:</span>
                <span className={`text-xs sm:text-sm font-bold ${isDark ? "text-white" : "text-slate-900"}`}>{isAnonymous ? "אנונימי" : (donorName || "תורם")}</span>
                {dedication && <p className="text-[10px] text-slate-400 italic line-clamp-1">&quot;{dedication}&quot;</p>}
              </div>

              <div className="text-left">
                <span className={`text-[10px] font-semibold block ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                  {donationMode === "recurring" ? `הוראת קבע (${months} ח')` : "תשלום חד פעמי"}
                </span>
                <span className="text-xl sm:text-2xl font-black text-emerald-500 dir-rtl">
                  ₪{calculatedTotal.toLocaleString()}
                </span>
                {donationMode === "recurring" && (
                  <span className={`text-[10px] block ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                    (₪{currentMonthly}/חודש)
                  </span>
                )}
              </div>
            </div>

            {error && (
              <div className="bg-rose-500/20 border border-rose-500/40 text-rose-200 p-2 rounded-xl text-xs font-semibold text-center">
                {error}
              </div>
            )}

            {/* Payment Method Selector Tabs (For One-Time Donations) */}
            {donationMode === "one_time" && !iframeUrl && (
              <div className="space-y-1.5">
                <label className={`text-[11px] font-bold block ${isDark ? "text-slate-300" : "text-slate-700"}`}>בחר אמצעי תשלום:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethodType("credit_card")}
                    className={`py-2.5 px-3 rounded-xl border text-center transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      paymentMethodType === "credit_card"
                        ? isDark
                          ? "bg-slate-800 border-emerald-500 text-white shadow-sm ring-1 ring-emerald-500"
                          : "bg-emerald-50 border-emerald-500 text-emerald-950 shadow-sm ring-1 ring-emerald-500"
                        : isDark
                          ? "bg-slate-800/50 border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <CreditCard className={`w-4 h-4 ${paymentMethodType === "credit_card" ? "text-emerald-500" : "text-slate-400"}`} />
                    <span className="text-xs font-bold">כרטיס אשראי</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethodType("bit")}
                    className={`py-2.5 px-3 rounded-xl border text-center transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      paymentMethodType === "bit"
                        ? isDark
                          ? "bg-emerald-950/80 border-emerald-400 text-emerald-300 shadow-sm ring-1 ring-emerald-400"
                          : "bg-emerald-50 border-emerald-500 text-emerald-950 shadow-sm ring-1 ring-emerald-500"
                        : isDark
                          ? "bg-slate-800/50 border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <div className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 font-black text-[10px] flex items-center justify-center">
                      bit
                    </div>
                    <span className="text-xs font-bold">Bit</span>
                  </button>
                </div>
              </div>
            )}

            {/* IFRAME EMBEDDED VIEW */}
            {iframeUrl ? (
              <div className="space-y-2 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setIframeUrl("")}
                    className={`text-xs flex items-center gap-1 px-2.5 py-1 rounded-xl border cursor-pointer ${
                      isDark ? "text-slate-400 hover:text-white bg-slate-800 border-slate-700" : "text-slate-600 hover:text-slate-900 bg-slate-100 border-slate-200"
                    }`}
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
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
                <div className="w-full h-[520px] sm:h-[580px] rounded-2xl overflow-hidden border border-slate-700 bg-white shadow-xl relative">
                  <iframe
                    src={iframeUrl}
                    className="w-full h-full border-0"
                    title="Kesher Digital Payment"
                    allow="payment *; clipboard-write; microphone; camera; geolocation"
                  />
                </div>
              </div>
            ) : paymentMethodType === "bit" && donationMode === "one_time" ? (
              /* BIT PAYMENT CARD */
              bitStatus ? (
                <div className={`p-5 rounded-2xl border text-center space-y-4 animate-in fade-in zoom-in-95 ${
                  isDark ? "bg-gradient-to-b from-emerald-950/90 via-slate-900 to-slate-900 border-emerald-500/50 shadow-2xl" : "bg-emerald-50 border-emerald-300 shadow-lg"
                }`}>
                  <div className="relative w-12 h-12 mx-auto">
                    <div className="absolute inset-0 rounded-2xl bg-emerald-500/30 animate-ping opacity-75" />
                    <div className="relative w-12 h-12 rounded-2xl bg-emerald-500 text-slate-950 flex items-center justify-center font-black text-xl shadow-lg border border-emerald-400">
                      bit
                    </div>
                  </div>

                  <div className="space-y-1">
                    <h4 className={`font-black text-base ${isDark ? "text-white" : "text-slate-900"}`}>
                      בקשת התשלום נשלחה ל-Bit בהצלחה! 📲
                    </h4>
                    <p className={`text-xs max-w-sm mx-auto leading-relaxed ${isDark ? "text-slate-200" : "text-slate-700"}`}>
                      נשלחה התראה / מסרון למכשיר הנייד. ניתן גם לסרוק את הקוד או לפתוח ישירות בנייד לאישור תרומה על סך <strong>₪{calculatedTotal.toLocaleString()}</strong>:
                    </p>
                  </div>

                  {/* QR CODE FOR INSTANT SCAN FROM PHONE CAMERA */}
                  {bitStatus.bitUrl && (
                    <div className="p-3 bg-white rounded-2xl inline-block shadow-lg border border-emerald-400 mx-auto">
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(bitStatus.bitUrl)}`} 
                        alt="סרוק עם מצלמת הנייד לתשלום ב-Bit" 
                        className="w-32 h-32 mx-auto rounded-lg"
                      />
                      <p className="text-[11px] font-bold text-slate-800 mt-1.5 flex items-center justify-center gap-1">
                        <span>📸 סרוק במצלמת הנייד לפתיחה ב-Bit</span>
                      </p>
                    </div>
                  )}

                  {bitStatus.phone && (
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
                      <div className={`px-3 py-1 rounded-full text-xs font-mono font-bold ${
                        isDark ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-emerald-100 text-emerald-800"
                      }`}>
                        📱 נשלח למספר: {bitStatus.phone}
                      </div>

                      {bitStatus.bitUrl && (
                        <a
                          href={`https://api.whatsapp.com/send?phone=972${bitStatus.phone.replace(/^0/, '')}&text=${encodeURIComponent('קישור ישיר לאישור תשלום Bit על סך ₪' + calculatedTotal.toLocaleString() + ':\n' + bitStatus.bitUrl)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-full text-xs font-bold transition-all flex items-center gap-1 shadow-sm"
                        >
                          <span>פתח ב-WhatsApp 💬</span>
                        </a>
                      )}
                    </div>
                  )}

                  <div className="space-y-2 pt-1">
                    <button
                      type="button"
                      onClick={async () => {
                        setStep("success");
                        if (onDonationCompleted) {
                          onDonationCompleted();
                        }
                      }}
                      className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black rounded-xl transition-all shadow-md text-sm flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>אישרתי את התשלום באפליקציה ✓</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setBitStatus(null)}
                      className={`w-full py-1 text-xs font-bold transition-colors cursor-pointer ${
                        isDark ? "text-slate-400 hover:text-slate-200" : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      חזור ובחר אמצעי תשלום אחר
                    </button>
                  </div>
                </div>
              ) : (
                <div className={`p-4 rounded-2xl border text-center space-y-2.5 ${
                  isDark ? "bg-gradient-to-b from-emerald-950/60 to-slate-900 border-emerald-500/40" : "bg-emerald-50/70 border-emerald-300"
                }`}>
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto border border-emerald-500/30">
                    <span className="font-black text-lg">bit</span>
                  </div>
                  <div className="space-y-0.5">
                    <h4 className={`font-black text-xs sm:text-sm ${isDark ? "text-white" : "text-slate-900"}`}>תשלום מהיר ומאובטח באפליקציית Bit</h4>
                    <p className={`text-[11px] max-w-sm mx-auto leading-tight ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                      סליקת Bit מאובטחת דרך קשר (Kesher) עבור סכום של ₪{calculatedTotal.toLocaleString()}.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => handlePayWithDigitalWallet("bit")}
                    className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black rounded-xl transition-all shadow-md text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>שולח בקשה ל-Bit...</span>
                      </>
                    ) : (
                      <>
                        <span>מעבר לתשלום ₪{calculatedTotal.toLocaleString()} ב-Bit</span>
                      </>
                    )}
                  </button>
                </div>
              )
            ) : (
              /* DIRECT CREDIT CARD FORM WITH BROWSER AUTOFILL */
              <form onSubmit={handleProcessPayment} className="space-y-2.5 text-sm">
                
                {/* Card Number */}
                <div className="space-y-0.5">
                  <label htmlFor="cc-number" className={`text-[11px] font-bold flex items-center gap-1 ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                    <CreditCard className="w-3.5 h-3.5 text-slate-400" /> מספר כרטיס אשראי *
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
                    className={`w-full border focus:border-emerald-500 rounded-xl p-2 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all font-mono tracking-widest text-left ${
                      isDark ? "bg-slate-800 text-white border-slate-700" : "bg-slate-50 text-slate-900 border-slate-300"
                    }`}
                    maxLength={19}
                  />
                </div>

                {/* ID Number */}
                <div className="space-y-0.5">
                  <label htmlFor="cardholder-id" className={`text-[11px] font-bold flex items-center gap-1 ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                    <User className="w-3.5 h-3.5 text-slate-400" /> תעודת זהות (בעל הכרטיס)
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
                    className={`w-full border focus:border-emerald-500 rounded-xl p-2 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all font-mono tracking-widest text-left ${
                      isDark ? "bg-slate-800 text-white border-slate-700" : "bg-slate-50 text-slate-900 border-slate-300"
                    }`}
                  />
                </div>

                {/* Expiry & CVV Grid */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-0.5">
                    <label htmlFor="cc-exp-month" className={`text-[11px] font-bold flex items-center gap-1 ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                      <Calendar className="w-3.5 h-3.5 text-slate-400" /> תוקף (חודש/שנה) *
                    </label>
                    <div className="flex gap-1">
                      <select
                        id="cc-exp-month"
                        name="cc-exp-month"
                        autoComplete="cc-exp-month"
                        dir="ltr"
                        value={ccData.expiryMonth}
                        onChange={(e) => setCcData({ ...ccData, expiryMonth: e.target.value })}
                        className={`w-full border focus:border-emerald-500 rounded-xl p-1.5 text-xs outline-none font-mono ${
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
                        className={`w-full border focus:border-emerald-500 rounded-xl p-1.5 text-xs outline-none font-mono ${
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

                  <div className="space-y-0.5">
                    <label htmlFor="cc-csc" className={`text-[11px] font-bold flex items-center gap-1 ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                      <Lock className="w-3.5 h-3.5 text-slate-400" /> CVV (3 ספרות) *
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
                      className={`w-full border focus:border-emerald-500 rounded-xl p-1.5 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all font-mono tracking-widest text-left ${
                        isDark ? "bg-slate-800 text-white border-slate-700" : "bg-slate-50 text-slate-900 border-slate-300"
                      }`}
                      maxLength={4}
                    />
                  </div>
                </div>

                {/* Submit Payment CTA */}
                <div className="pt-1">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all shadow-md text-sm sm:text-base flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 cursor-pointer"
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
                  <p className={`text-[10px] text-center mt-1 flex items-center justify-center gap-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                    <Lock className="w-3 h-3 text-emerald-500 inline" /> הסליקה מוצפנת ומאובטחת בתקן PCI-DSS
                  </p>
                </div>

              </form>
            )}
          </div>
        )}

        {/* ================= STEP 3: THANK YOU & SOCIAL SHARING ================= */}
        {step === "success" && (
          <div className="text-center space-y-4 py-6 dir-rtl animate-in fade-in zoom-in-95 duration-300">
            
            {/* Custom Image or Animated Heart / Checkmark Badge */}
            {drawerConfig?.thankYouImage ? (
              <div className="relative mx-auto max-w-[280px] max-h-[180px] rounded-2xl overflow-hidden shadow-2xl border border-amber-500/40 p-1 bg-gradient-to-br from-amber-500/20 via-transparent to-emerald-500/20">
                <img 
                  src={drawerConfig.thankYouImage} 
                  alt="תודה רבה על תרומתך" 
                  className="w-full h-full max-h-[170px] object-cover rounded-xl"
                />
              </div>
            ) : (
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-emerald-500/20 via-amber-500/10 to-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-xl border border-emerald-500/30">
                <Heart className="w-8 h-8 sm:w-10 sm:h-10 fill-rose-500 text-rose-500 animate-pulse" />
              </div>
            )}
            
            <h3 className={`text-2xl sm:text-3xl font-black ${isDark ? "text-white" : "text-slate-900"}`}>
              {drawerConfig?.thankYouTitle || "תודה רבה על תרומתך! ❤️"}
            </h3>
            
            <p className={`text-xs sm:text-sm max-w-md mx-auto leading-relaxed ${isDark ? "text-slate-300" : "text-slate-600"}`}>
              {drawerConfig?.thankYouSubtitle || (
                donationMode === "recurring" 
                  ? `תרומתך בהוראת קבע חודשית בסך ₪${currentMonthly} (למשך ${months} חודשים) עברה בהצלחה ונוספה מיידית ליעד הקמפיין!` 
                  : `תרומתך על סך ₪${calculatedTotal} עברה בהצלחה ונוספה מיידית ליעד הקמפיין!`
              )}
            </p>

            {receiptUrl && (
              <div className="pt-1">
                <a
                  href={receiptUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors shadow-md"
                >
                  <FileText className="w-4 h-4" />
                  <span>צפה בקבלה שהופקה (PDF)</span>
                </a>
              </div>
            )}

            {/* Social Media Sharing Section */}
            <div className={`mt-5 pt-4 border-t space-y-3 ${isDark ? "border-slate-800" : "border-slate-200"}`}>
              <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-amber-400">
                <Share2 className="w-4 h-4" />
                <span>שתפו והפיצו את הבשורה:</span>
              </div>

              {/* Social Buttons Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-w-md mx-auto">
                {/* WhatsApp */}
                <button
                  type="button"
                  onClick={() => {
                    const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
                    const customText = drawerConfig?.thankYouShareText || "תרמתי עכשיו לקמפיין החשוב, הצטרפו גם אתם ועזרו להגיע ליעד!";
                    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(`${customText}\n${shareUrl}`)}`;
                    window.open(url, "_blank", "noopener,noreferrer");
                  }}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold rounded-xl text-xs transition-all shadow-md hover:scale-[1.02] cursor-pointer"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                  </svg>
                  <span>וואטסאפ</span>
                </button>

                {/* Facebook */}
                <button
                  type="button"
                  onClick={() => {
                    const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
                    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
                    window.open(url, "_blank", "noopener,noreferrer,width=600,height=500");
                  }}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-[#1877F2] hover:bg-[#166fe5] text-white font-bold rounded-xl text-xs transition-all shadow-md hover:scale-[1.02] cursor-pointer"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M9 8H6v4h3v12h5V12h3.642L18 8h-4V6.333C14 5.374 14.5 5 15.667 5H18V0h-3.889C10.5 0 9 1.5 9 4.667V8z"/>
                  </svg>
                  <span>פייסבוק</span>
                </button>

                {/* Telegram */}
                <button
                  type="button"
                  onClick={() => {
                    const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
                    const customText = drawerConfig?.thankYouShareText || "תרמתי עכשיו לקמפיין החשוב, הצטרפו גם אתם ועזרו להגיע ליעד!";
                    const url = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(customText)}`;
                    window.open(url, "_blank", "noopener,noreferrer");
                  }}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-[#229ED9] hover:bg-[#1f8ec3] text-white font-bold rounded-xl text-xs transition-all shadow-md hover:scale-[1.02] cursor-pointer"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                  </svg>
                  <span>טלגרם</span>
                </button>

                {/* Copy Link */}
                <button
                  type="button"
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      navigator.clipboard.writeText(window.location.href);
                      setIsCopied(true);
                      setTimeout(() => setIsCopied(false), 2500);
                    }
                  }}
                  className={`flex items-center justify-center gap-1.5 py-2.5 px-3 font-bold rounded-xl text-xs transition-all shadow-md hover:scale-[1.02] cursor-pointer border ${
                    isCopied 
                      ? "bg-emerald-600 text-white border-emerald-500" 
                      : (isDark ? "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700" : "bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300")
                  }`}
                >
                  {isCopied ? (
                    <>
                      <Check className="w-4 h-4 text-white" />
                      <span>הועתק!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>העתק</span>
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
