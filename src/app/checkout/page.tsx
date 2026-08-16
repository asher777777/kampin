"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CreditCard, Loader2 } from "lucide-react";

function CheckoutContent() {
  const searchParams = useSearchParams();
  const plan = searchParams.get("plan") || "basic";
  const [loading, setLoading] = useState(false);

  const plans: Record<string, { name: string; price: number }> = {
    basic: { name: "בסיסי", price: 199 },
    pro: { name: "מקצועי", price: 399 },
    enterprise: { name: "ארגוני", price: 799 },
  };

  const selectedPlan = plans[plan] || plans.basic;

  const handleCheckout = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan,
          amount: selectedPlan.price
        }),
      });
      
      const data = await res.json();
      if (data.success && data.paymentUrl) {
        window.location.href = data.paymentUrl;
      } else {
        alert("שגיאה בתהליך התשלום מול קשר");
      }
    } catch (error) {
      console.error(error);
      alert("שגיאה ביצירת קשר עם השרת");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass rounded-3xl p-8 border border-foreground/10 text-center shadow-lg">
      <div className="p-4 bg-primary-100 dark:bg-primary-900/30 rounded-2xl text-primary-600 dark:text-primary-400 inline-flex mb-6">
        <CreditCard className="w-10 h-10" />
      </div>
      <h1 className="text-3xl font-bold mb-2">סיכום הזמנה</h1>
      <p className="text-foreground/70 mb-8">אתה רוכש את מערכת מחולל הקהילות</p>
      
      <div className="bg-background/50 rounded-xl p-6 border border-foreground/5 mb-8 text-right">
        <div className="flex justify-between items-center mb-4">
          <span className="font-semibold">חבילה נבחרת:</span>
          <span className="text-lg">{selectedPlan.name}</span>
        </div>
        <div className="flex justify-between items-center border-t border-foreground/10 pt-4">
          <span className="font-semibold">סה"כ לתשלום:</span>
          <span className="text-2xl font-bold text-primary-600">₪{selectedPlan.price}</span>
        </div>
      </div>

      <button
        onClick={handleCheckout}
        disabled={loading}
        className="w-full inline-flex h-14 items-center justify-center rounded-full bg-primary-600 px-8 text-lg font-medium text-white shadow-lg shadow-primary-500/20 transition-colors hover:bg-primary-700 disabled:opacity-70"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 ml-2 animate-spin" />
            מעבד תשלום...
          </>
        ) : (
          "המשך לתשלום (קשר)"
        )}
      </button>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] py-12">
      <div className="container px-4 max-w-md mx-auto">
        <Suspense fallback={<div className="text-center py-10"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary-500" /></div>}>
          <CheckoutContent />
        </Suspense>
      </div>
    </div>
  );
}
