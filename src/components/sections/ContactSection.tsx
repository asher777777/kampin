"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { 
  MapPin, Phone, Clock, Settings2, Loader2, Send, 
  CreditCard, Coins, CheckCircle2, ShieldAlert, RefreshCw, 
  ChevronLeft, ChevronRight 
} from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { CRMFormBuilder, FormConfig, FormField } from "@/features/crm/components/CRMFormBuilder";
import { submitCRMForm } from "@/features/crm/actions";
import { KesherCheckout } from "@/features/kesher/KesherCheckout";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";

import { AITextHelper } from "@/components/ui/AITextHelper";

const FALLBACK_CONTACT_FORM: FormConfig = {
  enabled: true,
  form_type: "standard",
  submit_button_text: "שליחת הודעה",
  submit_button_bg_color: "var(--secondary)",
  submit_button_text_color: "var(--secondary-foreground)",
  fields: [
    {
      label: "שם מלא",
      type: "text",
      map_to: "conta_name",
      required: true,
      default_value: "",
      options: "",
      url_param_enable: false,
      url_param_name: "",
      cond_enable: false,
      cond_field_index: 0,
      cond_operator: "is",
      cond_value: ""
    },
    {
      label: "טלפון",
      type: "tel",
      map_to: "conta_phone",
      required: true,
      default_value: "",
      options: "",
      url_param_enable: false,
      url_param_name: "",
      cond_enable: false,
      cond_field_index: 0,
      cond_operator: "is",
      cond_value: ""
    },
    {
      label: "דוא\"ל",
      type: "email",
      map_to: "email",
      required: false,
      default_value: "",
      options: "",
      url_param_enable: false,
      url_param_name: "",
      cond_enable: false,
      cond_field_index: 0,
      cond_operator: "is",
      cond_value: ""
    },
    {
      label: "איך נוכל לעזור?",
      type: "textarea",
      map_to: "notes",
      required: false,
      default_value: "",
      options: "",
      url_param_enable: false,
      url_param_name: "",
      cond_enable: false,
      cond_field_index: 0,
      cond_operator: "is",
      cond_value: ""
    }
  ],
  save_to_crm: true,
  crm_owner_id: "1",
  standard_success_message: "ההודעה התקבלה בהצלחה! נחזור אליכם בהקדם.",
  standard_redirect_url: "",
  standard_whatsapp_message: "שלום {שם מלא}, תודה על פנייתך. ההודעה התקבלה במערכת.",
  standard_whatsapp_image_url: "",
  payment_amount: 180,
  payment_amount_crm_map: "tg2",
  payment_pending_message: "",
  payment_pending_image_url: "",
  payment_success_message: "",
  payment_success_image_url: "",
  payment_group: "",
  payment_zeut_kupa: "",
  payment_receipt_type: "",
  payment_frequency: "one-time"
};

interface ContactSectionProps {
  id?: string;
  title?: string;
  subtitle?: string;
  addressLabel?: string;
  addressVal?: string;
  phoneLabel?: string;
  phoneVal?: string;
  hoursLabel?: string;
  hoursVal?: string;
  form?: FormConfig;
  isEditing?: boolean;
  embeddingPostId?: string;
  embeddingCollection?: string;
  onUpdate?: (field: string, value: any) => void;
}

