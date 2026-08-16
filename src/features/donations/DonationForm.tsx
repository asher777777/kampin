"use client";

import { useState } from "react";
import { SquishyButton } from "@/components/motion/SquishyButton";
import { cn } from "@/lib/utils";
import { Heart, Plus, Trash2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface DonationAmount {
  value: number;
  label: string;
  impact: string;
}

interface DonationFormProps {
  amounts: DonationAmount[];
  isEditing?: boolean;
  onAmountsChange?: (newAmounts: DonationAmount[]) => void;
}

export function DonationForm({ amounts, isEditing, onAmountsChange }: DonationFormProps) {
  const [step, setStep] = useState<"amount" | "details" | "checkout" | "success">("amount");
  const [selectedAmount, setSelectedAmount] = useState<number | null>(180);
  const [customAmount, setCustomAmount] = useState("");
  const [details, setDetails] = useState({ name: "", email: "", phone: "" });

  const finalAmount = selectedAmount || parseFloat(customAmount) || 0;

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomAmount(e.target.value);
    setSelectedAmount(null);
  };

  const updateAmount = (index: number, field: keyof DonationAmount, value: string | number) => {
    if (!onAmountsChange) return;
    const newAmounts = [...amounts];
    newAmounts[index] = { ...newAmounts[index], [field]: value };
    onAmountsChange(newAmounts);
  };

  const addAmount = () => {
    if (!onAmountsChange) return;
    onAmountsChange([...amounts, { value: 100, label: "₪100", impact: "תיאור אימפקט חדש" }]);
  };

  const removeAmount = (index: number) => {
    if (!onAmountsChange) return;
    onAmountsChange(amounts.filter((_, i) => i !== index));
  };

  const proceedToDetails = () => {
    if (finalAmount < 1) {
      alert("נא לבחור סכום חוקי");
      return;
    }
    setStep("details");
  };

  const proceedToCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    if (!details.name || !details.phone) {
      alert("נא למלא שם וטלפון");
      return;
    }
    setStep("checkout");
  };

  if (step === "success") {
    return (
      <div className="bg-card border rounded-[2.5rem] p-8 md:p-12 shadow-2xl space-y-10 text-center">
        <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <Heart className="w-12 h-12 fill-current" />
        </div>
        <h3 className="text-3xl font-black text-primary">תודה רבה!</h3>
        <p className="text-xl text-muted-foreground">התרומה עברה בהצלחה. הקבלה תישלח אליך למייל/סמס.</p>
        <SquishyButton onClick={() => setStep("amount")} className="mt-8">
          חזור לדף הבית
        </SquishyButton>
      </div>
    );
  }

  return (
    <div className="bg-card border rounded-[2.5rem] p-8 md:p-12 shadow-2xl space-y-10 relative overflow-hidden">
      {/* Progress Bar */}
      <div className="absolute top-0 left-0 w-full h-1.5 bg-muted">
        <div 
          className="h-full bg-secondary transition-all duration-500 ease-out"
          style={{ width: step === "amount" ? "33%" : step === "details" ? "66%" : "100%" }}
        />
      </div>

      <div className="space-y-4 text-center">
        <h3 className="text-2xl font-bold text-primary">
          {step === "amount" && "בחרו סכום לתרומה"}
          {step === "details" && "פרטים אישיים"}
          {step === "checkout" && "תשלום מאובטח"}
        </h3>
        <p className="text-muted-foreground">
          {step === "amount" && "התרומה שלך היא הכוח שלנו להמשיך ולהפיץ אור"}
          {step === "details" && `מעולה, תרומה על סך ₪${finalAmount}. לאן לשלוח קבלה?`}
          {step === "checkout" && "בחר שיטת תשלום להשלמת העסקה"}
        </p>
      </div>

      {step === "amount" && (
        <div className="space-y-10 animate-in slide-in-from-right fade-in">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {amounts.map((amount, index) => (
              <div key={index} className="relative group/card">
                <button
                  onClick={() => {
                    if (isEditing) return;
                    setSelectedAmount(amount.value);
                    setCustomAmount("");
                  }}
                  className={cn(
                    "w-full flex flex-col items-center justify-center p-6 rounded-[2rem] border-2 transition-all duration-300",
                    !isEditing && selectedAmount === amount.value
                      ? "border-secondary bg-secondary/5 ring-4 ring-secondary/10"
                      : "border-muted hover:border-primary/20 hover:bg-muted/50",
                    isEditing && "cursor-default"
                  )}
                >
                  {isEditing ? (
                    <div className="space-y-2 w-full">
                      <input 
                        value={amount.label}
                        onChange={(e) => updateAmount(index, "label", e.target.value)}
                        className="text-center font-black text-secondary w-full bg-transparent border-b border-secondary/20"
                      />
                      <textarea 
                        value={amount.impact}
                        onChange={(e) => updateAmount(index, "impact", e.target.value)}
                        className="text-[10px] text-muted-foreground text-center leading-tight w-full bg-transparent border-none resize-none"
                      />
                    </div>
                  ) : (
                    <>
                      <span className={cn(
                        "text-2xl font-black mb-1",
                        selectedAmount === amount.value ? "text-secondary" : "text-primary"
                      )}>
                        {amount.label}
                      </span>
                      <span className="text-[10px] text-muted-foreground text-center leading-tight">
                        {amount.impact}
                      </span>
                    </>
                  )}
                </button>
                
                {isEditing && (
                  <button 
                    onClick={() => removeAmount(index)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white p-1.5 rounded-full shadow-lg opacity-0 group-hover/card:opacity-100 transition-opacity"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            ))}

            {isEditing && (
              <button
                onClick={addAmount}
                className="flex flex-col items-center justify-center p-6 rounded-[2rem] border-2 border-dashed border-primary/20 hover:bg-primary/5 transition-all text-primary/40 hover:text-primary"
              >
                <Plus size={24} />
                <span className="text-[10px] font-bold mt-1">הוסף סכום</span>
              </button>
            )}
          </div>

          {!isEditing && (
            <>
              <div className="relative group">
                <input
                  type="number"
                  placeholder="סכום אחר..."
                  value={customAmount}
                  onChange={handleCustomChange}
                  className={cn(
                    "w-full h-16 ps-14 pe-6 rounded-full bg-muted/30 border-2 transition-all duration-300",
                    "focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/5",
                    "text-xl font-bold text-primary placeholder:text-muted-foreground/50"
                  )}
                />
                <div className="absolute inset-y-0 start-6 flex items-center text-primary/30 group-focus-within:text-primary transition-colors">
                  <span className="text-2xl font-black">₪</span>
                </div>
              </div>

              <SquishyButton 
                onClick={proceedToDetails}
                className="w-full h-16 rounded-full bg-secondary text-secondary-foreground text-xl font-bold shadow-xl hover:shadow-secondary/20 transition-all"
              >
                המשך לפרטים אישיים
                <ArrowRight className="ms-2 h-6 w-6" />
              </SquishyButton>
            </>
          )}
        </div>
      )}

      {step === "details" && !isEditing && (
        <form onSubmit={proceedToCheckout} className="space-y-6 animate-in slide-in-from-right fade-in">
          <div className="space-y-4">
            <input 
              type="text" 
              placeholder="שם מלא *" 
              required
              value={details.name}
              onChange={(e) => setDetails({...details, name: e.target.value})}
              className="w-full h-14 px-6 rounded-2xl bg-muted/30 border-2 focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none font-medium"
            />
            <input 
              type="tel" 
              placeholder="טלפון *" 
              required
              value={details.phone}
              onChange={(e) => setDetails({...details, phone: e.target.value})}
              className="w-full h-14 px-6 rounded-2xl bg-muted/30 border-2 focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none font-medium"
            />
            <input 
              type="email" 
              placeholder="אימייל (אופציונלי לקבלה)" 
              value={details.email}
              onChange={(e) => setDetails({...details, email: e.target.value})}
              className="w-full h-14 px-6 rounded-2xl bg-muted/30 border-2 focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none font-medium"
            />
          </div>
          <div className="flex gap-4">
            <Button type="button" variant="ghost" onClick={() => setStep("amount")} className="h-16 px-8 rounded-full">
              חזור
            </Button>
            <SquishyButton 
              type="submit"
              className="flex-1 h-16 rounded-full bg-secondary text-secondary-foreground text-xl font-bold shadow-xl"
            >
              מעבר לתשלום
            </SquishyButton>
          </div>
        </form>
      )}

      {step === "checkout" && !isEditing && (
        <div className="animate-in slide-in-from-right fade-in text-center py-12">
          <div className="text-xl font-bold text-slate-700 mb-4">רכיב תשלום קשר חסר</div>
          <p className="text-slate-500 mb-6">יש להתקין את רכיב התשלום של קשר למערכת זו.</p>
          <div className="flex gap-4 justify-center">
            <Button variant="outline" onClick={() => setStep("details")}>חזור אחורה</Button>
            <Button onClick={() => setStep("success")}>דלג להצלחה (לצורכי פיתוח)</Button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-center gap-6 text-[10px] text-muted-foreground uppercase tracking-widest font-bold opacity-60">
        <span className="flex items-center gap-1">🔒 SSL Secure</span>
        <span className="flex items-center gap-1">💳 Credit / Bit</span>
        <span className="flex items-center gap-1">🇮🇱 סעיף 46</span>
      </div>
    </div>
  );
}