export const ContactSection = ({
  id,
  title = "נשמח לשמוע ממך",
  subtitle = "יש לכם שאלה? צריכים עזרה במשהו? השאירו פרטים ונחזור אליכם בהקדם.",
  addressLabel = "כתובתנו",
  addressVal = "יצחק שדה 2, אזור",
  phoneLabel = "טלפון",
  phoneVal = "054-594-7701",
  hoursLabel = "שעות פעילות",
  hoursVal = "א'-ה' 09:00-21:00 | ו' עד כניסת שבת",
  form,
  isEditing = false,
  embeddingPostId,
  embeddingCollection,
  onUpdate
}: ContactSectionProps) => {
  const searchParams = useSearchParams();
  const activeForm = form || FALLBACK_CONTACT_FORM;

  // Form rendering states
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [submissionError, setSubmissionError] = useState("");
  const [isRecurring, setIsRecurring] = useState(activeForm.payment_frequency === "recurring");
  const [currentStep, setCurrentStep] = useState(1);

  // Editor states
  const [isFormBuilderOpen, setIsFormBuilderOpen] = useState(false);

  // Kesher Checkout states
  const [showCheckout, setShowCheckout] = useState(false);
  const [checkoutData, setCheckoutData] = useState<{
    amount: number;
    clientName: string;
    phone: string;
    mail: string;
  } | null>(null);

  // Load field values
  useEffect(() => {
    const initialData: Record<string, string> = {};
    if (activeForm.fields) {
      activeForm.fields.forEach((field) => {
        let value = field.default_value || "";
        if (field.url_param_enable && field.url_param_name) {
          const urlVal = searchParams.get(field.url_param_name);
          if (urlVal !== null) {
            value = urlVal;
          }
        }
        initialData[field.label] = value;
      });
    }
    setFormData(initialData);
  }, [activeForm.fields, searchParams]);

  // Helper to check conditional visibility
  const isFieldVisible = (field: FormField) => {
    if (!field.cond_enable) return true;
    const triggerField = activeForm.fields[field.cond_field_index];
    if (!triggerField) return true;
    const currentValue = formData[triggerField.label] || "";
    const operator = field.cond_operator || "is";
    if (operator === "is") return currentValue === field.cond_value;
    if (operator === "is_not") return currentValue !== field.cond_value;
    return true;
  };

  const handleInputChange = (label: string, value: string) => {
    setFormData((prev) => ({ ...prev, [label]: value }));
    if (errors[label]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[label];
        return next;
      });
    }
  };

  // Get active step counts
  const visibleFields = activeForm.fields?.filter(isFieldVisible) || [];
  const stepsList = Array.from(new Set(visibleFields.map((f) => f.step || 1))).sort((a, b) => a - b);
  const totalSteps = stepsList.length > 0 ? Math.max(...stepsList) : 1;

  const getPaymentAmount = () => {
    let amt = activeForm.payment_amount || 0;
    visibleFields.forEach((f) => {
      if (f.map_to === "payment_amount" || f.type === "fixed_amount") {
        const parsed = parseFloat(formData[f.label]);
        if (!isNaN(parsed) && parsed > 0) amt = parsed;
      }
    });
    return amt;
  };

  const validateCurrentStep = () => {
    const newErrors: Record<string, string> = {};
    const currentStepFields = visibleFields.filter((f) => (f.step || 1) === currentStep);

    currentStepFields.forEach((f) => {
      const val = formData[f.label] || "";
      if (f.required && !val.trim()) {
        newErrors[f.label] = "שדה זה הוא חובה";
      }
      if (f.type === "email" && val.trim() && !/\S+@\S+\.\S+/.test(val)) {
        newErrors[f.label] = "כתובת אימייל לא תקינה";
      }
      if (f.type === "tel" && val.trim() && val.replace(/\D/g, "").length < 9) {
        newErrors[f.label] = "מספר טלפון קצר מדי";
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return false;
    }
    return true;
  };

  const handleNextStep = () => {
    if (validateCurrentStep()) {
      setCurrentStep((prev) => Math.min(prev + 1, totalSteps));
    }
  };

  const handlePrevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmissionError("");
    setErrors({});

    const newErrors: Record<string, string> = {};
    visibleFields.forEach((f) => {
      const val = formData[f.label] || "";
      if (f.required && !val.trim()) {
        newErrors[f.label] = "שדה זה הוא חובה";
      }
      if (f.type === "email" && val.trim() && !/\S+@\S+\.\S+/.test(val)) {
        newErrors[f.label] = "כתובת אימייל לא תקינה";
      }
      if (f.type === "tel" && val.trim() && val.replace(/\D/g, "").length < 9) {
        newErrors[f.label] = "מספר טלפון קצר מדי";
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      const firstErrorField = visibleFields.find((f) => newErrors[f.label]);
      if (firstErrorField) setCurrentStep(firstErrorField.step || 1);
      return;
    }

    const cleanFormData: Record<string, string> = {};
    visibleFields.forEach((f) => {
      cleanFormData[f.label] = formData[f.label] || "";
    });

    setSubmitting(true);

    try {
      if (activeForm.form_type === "standard") {
        const res = await submitCRMForm({
          formId: embeddingPostId || "home-contact",
          formTitle: title,
          formType: "standard",
          formData: cleanFormData,
          embeddingPostId: embeddingPostId || "home-contact",
          embeddingPostTitle: title,
          embeddingCollection,
          formConfig: activeForm
        });

        if (res.success) {
          setSuccessMsg(activeForm.standard_success_message || "ההודעה התקבלה בהצלחה! נחזור אליכם בהקדם.");
          setIsSubmitted(true);
          if (activeForm.standard_redirect_url) {
            setTimeout(() => {
              window.location.href = activeForm.standard_redirect_url;
            }, 1000);
          }
        } else {
          setSubmissionError(res.error || "שגיאה בשליחת הודעה. אנא נסה שנית.");
        }
      } else {
        let clientName = "";
        let phone = "";
        let mail = "";

        visibleFields.forEach((f) => {
          const val = formData[f.label] || "";
          if (f.map_to === "conta_name") clientName = val;
          if (f.map_to === "conta_phone" || f.type === "tel") phone = val;
          if (f.map_to === "email" || f.type === "email") mail = val;
        });

        const amount = getPaymentAmount();
        
        if (amount <= 0) {
          await submitCRMForm({
            formId: embeddingPostId || "home-contact",
            formTitle: title,
            formType: activeForm.form_type,
            formData: cleanFormData,
            embeddingPostId: embeddingPostId || "home-contact",
            embeddingPostTitle: title,
            embeddingCollection,
            formConfig: activeForm,
            status: "הושלם (חינם)"
          });

          setSuccessMsg(activeForm.standard_success_message || "הרישום בוצע בהצלחה!");
          setIsSubmitted(true);
          
          if (activeForm.standard_redirect_url) {
            setTimeout(() => {
              window.location.href = activeForm.standard_redirect_url;
            }, 1000);
          }
          return;
        }

        await submitCRMForm({
          formId: embeddingPostId || "home-contact",
          formTitle: title,
          formType: activeForm.form_type === "register" ? "register" : "payment",
          formData: cleanFormData,
          embeddingPostId: embeddingPostId || "home-contact",
          embeddingPostTitle: title,
          embeddingCollection,
          formConfig: activeForm,
          status: "ממתין לתשלום"
        });

        setCheckoutData({ amount, clientName, phone, mail });
        setShowCheckout(true);
      }
    } catch (err: any) {
      setSubmissionError(err.message || "שגיאה לא צפויה בפנייה לשרת");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePaymentSuccess = async () => {
    if (!checkoutData) return;
    setSubmitting(true);
    setShowCheckout(false);
    setSubmissionError("");

    try {
      const cleanFormData: Record<string, string> = {};
      visibleFields.forEach((f) => {
        cleanFormData[f.label] = formData[f.label] || "";
      });

      const res = await submitCRMForm({
        formId: embeddingPostId || "home-contact",
        formTitle: title,
        formType: "payment",
        formData: cleanFormData,
        embeddingPostId: embeddingPostId || "home-contact",
        embeddingPostTitle: title,
        embeddingCollection,
        formConfig: activeForm,
        status: "תשלום בוצע",
        amountPaid: checkoutData.amount
      });

      if (res.success) {
        setSuccessMsg(`התשלום בסך ₪${checkoutData.amount} בוצע והתקבל בהצלחה! קבלה והודעה נשלחו לוואטסאפ.`);
        setIsSubmitted(true);
      } else {
        setSuccessMsg(`התשלום עבר, אך אירעה שגיאה בעדכון ה-CRM: ${res.error}.`);
        setIsSubmitted(true);
      }
    } catch (err: any) {
      setSubmissionError("שגיאה ברישום התשלום במערכת: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const formBgStyle = activeForm.form_bg_color ? { backgroundColor: activeForm.form_bg_color } : undefined;
  const fieldBgStyle = activeForm.field_bg_color ? { backgroundColor: activeForm.field_bg_color } : undefined;

  return (
    <section id={id} className="py-24 px-6 bg-background overflow-hidden" dir="rtl">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.6 }}
        className="max-w-7xl mx-auto"
      >
        <div className="bg-primary rounded-[3rem] overflow-hidden shadow-2xl flex flex-col lg:flex-row text-right">
          
          {/* Form Side */}
          <div className="w-full lg:w-3/5 p-8 md:p-16 space-y-8" style={formBgStyle}>
            <div className="space-y-4">
              {isEditing ? (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-white/80">כותרת טופס</label>
                  <div className="relative w-full">
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => onUpdate?.("title", e.target.value)}
                      className="text-2xl md:text-3xl font-bold text-primary-foreground bg-primary-foreground/10 border border-primary-foreground/20 rounded-xl px-4 pl-24 py-2 w-full focus:outline-none focus:ring-2 focus:ring-secondary"
                    />
                    <AITextHelper value={title || ""} onChange={(val) => onUpdate?.("title", val)} />
                  </div>
                </div>
              ) : (
                <h2 className="text-3xl md:text-5xl font-bold text-primary-foreground">{title}</h2>
              )}

              {isEditing ? (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-white/80">תיאור טופס</label>
                  <div className="relative w-full">
                    <textarea
                      value={subtitle}
                      onChange={(e) => onUpdate?.("subtitle", e.target.value)}
                      rows={2}
                      className="text-primary-foreground/80 bg-primary-foreground/10 border border-primary-foreground/20 rounded-xl px-4 pl-24 py-2 w-full text-sm focus:outline-none focus:ring-2 focus:ring-secondary resize-none"
                    />
                    <AITextHelper value={subtitle || ""} onChange={(val) => onUpdate?.("subtitle", val)} />
                  </div>
                </div>
              ) : (
                <p className="text-primary-foreground/80 text-lg leading-relaxed">
                  {subtitle}
                </p>
              )}
            </div>

            {isEditing && onUpdate && (
              <div className="w-full flex justify-start pb-2 border-b border-white/10">
                <Button 
                  onClick={() => setIsFormBuilderOpen(true)} 
                  className="bg-white/10 hover:bg-white/20 text-white rounded-full px-6 py-2 shadow-xl flex items-center gap-2 font-bold text-sm border border-white/20 cursor-pointer"
                >
                  <Settings2 className="w-4 h-4" />
                  ערוך הגדרות ושדות טופס צור קשר
                </Button>
                <Modal isOpen={isFormBuilderOpen} onClose={() => setIsFormBuilderOpen(false)}>
                  <Modal.Content className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 bg-transparent border-0 shadow-none">
                    <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-700/50 rounded-[2.5rem] p-4 text-slate-100 relative">
                      <Modal.Close className="top-4 right-4 text-slate-400 hover:text-white" />
                      <CRMFormBuilder
                        value={activeForm}
                        onChange={(formConfig) => onUpdate("form", formConfig)}
                      />
                    </div>
                  </Modal.Content>
                </Modal>
              </div>
            )}

            {isSubmitted ? (
              <div className="bg-white/5 border border-white/10 rounded-[2rem] p-8 text-center space-y-6 animate-in zoom-in-95 duration-500 max-w-[480px]">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto shadow-lg animate-bounce">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-black text-primary-foreground leading-tight">הפעולה בוצעה בהצלחה!</h3>
                <p className="text-primary-foreground/80 text-sm leading-relaxed px-2">
                  {successMsg}
                </p>
                <Button
                  onClick={() => {
                    setIsSubmitted(false);
                    setSuccessMsg("");
                    setCheckoutData(null);
                    setCurrentStep(1);
                    const cleanData: Record<string, string> = {};
                    activeForm.fields.forEach((f) => {
                      cleanData[f.label] = f.default_value || "";
                    });
                    setFormData(cleanData);
                  }}
                  className="bg-white/10 hover:bg-white/20 text-white font-bold px-6 py-2.5 rounded-full border border-white/20 cursor-pointer"
                >
                  שלח הודעה חדשה
                </Button>
              </div>
            ) : showCheckout && checkoutData ? (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-4 text-white">
                <div className="flex items-center gap-2 text-white border-b border-white/10 pb-3 mb-4">
                  <Coins className="w-5 h-5 text-secondary" />
                  <h4 className="font-bold text-base">תשלום מאובטח</h4>
                </div>
                <div className="bg-white/5 border border-white/10 p-4 rounded-2xl text-xs space-y-1.5 mb-2">
                  <div><strong>עבור:</strong> <span className="text-white/80">{title}</span></div>
                  <div><strong>משלם:</strong> <span className="text-white/80">{checkoutData.clientName || "-- ללא שם --"}</span></div>
                  <div><strong>טלפון:</strong> <span className="text-white/80">{checkoutData.phone}</span></div>
                  <div><strong>סכום לחיוב:</strong> <span className="font-black text-secondary">₪{checkoutData.amount} {activeForm.payment_frequency === "recurring" && "(הוראת קבע לחודש)"}</span></div>
                </div>
                <KesherCheckout
                  amount={checkoutData.amount}
                  description={title}
                  onSuccess={handlePaymentSuccess}
                />
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {submissionError && (
                  <div className="p-3 bg-red-950/40 border border-red-500/30 text-red-200 text-xs font-bold rounded-2xl flex items-center gap-2 animate-shake">
                    <ShieldAlert className="w-4 h-4 shrink-0 text-red-400" />
                    <span>{submissionError}</span>
                  </div>
                )}

                {/* Steps Progress Indicator */}
                {totalSteps > 1 && (
                  <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
                    <span className="text-xs font-bold text-white/50">שלב {currentStep} מתוך {totalSteps}</span>
                    <div className="flex gap-1.5">
                      {Array.from({ length: totalSteps }).map((_, i) => (
                        <div
                          key={i}
                          className={cn(
                            "h-2 w-8 rounded-full transition-all",
                            i + 1 <= currentStep ? "bg-secondary" : "bg-white/20"
                          )}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Fields Layout Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activeForm.fields?.map((field, idx) => {
                    if (!isFieldVisible(field)) return null;

                    const isHiddenOrFixed = ["hidden", "fixed_amount"].includes(field.type);
                    if (!isHiddenOrFixed && (field.step || 1) !== currentStep) return null;

                    const hasError = errors[field.label];
                    const isFullSpan = field.type === "textarea" || field.type === "fixed_amount";

                    return (
                      <div 
                        key={idx} 
                        className={cn(
                          "space-y-1.5",
                          isFullSpan ? "md:col-span-2" : ""
                        )}
                      >
                        {field.type === "hidden" ? (
                          <input type="hidden" name={field.label} value={formData[field.label] || ""} />
                        ) : field.type === "fixed_amount" ? (
                          <div 
                            style={fieldBgStyle}
                            className="bg-primary-foreground/10 border border-primary-foreground/20 p-4 rounded-xl flex justify-between items-center text-xs text-primary-foreground"
                          >
                            <span className="font-semibold text-primary-foreground/80">{field.label}:</span>
                            <span className="font-mono font-bold text-primary-foreground">₪{formData[field.label] || field.default_value}</span>
                          </div>
                        ) : (
                          <>
                            <label className="block text-xs font-bold text-white/90">
                              {field.label}
                              {field.required && <span className="text-red-400 mr-1">*</span>}
                            </label>

                            {field.type === "textarea" ? (
                              <textarea
                                value={formData[field.label] || ""}
                                onChange={(e) => handleInputChange(field.label, e.target.value)}
                                style={fieldBgStyle}
                                className={cn(
                                  "bg-white/10 border text-white placeholder:text-white/50 min-h-[150px] rounded-2xl p-4 w-full text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50 resize-none transition-all outline-none",
                                  hasError ? "border-red-400 bg-red-950/20" : "border-white/20 focus:border-white/40"
                                )}
                                placeholder={field.label}
                                required={field.required}
                                disabled={isEditing}
                              />
                            ) : field.type === "select" ? (
                              <select
                                value={formData[field.label] || ""}
                                onChange={(e) => handleInputChange(field.label, e.target.value)}
                                style={fieldBgStyle}
                                className={cn(
                                  "bg-white/10 border text-white placeholder:text-white/50 h-14 rounded-2xl w-full px-4 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50 transition-all outline-none",
                                  hasError ? "border-red-400 bg-red-950/20" : "border-white/20 focus:border-white/40"
                                )}
                                required={field.required}
                                disabled={isEditing}
                              >
                                <option className="text-slate-800" value="">בחר...</option>
                                {field.options.split("\n").map(opt => {
                                  const clean = opt.trim();
                                  if (!clean) return null;
                                  return <option className="text-slate-800" key={clean} value={clean}>{clean}</option>;
                                })}
                              </select>
                            ) : (
                              <input
                                type={field.type === "email" ? "email" : field.type === "tel" ? "tel" : field.type === "number" ? "number" : "text"}
                                value={formData[field.label] || ""}
                                onChange={(e) => handleInputChange(field.label, e.target.value)}
                                style={fieldBgStyle}
                                className={cn(
                                  "bg-white/10 border text-white placeholder:text-white/50 h-14 rounded-2xl w-full px-4 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50 transition-all outline-none",
                                  hasError ? "border-red-400 bg-red-950/20" : "border-white/20 focus:border-white/40"
                                )}
                                placeholder={field.label}
                                required={field.required}
                                disabled={isEditing}
                              />
                            )}

                            {hasError && (
                              <p className="text-[10px] text-red-300 font-bold mt-0.5 animate-in slide-in-from-top-1">
                                {hasError}
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>

                {activeForm.form_type === "payment" && activeForm.payment_frequency === "user-choice" && currentStep === totalSteps && (
                  <div className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-xl mb-4 text-white">
                    <button
                      type="button"
                      onClick={() => setIsRecurring(!isRecurring)}
                      className={cn(
                        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                        isRecurring ? 'bg-secondary' : 'bg-white/20'
                      )}
                    >
                      <span
                        className={cn(
                          "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                          isRecurring ? 'translate-x-6' : 'translate-x-1'
                        )}
                      />
                    </button>
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <RefreshCw className="w-4 h-4 text-secondary animate-spin-slow" />
                      הפוך לתרומה חודשית קבועה
                    </div>
                  </div>
                )}

                {/* Stepper Footer Controls */}
                <div className="flex gap-3 pt-4 md:col-span-2">
                  {currentStep > 1 && (
                    <Button
                      type="button"
                      onClick={handlePrevStep}
                      className="flex-1 h-14 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-lg flex items-center justify-center gap-1.5 border border-white/20 cursor-pointer"
                    >
                      <ChevronRight className="w-5 h-5" />
                      חזור
                    </Button>
                  )}
                  
                  {currentStep < totalSteps ? (
                    <Button
                      type="button"
                      onClick={handleNextStep}
                      className="flex-1 h-14 rounded-2xl bg-secondary text-secondary-foreground hover:bg-secondary/90 text-lg font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-lg"
                    >
                      המשך
                      <ChevronLeft className="w-5 h-5" />
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      disabled={submitting}
                      className="flex-1 h-14 rounded-2xl bg-secondary text-secondary-foreground hover:bg-secondary/90 text-lg font-bold flex items-center justify-center gap-2 cursor-pointer shadow-lg"
                    >
                      {submitting ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : activeForm.form_type === "payment" ? (
                        <CreditCard className="w-5 h-5" />
                      ) : (
                        <Send className="w-5 h-5" />
                      )}
                      {submitting ? "שולח..." : activeForm.submit_button_text || "שליחת הודעה"}
                    </Button>
                  )}
                </div>
              </form>
            )}
          </div>

          {/* Info Side */}
          <div className="w-full lg:w-2/5 bg-secondary p-8 md:p-16 flex flex-col justify-center gap-12">
            <div className="space-y-8">
              <h3 className="text-3xl font-bold text-secondary-foreground">פרטי קשר</h3>
              
              <div className="space-y-6">
                {/* Address */}
                <div className="flex gap-4 items-start">
                  <div className="p-3 bg-white/20 rounded-xl text-secondary-foreground shrink-0">
                    <MapPin className="h-6 w-6" />
                  </div>
                  <div className="flex-grow space-y-1">
                    {isEditing ? (
                      <div className="space-y-1">
                        <input
                          type="text"
                          value={addressLabel}
                          onChange={(e) => onUpdate?.("addressLabel", e.target.value)}
                          className="font-bold text-secondary-foreground bg-white/10 border border-black/10 rounded-lg px-2 py-0.5 text-sm w-full"
                        />
                        <input
                          type="text"
                          value={addressVal}
                          onChange={(e) => onUpdate?.("addressVal", e.target.value)}
                          className="text-secondary-foreground/80 bg-white/10 border border-black/10 rounded-lg px-2 py-0.5 text-xs w-full"
                        />
                      </div>
                    ) : (
                      <>
                        <p className="font-bold text-secondary-foreground">{addressLabel}</p>
                        <p className="text-secondary-foreground/80">{addressVal}</p>
                      </>
                    )}
                  </div>
                </div>

                {/* Phone */}
                <div className="flex gap-4 items-start">
                  <div className="p-3 bg-white/20 rounded-xl text-secondary-foreground shrink-0">
                    <Phone className="h-6 w-6" />
                  </div>
                  <div className="flex-grow space-y-1">
                    {isEditing ? (
                      <div className="space-y-1">
                        <input
                          type="text"
                          value={phoneLabel}
                          onChange={(e) => onUpdate?.("phoneLabel", e.target.value)}
                          className="font-bold text-secondary-foreground bg-white/10 border border-black/10 rounded-lg px-2 py-0.5 text-sm w-full"
                        />
                        <input
                          type="text"
                          value={phoneVal}
                          onChange={(e) => onUpdate?.("phoneVal", e.target.value)}
                          className="text-secondary-foreground/80 bg-white/10 border border-black/10 rounded-lg px-2 py-0.5 text-xs w-full"
                        />
                      </div>
                    ) : (
                      <>
                        <p className="font-bold text-secondary-foreground">{phoneLabel}</p>
                        <p className="text-secondary-foreground/80">{phoneVal}</p>
                      </>
                    )}
                  </div>
                </div>

                {/* Hours */}
                <div className="flex gap-4 items-start">
                  <div className="p-3 bg-white/20 rounded-xl text-secondary-foreground shrink-0">
                    <Clock className="h-6 w-6" />
                  </div>
                  <div className="flex-grow space-y-1">
                    {isEditing ? (
                      <div className="space-y-1">
                        <input
                          type="text"
                          value={hoursLabel}
                          onChange={(e) => onUpdate?.("hoursLabel", e.target.value)}
                          className="font-bold text-secondary-foreground bg-white/10 border border-black/10 rounded-lg px-2 py-0.5 text-sm w-full"
                        />
                        <input
                          type="text"
                          value={hoursVal}
                          onChange={(e) => onUpdate?.("hoursVal", e.target.value)}
                          className="text-secondary-foreground/80 bg-white/10 border border-black/10 rounded-lg px-2 py-0.5 text-xs w-full"
                        />
                      </div>
                    ) : (
                      <>
                        <p className="font-bold text-secondary-foreground">{hoursLabel}</p>
                        <p className="text-secondary-foreground/80">{hoursVal}</p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </motion.div>
    </section>
  );
};
