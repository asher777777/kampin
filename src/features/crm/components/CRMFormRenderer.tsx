"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Send, CheckCircle2, Loader2, Coins, CreditCard, ShieldAlert, RefreshCw, ChevronLeft, ChevronRight, User, Phone, Mail, MapPin, Building, Briefcase, Calendar, FileText, Heart, Smile, AlertCircle, Lock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { FormConfig, FormField, LogicAction } from "./CRMFormBuilder";
import { submitCRMForm } from "@/features/crm/actions";
import { KesherCheckout } from "@/features/kesher/KesherCheckout";
import { cn } from "@/lib/utils";

import * as LucideIcons from "lucide-react";

const evaluateFormula = (formula: string, data: Record<string, string>) => {
  if (!formula) return 0;
  
  // Replace [Field Name] with its numeric value. Supports swapped brackets e.g. ]Field[
  let evaluatedFormula = formula.replace(/[\[\]]([^\[\]]+)[\[\]]/g, (_match, fieldName) => {
    const cleanFieldName = fieldName.trim();
    // Find matching key even if there are trailing/leading spaces in the actual label
    const actualKey = Object.keys(data).find(k => k.trim() === cleanFieldName);
    const rawVal = actualKey ? data[actualKey] : "0";
    
    // Extract first number (handles "980 - מסלול" => 980)
    const numMatch = String(rawVal).match(/-?\d+(\.\d+)?/);
    return numMatch ? numMatch[0] : "0";
  });

  // Strip anything that is not a digit, operator, parenthesis, or decimal point to prevent JS injection
  evaluatedFormula = evaluatedFormula.replace(/[^0-9\+\-\*\/\(\)\.\s]/g, "");

  try {
    const result = new Function(`return ${evaluatedFormula || 0}`)();
    return Number.isFinite(result) ? result : 0;
  } catch (e) {
    return 0;
  }
};

const getAutoAutocomplete = (field: FormField) => {
  if (field.autocomplete) return field.autocomplete;
  
  if (field.map_to === "conta_name") return "name";
  if (field.map_to === "f_m") return "family-name";
  if (field.map_to === "email") return "email";
  if (field.map_to === "conta_phone") return "tel";
  if (field.map_to === "work_phone") return "tel-local";
  if (field.map_to === "mh_crm_city") return "address-level2";
  if (field.map_to === "mh_crm_street") return "street-address";
  if (field.map_to === "company_name") return "organization";
  if (field.map_to === "job_title") return "organization-title";
  if (field.map_to === "birth_date") return "bday";
  
  if (field.type === "email") return "email";
  if (field.type === "tel") return "tel";
  
  const label = field.label || "";
  if (label.includes('שם פרטי')) return "given-name";
  if (label.includes('שם משפחה')) return "family-name";
  if (label.includes('שם')) return "name";
  if (label.includes('טלפון') || label.includes('נייד')) return "tel";
  if (label.includes('אימייל') || label.includes('דוא"ל') || label.includes('מייל') || label.toLowerCase().includes('email')) return "email";
  if (label.includes('עיר') || label.includes('ישוב')) return "address-level2";
  if (label.includes('רחוב') || label.includes('כתובת')) return "street-address";
  
  return undefined;
};

interface CRMFormRendererProps {
  config: FormConfig;
  formId: string; // usually slug
  formTitle: string; // page title
  embeddingCollection?: string;
}

export function CRMFormRenderer({ config, formId, formTitle, embeddingCollection }: CRMFormRendererProps) {
  const searchParams = useSearchParams();

  // Form State
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Submission Flow States
  const [submitting, setSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [submissionError, setSubmissionError] = useState("");
  const [isRecurring, setIsRecurring] = useState(config.payment_frequency === "recurring");

  // Multi-step logic state
  const [currentStep, setCurrentStep] = useState(1);

  // Payment states
  const [showCheckout, setShowCheckout] = useState(false);
  const [checkoutData, setCheckoutData] = useState<{
    amount: number;
    clientName: string;
    phone: string;
    mail: string;
  } | null>(null);

  const [ccData, setCcData] = useState({
    creditNumber: "",
    expiryMonth: "",
    expiryYear: "",
    cvv2: "",
    id: "",
    paymentMethod: "one-time",
    installments: 1
  });
  const [isRecurringChecked, setIsRecurringChecked] = useState(config.payment_frequency === "recurring");

  // Initialize form field values from default values and URL params
  useEffect(() => {
    const initialData: Record<string, string> = {};
    config.fields.forEach((field) => {
      let value = field.default_value || "";
      
      // Pull from URL parameter if enabled
      if (field.url_param_enable && field.url_param_name) {
        const urlVal = searchParams.get(field.url_param_name);
        if (urlVal !== null) {
          value = urlVal;
        }
      }
      initialData[field.label] = value;
    });
    setFormData(initialData);
  }, [config.fields, searchParams]);

  // Helper to check conditional logic for a field
  const isFieldVisible = (field: FormField) => {
    if (!field.cond_enable) return true;
    
    const triggerField = config.fields[field.cond_field_index];
    if (!triggerField) return true;

    const currentValue = formData[triggerField.label] || "";
    const operator = field.cond_operator || "is";

    if (operator === "is") {
      return currentValue === field.cond_value;
    } else if (operator === "is_not") {
      return currentValue !== field.cond_value;
    }

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

  // Dynamically calculate steps based on field positions
  const enrichedFields = useMemo(() => {
    let currentStep = 1;
    return config.fields.map((f, i) => {
      if (f.type === "step") {
        if (i !== 0) currentStep++;
        return { ...f, _calculatedStep: currentStep, _isStepDivider: true };
      }
      return { ...f, _calculatedStep: currentStep, _isStepDivider: false };
    });
  }, [config.fields]);

  const dynamicStepConfigs = useMemo(() => {
    const stepConfigsMap = new Map();
    
    // Extract default styling from the first step field (or first field) so Step 1 can be styled
    const firstStepField = config.fields && config.fields.find(f => f.type === "step");
    const fallbackField = firstStepField || (config.fields && config.fields[0]);
    const defaultTextColor = fallbackField?.textColor || "#ffffff";
    const defaultTextAlign = (fallbackField as any)?.textAlign || "center";
    
    // If the user added a step field at the end of the form, it doesn't divide anything, but they probably meant it as the form's header
    const hasEffectiveStepDivider = config.fields?.some((f, i) => f.type === "step" && i !== 0 && config.fields.slice(i + 1).some(nf => nf.type !== "step"));
    const defaultTitle = (!hasEffectiveStepDivider && firstStepField) ? firstStepField.label : "שלב 1";
    const defaultIcon = (!hasEffectiveStepDivider && firstStepField) ? firstStepField.icon : "user";

    enrichedFields.forEach((f) => {
      if (f._isStepDivider) {
        stepConfigsMap.set(f._calculatedStep, {
          step: f._calculatedStep,
          title: f.label,
          icon: f.icon || "user",
          submitOnNext: f.submitOnNext || false,
          textColor: f.textColor || defaultTextColor,
          textAlign: (f as any).textAlign || defaultTextAlign,
          buttonText: f.step_button_text,
          buttonIcon: f.step_button_icon,
          buttonBgColor: f.step_button_bg_color,
          buttonTextColor: f.step_button_text_color,
          backButtonText: f.step_back_button_text,
          backButtonBgColor: f.step_back_button_bg_color,
          backButtonTextColor: f.step_back_button_text_color
        });
      }
    });
    if (!stepConfigsMap.has(1)) {
      stepConfigsMap.set(1, { 
        step: 1, 
        title: defaultTitle, 
        icon: defaultIcon || "user", 
        submitOnNext: false,
        textColor: defaultTextColor,
        textAlign: defaultTextAlign
      });
    }
    return stepConfigsMap;
  }, [enrichedFields]);

  // Get active step counts
  const visibleFields = enrichedFields.filter((f) => !f._isStepDivider && isFieldVisible(f));
  const stepsList = Array.from(new Set(visibleFields.map((f) => f._calculatedStep))).sort((a, b) => a - b);
  const totalSteps = stepsList.length > 0 ? Math.max(...stepsList) : 1;

  // Extract payment amount from fields or default config
  const getPaymentAmount = () => {
    let amt = config.payment_amount || 0;
    
    enrichedFields.forEach((f) => {
      const logicallyVisible = (() => {
        if (!f.cond_enable) return true;
        const triggerField = config.fields[f.cond_field_index];
        if (!triggerField) return true;
        const currentValue = formData[triggerField.label] || "";
        const operator = f.cond_operator || "is";
        if (operator === "is") return currentValue === f.cond_value;
        if (operator === "is_not") return currentValue !== f.cond_value;
        return true;
      })();

      if (logicallyVisible && !f._isStepDivider) {
        if (f.map_to === "payment_amount" || f.type === "fixed_amount") {
          let valStr = formData[f.label];
          if (f.type === "calculated") {
            valStr = String(evaluateFormula(f.calc_formula || "", formData));
          }
          const parsed = parseFloat(valStr);
          if (!isNaN(parsed) && parsed > 0) {
            amt = parsed;
          }
        }
      }
    });
    return amt;
  };

  // Validate only the current step fields
  const validateCurrentStep = () => {
    const newErrors: Record<string, string> = {};
    const currentStepFields = visibleFields.filter((f) => f._calculatedStep === currentStep);

    currentStepFields.forEach((f) => {
      const val = formData[f.label] || "";
      const excludedTypes = ["calculated", "payment_summary", "payment_cc", "rich_text_display"];
      if (f.required && !val.trim() && !excludedTypes.includes(f.type)) {
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

  const handleNextStep = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
    }
    if (validateCurrentStep()) {
      const nextStepNum = Math.min(currentStep + 1, totalSteps);
      
      // Partial CRM Save Logic
      if (config.save_to_crm && config.crm_save_step && currentStep === config.crm_save_step) {
        if (formId === "preview") {
          console.log("Preview Mode: Mock partial CRM save for step", currentStep);
        } else {
          setSubmitting(true);
          try {
            const cleanFormData: Record<string, string> = {};
          visibleFields.forEach((f) => {
            if (f.type === "calculated") {
              cleanFormData[f.label] = String(evaluateFormula(f.calc_formula || "", formData));
            } else {
              cleanFormData[f.label] = formData[f.label] || "";
            }
          });
          
          await submitCRMForm({
            formId,
            formTitle,
            formType: "standard",
            formData: cleanFormData,
            embeddingPostId: formId,
            embeddingPostTitle: formTitle,
            embeddingCollection,
            formConfig: config,
            status: "ליד חלקי (משלב " + currentStep + ")"
          });
        } catch(e) {
          console.error("Partial save failed", e);
        }
        setSubmitting(false);
      }
    }

      setCurrentStep(nextStepNum);
    }
  };

  const handlePrevStep = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
    }
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmissionError("");
    setErrors({});

    // Final Validation of all visible fields
    const newErrors: Record<string, string> = {};
    visibleFields.forEach((f) => {
      const val = formData[f.label] || "";
      const excludedTypes = ["calculated", "payment_summary", "payment_cc", "rich_text_display"];
      if (f.required && !val.trim() && !excludedTypes.includes(f.type)) {
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
      // Fallback to first step containing an error
      const firstErrorField = visibleFields.find((f) => newErrors[f.label]);
      if (firstErrorField) {
        setCurrentStep(firstErrorField._calculatedStep || 1);
      }
      return;
    }

    // Prepare data for submission
    const cleanFormData: Record<string, string> = {};
    visibleFields.forEach((f) => {
      if (f.type === "calculated") {
        cleanFormData[f.label] = String(evaluateFormula(f.calc_formula || "", formData));
      } else {
        cleanFormData[f.label] = formData[f.label] || "";
      }
    });

    setSubmitting(true);

    try {
      // Evaluate action rules
      let matchedRule: LogicAction | null = null;
      if (config.action_rules && config.action_rules.length > 0) {
        for (const rule of config.action_rules) {
          const triggerField = config.fields[rule.field_index];
          if (!triggerField) continue;
          
          const currentValue = formData[triggerField.label] || "";
          if (rule.operator === "is" && currentValue === rule.value) {
            matchedRule = rule;
            break;
          } else if (rule.operator === "is_not" && currentValue !== rule.value) {
            matchedRule = rule;
            break;
          }
        }
      }

      let effectiveFormType = config.form_type;
      let actionRedirectUrl = config.standard_redirect_url;
      let showCustomModal = config.custom_success_modal_enable;
      
      if (matchedRule) {
        if (matchedRule.action_type === "payment") {
          effectiveFormType = "payment";
        } else if (matchedRule.action_type === "redirect") {
          effectiveFormType = "standard";
          actionRedirectUrl = matchedRule.action_value;
          showCustomModal = false;
        } else if (matchedRule.action_type === "modal") {
          effectiveFormType = "standard";
          showCustomModal = true;
        }
      }

      if (effectiveFormType === "standard") {
        let res: any = { success: true, error: "" };
        if (formId === "preview") {
          console.log("Preview Mode: Mock CRM full submission");
          // Fake delay to show loading state
          await new Promise(r => setTimeout(r, 800));
        } else {
          res = await submitCRMForm({
            formId,
            formTitle,
            formType: "standard",
            formData: cleanFormData,
            embeddingPostId: formId,
            embeddingPostTitle: formTitle,
            embeddingCollection,
            formConfig: config
          });
        }

        if (res.success) {
          if (matchedRule && matchedRule.action_type === "modal" && matchedRule.action_value) {
            setSuccessMsg(matchedRule.action_value);
          } else if (showCustomModal && config.custom_success_modal_content) {
            setSuccessMsg(config.custom_success_modal_content);
          } else {
            setSuccessMsg(config.standard_success_message || "הטופס נשלח בהצלחה.");
          }
          setIsSubmitted(true);
          
          // Clear form
          const cleanData: Record<string, string> = {};
          enrichedFields.forEach((f) => {
            if (f._isStepDivider) return;
            cleanData[f.label] = f.default_value || "";
          });
          setFormData(cleanData);
          setCurrentStep(1);
          setCheckoutData(null);
          
          if (actionRedirectUrl) {
            setTimeout(() => {
              window.location.href = actionRedirectUrl;
            }, 1000);
          }
        } else {
          setSubmissionError(res.error || "שגיאה בשליחת הטופס. אנא נסה שנית.");
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
        
        if (amount < 0) {
          throw new Error("סכום לתשלום לא יכול להיות שלילי");
        }

        // Check if user selected cash/bank transfer to bypass credit card checkout
        const isCashPayment = Object.entries(formData).some(([key, val]) => 
           (key.includes("אמצעי תשלום") || key.includes("אופן תשלום")) && 
           typeof val === "string" && 
           (val.includes("מזומן") || val.includes("העברה"))
        );

        if (isCashPayment || amount === 0) {
          const isFree = amount === 0 && !isCashPayment;
          await submitCRMForm({
            formId,
            formTitle,
            formType: effectiveFormType,
            formData: cleanFormData,
            embeddingPostId: formId,
            embeddingPostTitle: formTitle,
            embeddingCollection,
            formConfig: config,
            status: isFree ? "הושלם (חינם)" : "ממתין לתשלום (מזומן/העברה)"
          });
          
          if (isFree) {
            if (matchedRule && matchedRule.action_type === "modal" && matchedRule.action_value) {
              setSuccessMsg(matchedRule.action_value);
            } else if (showCustomModal && config.custom_success_modal_content) {
              setSuccessMsg(config.custom_success_modal_content);
            } else {
              setSuccessMsg(config.standard_success_message || "הרישום בוצע בהצלחה!");
            }
          } else {
            setSuccessMsg("פרטי הרישום התקבלו בהצלחה! הרישום לקייטנה יושלם סופית רק לאחר הסדרת התשלום מול המשרד.");
          }
          setIsSubmitted(true);
          
          if (isFree && actionRedirectUrl) {
            setTimeout(() => {
              window.location.href = actionRedirectUrl;
            }, 1000);
          }
          return;
        }

        const ccField = visibleFields.find(f => f.type === "payment_cc");
        const summaryField = visibleFields.find(f => f.type === "payment_summary");
        
        if (ccField) {
          // New inline checkout flow
          if (!ccData.creditNumber || ccData.creditNumber.length < 8) {
            setSubmissionError("אנא הזן מספר כרטיס תקין");
            setSubmitting(false);
            return;
          }
          if (!ccData.expiryMonth || !ccData.expiryYear) {
            setSubmissionError("אנא הזן תוקף כרטיס אשראי");
            setSubmitting(false);
            return;
          }
          if (!ccData.cvv2 || ccData.cvv2.length < 3) {
            setSubmissionError("אנא הזן ספרות ביקורת (CVV)");
            setSubmitting(false);
            return;
          }
          if ((ccField as any).payment_require_id && (!ccData.id || ccData.id.length < 5)) {
            setSubmissionError("אנא הזן תעודת זהות תקינה");
            setSubmitting(false);
            return;
          }

          // Submit to CRM as waiting for payment
          await submitCRMForm({
            formId,
            formTitle,
            formType: effectiveFormType === "register" ? "register" : "payment",
            formData: cleanFormData,
            embeddingPostId: formId,
            embeddingPostTitle: formTitle,
            embeddingCollection,
            formConfig: config,
            status: "ממתין לתשלום (אשראי)"
          });

          const allowedMethods = summaryField?.payment_methods || ["one-time"];
          const effectiveMethod = allowedMethods.length === 1 ? allowedMethods[0] : ccData.paymentMethod;
          
          let effectiveInstallments = ccData.installments;
          if (effectiveMethod === "recurring") {
            const limit = (summaryField as any)?.payment_recurring_limit || "user-choice";
            if (limit !== "user-choice") {
              effectiveInstallments = limit === "unlimited" ? 9999 : Number(limit);
            }
          } else if (effectiveMethod === "one-time") {
            effectiveInstallments = 1;
          }

          const expiry = `${ccData.expiryYear.padStart(2, "0")}${ccData.expiryMonth.padStart(2, "0")}`;
          const freq = effectiveMethod === "recurring" ? "recurring" : "one-time";

          const payloadBody = {
            amount,
            creditNumber: ccData.creditNumber,
            expiry,
            cvv2: ccData.cvv2,
            id: ccData.id,
            clientName,
            phone,
            email: mail,
            transactionId: formTitle,
            installments: effectiveInstallments,
            paymentFrequency: freq,
            documentType: (summaryField as any)?.payment_doc_type || "320"
          };

          console.log("=== שליחת נתונים לקשר (בקשה) ===");
          console.log("Headers:", { "Content-Type": "application/json" });
          console.table(payloadBody);
          console.log("Payload המלא:", payloadBody);

          const response = await fetch("/api/kesher/send-transaction", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payloadBody)
          });
          
          const data = await response.json();
          
          console.log("=== תשובה משרת קשר ===");
          console.log("Response Data:", data);
          if (data.success) {
            await submitCRMForm({
              formId,
              formTitle,
              formType: "payment",
              formData: cleanFormData,
              embeddingPostId: formId,
              embeddingPostTitle: formTitle,
              embeddingCollection,
              formConfig: config,
              status: "תשלום בוצע",
              amountPaid: amount,
              transactionId: data.transactionId
            });
            setSuccessMsg(data.message || "התשלום בוצע בהצלחה!");
            setIsSubmitted(true);
          } else {
            setSubmissionError(data.error || "שגיאה בביצוע התשלום");
          }
          setSubmitting(false);
          return;
        } else {
          // Fallback to legacy checkout modal flow
          await submitCRMForm({
            formId,
            formTitle,
            formType: effectiveFormType === "register" ? "register" : "payment",
            formData: cleanFormData,
            embeddingPostId: formId,
            embeddingPostTitle: formTitle,
            embeddingCollection,
            formConfig: config,
            status: "ממתין לתשלום (אשראי)"
          });

          setCheckoutData({ amount, clientName, phone, mail });
          setShowCheckout(true);
        }
      }
    } catch (err: any) {
      setSubmissionError(err.message || "שגיאה לא צפויה בפנייה לשרת");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePaymentSuccess = async (txId?: string) => {
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
        formId,
        formTitle,
        formType: "payment",
        formData: cleanFormData,
        embeddingPostId: formId,
        embeddingPostTitle: formTitle,
        embeddingCollection,
        formConfig: config,
        status: "תשלום בוצע",
        amountPaid: checkoutData.amount,
        transactionId: typeof txId === 'string' ? txId : undefined
      });

      if (res.success) {
        setSuccessMsg(`התשלום בסך ₪${checkoutData.amount} בוצע והתקבל בהצלחה! קבלה והודעה נשלחו לוואטסאפ.`);
        setIsSubmitted(true);
      } else {
        setSuccessMsg(`התשלום עבר, אך אירעה שגיאה בעדכון ה-CRM: ${res.error}. הנהלת הארגון עודכנה.`);
        setIsSubmitted(true);
      }
    } catch (err: any) {
      setSubmissionError("שגיאה ברישום התשלום במערכת: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Success UI is now a Modal rendered at the bottom

  const currentStepConf = dynamicStepConfigs.get(currentStep);
  const nextStepConf = dynamicStepConfigs.get(currentStep + 1);

  const btnStyle = {
    backgroundColor: nextStepConf?.buttonBgColor || config.submit_button_bg_color || "#f59e0b",
    color: nextStepConf?.buttonTextColor || config.submit_button_text_color || "#ffffff"
  };

  return (
    <div 
      style={config.form_bg_color && config.form_bg_color !== "#ffffff" ? { backgroundColor: config.form_bg_color } : undefined}
      className="w-full max-w-[480px] mx-auto border border-amber-500/20 bg-zinc-950 rounded-[2.5rem] p-6 sm:p-8 shadow-2xl relative overflow-hidden transition-all duration-350 text-right" 
      dir="rtl"
    >
      <div className="absolute -top-10 -left-10 w-24 h-24 bg-amber-900/20 rounded-full blur-3xl opacity-60 pointer-events-none" />
      <div className="absolute -bottom-10 -right-10 w-24 h-24 bg-amber-900/10 rounded-full blur-3xl opacity-60 pointer-events-none" />

      {showCheckout && checkoutData ? (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-4 relative z-10">
          <div className="flex items-center gap-2 text-amber-500 border-b pb-3 mb-4">
            <Coins className="w-5 h-5 text-amber-400" />
            <div className="font-bold text-base">תשלום מאובטח</div>
          </div>
          
          <div className="bg-slate-50 p-4 rounded-2xl border text-xs space-y-1.5 mb-2">
            <div><strong className="text-slate-400">עבור:</strong> <span className="text-white">{formTitle}</span></div>
            <div><strong className="text-slate-400">משלם:</strong> <span className="text-white">{checkoutData.clientName || "-- ללא שם --"}</span></div>
            <div><strong className="text-slate-400">טלפון:</strong> <span className="text-white">{checkoutData.phone}</span></div>
            <div><strong className="text-slate-400">סכום לחיוב:</strong> <span className="font-black text-amber-500">₪{checkoutData.amount}</span></div>
          </div>

          {(() => {
            const summaryField = visibleFields.find(f => f.type === "payment_summary");
            const allowedMethods = summaryField?.payment_methods || ["one-time"];
            const effectivePaymentMethod = allowedMethods.length === 1 ? allowedMethods[0] : ccData.paymentMethod;
            let effectiveInstallments = ccData.installments;
            
            if (effectivePaymentMethod === "recurring") {
              const limit = summaryField?.payment_recurring_limit || "user-choice";
              if (limit !== "user-choice") {
                effectiveInstallments = limit === "unlimited" ? 9999 : Number(limit);
              } else if (effectiveInstallments === 1) {
                effectiveInstallments = 9999;
              }
            } else if (effectivePaymentMethod === "one-time") {
              effectiveInstallments = 1;
            }

            return (
              <KesherCheckout
                amount={checkoutData.amount}
                description={formTitle}
                onSuccess={handlePaymentSuccess}
                paymentFrequency={effectivePaymentMethod === "recurring" ? "recurring" : "one-time"}
                installments={effectiveInstallments}
                isInstallmentsMapped={!!summaryField}
              />
            );
          })()}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
          {submissionError && (
            <div className="p-3 bg-red-50 border border-red-100 text-red-700 text-xs font-bold rounded-2xl flex items-center gap-2 animate-shake">
              <ShieldAlert className="w-4 h-4 shrink-0 text-red-500" />
              <span>{submissionError}</span>
            </div>
          )}

          {/* Steps Progress Bar Indicator */}
          {totalSteps > 1 && (
            <div className="flex items-center justify-between mb-10 relative">
              <div className="absolute left-0 right-0 top-1/2 h-1 bg-zinc-800 -z-10 -translate-y-1/2 rounded-full"></div>
              <div 
                className="absolute right-0 top-1/2 h-1 -z-10 -translate-y-1/2 rounded-full transition-all duration-300" 
                style={{ 
                  width: `${((currentStep - 1) / (totalSteps - 1 || 1)) * 100}%`,
                  backgroundColor: config.submit_button_bg_color || "#f59e0b"
                }}
              ></div>
              
              {Array.from({ length: totalSteps }).map((_, i) => {
                const s = i + 1;
                const isActive = currentStep >= s;
                return (
                  <div 
                    key={s} 
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors",
                      isActive ? "text-white shadow-md" : "bg-zinc-900 border-2 border-white/10 text-slate-500"
                    )}
                    style={isActive ? { backgroundColor: config.submit_button_bg_color || "#f59e0b" } : {}}
                  >
                    {s}
                  </div>
                );
              })}
            </div>
          )}

          {/* Current Step Header */}
          {currentStepConf ? (
            <div 
              className="mb-6 pb-4 border-b border-white/10 flex items-center gap-3"
              style={{ justifyContent: currentStepConf.textAlign === 'right' ? 'flex-start' : currentStepConf.textAlign === 'left' ? 'flex-end' : 'center' }}
            >
              {currentStepConf.icon && (LucideIcons as any)[currentStepConf.icon] && (
                <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center border border-amber-500/30">
                  {(() => { const StepIcon = (LucideIcons as any)[currentStepConf.icon]; return <StepIcon className="w-5 h-5" />; })()}
                </div>
              )}
              <div className="text-xl font-bold" style={{ color: currentStepConf.textColor || '#ffffff', textAlign: currentStepConf.textAlign || 'center' }}>
                {currentStepConf.title}
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap -mx-2 w-[calc(100%+1rem)]">
          {enrichedFields.map((field, idx) => {
            if (field._isStepDivider) return null;
            if (!isFieldVisible(field)) return null;

            // Step filter: only render the fields for the active step
            // Note: fixed_amount and hidden elements should be rendered at any step so their input elements are in DOM
            const isHiddenOrFixed = ["hidden", "fixed_amount", "calculated"].includes(field.type);
            if (!isHiddenOrFixed && field._calculatedStep !== currentStep) return null;

            const hasError = errors[field.label];
            const FieldIcon = field.icon ? (LucideIcons as any)[field.icon] : null;

            const customFieldStyle = {
              '--field-bg': (field as any).bgColor || config.field_bg_color || '#18181b',
              '--field-border': (field as any).borderColor || 'rgba(255,255,255,0.2)',
              '--field-focus': (field as any).focusColor || '#f59e0b',
              '--field-text': (field as any).textColor || '#ffffff',
            } as any;

            if (field.height && field.height !== "auto" && field.height !== "") {
              customFieldStyle.height = field.height;
            }
            if (field.fontSize) {
              customFieldStyle.fontSize = `${field.fontSize}px`;
            }
            if ((field as any).textAlign) {
              customFieldStyle.textAlign = (field as any).textAlign;
            }

            return (
              <div key={idx} className="space-y-1 px-2 mb-4" style={{ width: `${field.widthPercentage || 100}%` }}>
                {field.type === "hidden" ? (
                  <input type="hidden" name={field.label} value={formData[field.label] || ""} />
                ) : field.type === "fixed_amount" ? (
                  <div className="border-[2px] border-[var(--field-border)] bg-[var(--field-bg)] p-3 rounded-xl flex justify-between items-center text-xs" style={customFieldStyle}>
                    <span className="font-semibold text-[var(--field-focus)]">{field.label}:</span>
                    <span className="font-mono font-bold text-[var(--field-text)]">₪{formData[field.label] || field.default_value}</span>
                  </div>
                ) : field.type === "calculated" ? (
                  <div className="border-[2px] border-[var(--field-border)] bg-[var(--field-bg)] p-3 rounded-xl flex justify-between items-center text-xs" style={customFieldStyle}>
                    <span className="font-semibold text-[var(--field-focus)]">{field.label}:</span>
                    <span className="font-mono font-bold text-[var(--field-text)] text-sm">
                      ₪{evaluateFormula(field.calc_formula || "", formData)}
                    </span>
                  </div>
                ) : field.type === "image_display" ? (
                  <div className="w-full rounded-xl overflow-hidden my-4 border border-white/5">
                    <img src={field.default_value} alt={field.label} className="w-full h-auto object-cover" />
                  </div>
                ) : field.type === "rich_text_display" ? (
                  <div className="prose prose-invert prose-sm max-w-none text-slate-300 my-4 bg-zinc-900/50 p-4 rounded-xl border border-white/5 leading-relaxed" dangerouslySetInnerHTML={{ __html: field.default_value }} />
                ) : field.type === "payment_summary" ? (
                  <div className="bg-zinc-900/40 p-4 sm:p-6 rounded-2xl border mb-6" style={customFieldStyle}>
                    <div className="text-xl font-bold mb-4 text-[var(--field-focus)]" style={customFieldStyle}>תשלום מאובטח</div>
                    
                    <div className="space-y-4">
                      <div className="flex justify-between items-center bg-zinc-950/50 p-3 rounded-xl border border-white/5">
                        <span className="text-slate-400">סכום לתשלום:</span>
                        <span className="text-xl font-bold text-white">₪{getPaymentAmount().toLocaleString()}</span>
                      </div>

                      {/* Payment Settings Options */}
                      {(() => {
                        const allowedMethods = (field as any).payment_methods || ["one-time"];
                        const isSingleMethod = allowedMethods.length === 1;
                        const effectiveMethod = isSingleMethod ? allowedMethods[0] : ccData.paymentMethod;
                        
                        let effectiveInstallments = ccData.installments;
                        if (effectiveMethod === "recurring") {
                          const limit = (field as any).payment_recurring_limit || "user-choice";
                          if (limit !== "user-choice") effectiveInstallments = limit === "unlimited" ? 9999 : Number(limit);
                        }

                        return (
                          <div className="pt-4 border-t border-white/5 space-y-4">
                            {!isSingleMethod && (
                              <>
                                <label className="text-sm font-bold text-[var(--field-focus)]" style={customFieldStyle}>אופן תשלום</label>
                                <div className="grid grid-cols-2 gap-3">
                                  {allowedMethods.includes("one-time") && (
                                    <label className="flex items-center gap-2 text-white text-sm cursor-pointer border border-white/5 bg-zinc-950 p-3 rounded-xl hover:bg-zinc-800 transition-colors">
                                      <input type="radio" name="paymentMethod" value="one-time" 
                                        checked={effectiveMethod === "one-time"} 
                                        onChange={() => setCcData({...ccData, paymentMethod: "one-time", installments: 1})}
                                        className="text-amber-500 focus:ring-amber-500 bg-zinc-900 border-white/20"
                                      />
                                      תשלום חד פעמי
                                    </label>
                                  )}
                                  {allowedMethods.includes("installments") && (
                                    <label className="flex items-center gap-2 text-white text-sm cursor-pointer border border-white/5 bg-zinc-950 p-3 rounded-xl hover:bg-zinc-800 transition-colors">
                                      <input type="radio" name="paymentMethod" value="installments" 
                                        checked={effectiveMethod === "installments"} 
                                        onChange={() => setCcData({...ccData, paymentMethod: "installments"})}
                                        className="text-amber-500 focus:ring-amber-500 bg-zinc-900 border-white/20"
                                      />
                                      תשלומים
                                    </label>
                                  )}
                                  {allowedMethods.includes("recurring") && (
                                    <label className="flex items-center gap-2 text-white text-sm cursor-pointer border border-white/5 bg-zinc-950 p-3 rounded-xl hover:bg-zinc-800 transition-colors">
                                      <input type="radio" name="paymentMethod" value="recurring" 
                                        checked={effectiveMethod === "recurring"} 
                                        onChange={() => setCcData({...ccData, paymentMethod: "recurring", installments: 9999})}
                                        className="text-amber-500 focus:ring-amber-500 bg-zinc-900 border-white/20"
                                      />
                                      הוראת קבע
                                    </label>
                                  )}
                                </div>
                              </>
                            )}

                            {effectiveMethod === "installments" && (
                              <div className="mt-3">
                                <label className="text-xs font-bold text-slate-400 mb-2 block">מספר תשלומים</label>
                                <select 
                                  className="w-full bg-zinc-950 text-white p-3 rounded-xl border border-white/10 outline-none focus:border-amber-500"
                                  value={effectiveInstallments}
                                  onChange={e => setCcData({...ccData, installments: Number(e.target.value)})}
                                >
                                  {Array.from({length: 12}).map((_, i) => (
                                    <option key={i} value={i+2}>{i+2} תשלומים</option>
                                  ))}
                                </select>
                              </div>
                            )}

                            {effectiveMethod === "recurring" && ((field as any).payment_recurring_limit === "user-choice") && (
                              <div className="mt-3">
                                <label className="text-xs font-bold text-slate-400 mb-2 block">מספר חיובים</label>
                                <select 
                                  className="w-full bg-zinc-950 text-white p-3 rounded-xl border border-white/10 outline-none focus:border-amber-500"
                                  value={effectiveInstallments}
                                  onChange={e => setCcData({...ccData, installments: Number(e.target.value)})}
                                >
                                  <option value="9999">ללא הגבלה (חיוב מתחדש קבוע)</option>
                                  {Array.from({length: 36}).map((_, i) => (
                                    <option key={i} value={i+1}>{i+1} חיובים</option>
                                  ))}
                                </select>
                              </div>
                            )}

                            {effectiveMethod === "recurring" && (
                              <div className="mt-4 p-3.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                                <p className="text-sm font-bold text-indigo-400 mb-1">פרטי העסקה (הוראת קבע)</p>
                                <p className="text-sm text-indigo-200/80 leading-relaxed">
                                  יבוצע חיוב חודשי על סך <strong className="text-white">₪{getPaymentAmount().toLocaleString()}</strong>
                                  {effectiveInstallments === 9999 
                                    ? " באופן קבוע (עד ביטול)." 
                                    : ` למשך ${effectiveInstallments} חודשים (סך הכל ₪${(getPaymentAmount() * effectiveInstallments).toLocaleString()}).`}
                                </p>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                ) : field.type === "payment_cc" ? (
                  <div className="bg-[var(--field-bg)] border-[var(--field-border)] p-4 sm:p-6 rounded-2xl mb-6 shadow-xl" style={customFieldStyle}>
                    <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/10">
                      <h3 className="text-lg font-bold" style={{color: customFieldStyle['--field-focus']}}>{field.label}</h3>
                      <div className="flex gap-2">
                        {/* Visa / Master Icons */}
                        <div className="h-6 w-10 bg-white/10 rounded flex items-center justify-center text-[10px] font-bold text-white/50">VISA</div>
                        <div className="h-6 w-10 bg-white/10 rounded flex items-center justify-center text-[10px] font-bold text-white/50">MASTER</div>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                          <CreditCard className="w-4 h-4" /> מספר כרטיס אשראי
                        </label>
                        <input
                          type="text" dir="ltr" placeholder="0000 0000 0000 0000"
                          name="cc-number" id="cc-number" autoComplete="cc-number"
                          value={ccData.creditNumber}
                          onChange={(e) => setCcData({...ccData, creditNumber: e.target.value.replace(/\D/g, '')})}
                          className="w-full bg-black/40 text-white border border-white/10 focus:border-[var(--field-focus)] rounded-xl p-3 text-sm outline-none font-mono tracking-widest text-left transition-colors"
                          style={{ borderColor: customFieldStyle['--field-border'] }}
                          maxLength={16}
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                            <Calendar className="w-4 h-4" /> תוקף (חודש/שנה)
                          </label>
                          <div className="flex gap-2">
                            <select
                              name="cc-exp-month" id="cc-exp-month" autoComplete="cc-exp-month"
                              dir="ltr" value={ccData.expiryMonth}
                              onChange={(e) => setCcData({...ccData, expiryMonth: e.target.value})}
                              className="w-full bg-black/40 text-white border border-white/10 focus:border-[var(--field-focus)] rounded-xl p-3 text-sm outline-none font-mono"
                            >
                              <option value="" disabled>MM</option>
                              {Array.from({length: 12}).map((_, i) => {
                                const m = String(i+1).padStart(2, '0');
                                return <option key={m} value={m}>{m}</option>
                              })}
                            </select>
                            <span className="text-slate-500 self-center">/</span>
                            <select
                              name="cc-exp-year" id="cc-exp-year" autoComplete="cc-exp-year"
                              dir="ltr" value={ccData.expiryYear}
                              onChange={(e) => setCcData({...ccData, expiryYear: e.target.value})}
                              className="w-full bg-black/40 text-white border border-white/10 focus:border-[var(--field-focus)] rounded-xl p-3 text-sm outline-none font-mono"
                            >
                              <option value="" disabled>YY</option>
                              {Array.from({length: 15}).map((_, i) => {
                                const y = String(new Date().getFullYear() % 100 + i).padStart(2, '0');
                                return <option key={y} value={y}>{y}</option>
                              })}
                            </select>
                          </div>
                        </div>
                        
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                            <Lock className="w-4 h-4" /> CVV (3 ספרות בגב)
                          </label>
                          <input
                            type="text" dir="ltr" placeholder="123"
                            name="cc-csc" id="cc-csc" autoComplete="cc-csc"
                            value={ccData.cvv2}
                            onChange={(e) => setCcData({...ccData, cvv2: e.target.value.replace(/\D/g, '')})}
                            className="w-full bg-black/40 text-white border border-white/10 focus:border-[var(--field-focus)] rounded-xl p-3 text-sm outline-none font-mono tracking-widest text-left"
                            maxLength={4}
                          />
                        </div>
                      </div>

                      {(field as any).payment_require_id && (
                        <div className="space-y-1.5 pt-2">
                          <label className="text-xs font-bold text-slate-400">תעודת זהות של בעל הכרטיס (חובה)</label>
                          <input
                            type="text" dir="ltr" placeholder="123456789"
                            value={ccData.id}
                            onChange={(e) => setCcData({...ccData, id: e.target.value.replace(/\D/g, '')})}
                            className="w-full bg-black/40 text-white border border-white/10 focus:border-[var(--field-focus)] rounded-xl p-3 text-sm outline-none font-mono tracking-widest text-left"
                            maxLength={9}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                    {field.type === "textarea" ? (
                      <div className="relative mt-3">
                        <textarea
                          id={`field-${idx}`}
                          value={formData[field.label] || ""}
                          onChange={(e) => handleInputChange(field.label, e.target.value)}
                          className={cn(
                            "peer w-full text-[var(--field-text)] border-2 rounded-xl px-4 py-3 text-sm outline-none transition-all resize-none min-h-[100px] placeholder-transparent",
                            "bg-[var(--field-bg)] border-[var(--field-border)] focus:border-[var(--field-focus)] focus:text-[var(--field-focus)]",
                            hasError && "border-red-500 focus:border-red-500"
                          )}
                          style={customFieldStyle}
                          required={field.required}
                          placeholder={field.label}
                          name={field.label}
                          autoComplete={getAutoAutocomplete(field)}
                        />
                        <label
                          htmlFor={`field-${idx}`}
                          className={cn(
                            "absolute right-4 transition-all pointer-events-none flex items-center gap-1 bg-[var(--field-bg)] px-1 rounded-sm",
                            !!formData[field.label]
                              ? (hasError ? "top-0 -translate-y-1/2 text-xs text-red-500" : "top-0 -translate-y-1/2 text-xs text-[var(--field-focus)]")
                              : cn(
                                  "top-4 text-sm",
                                  hasError ? "text-red-500" : "text-slate-400",
                                  "peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-xs",
                                  hasError ? "peer-focus:text-red-500" : "peer-focus:text-[var(--field-focus)]"
                                )
                          )}
                          style={customFieldStyle}
                        >
                          {FieldIcon && <FieldIcon className="w-3.5 h-3.5" />}
                          {field.label}
                          {field.required && <span className="text-red-500 mr-1">*</span>}
                        </label>
                      </div>
                    ) : field.type === "select" ? (
                      (field.options || "").split("\n").filter(o => o.trim()).length <= 4 ? (
                        <div className="mt-3">
                          <label className="flex items-center gap-1.5 text-xs font-bold text-slate-300 mb-2">
                            {FieldIcon && <FieldIcon className="w-3.5 h-3.5 text-slate-400" />}
                            {field.label}
                            {field.required && <span className="text-red-500 mr-1">*</span>}
                          </label>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {(field.options || "").split("\n").filter(o => o.trim()).map(opt => {
                              const clean = opt.trim();
                              const isSelected = formData[field.label] === clean;
                              return (
                                <label
                                  key={clean}
                                  className={cn(
                                    "relative flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all",
                                    isSelected 
                                      ? "border-[var(--field-focus)] text-[var(--field-focus)]" 
                                      : "border-[var(--field-border)] bg-[var(--field-bg)] hover:border-[var(--field-focus)] text-[var(--field-text)] hover:text-[var(--field-focus)]"
                                  )}
                                  style={{
                                    ...customFieldStyle,
                                    backgroundColor: isSelected ? 'var(--field-bg)' : undefined, // optional, maybe we want a tint
                                    boxShadow: isSelected ? `inset 0 0 0 1px var(--field-focus)` : 'none'
                                  }}
                                >
                                  <input
                                    type="radio"
                                    name={field.label}
                                    value={clean}
                                    checked={isSelected}
                                    onChange={(e) => handleInputChange(field.label, e.target.value)}
                                    className="w-5 h-5 ml-3"
                                    style={{ accentColor: 'var(--field-focus)' }}
                                    required={field.required && !formData[field.label]}
                                  />
                                  <span className="font-bold leading-tight">{clean}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <div className="relative mt-3">
                          <select
                            id={`field-${idx}`}
                            value={formData[field.label] || ""}
                            onChange={(e) => handleInputChange(field.label, e.target.value)}
                            className={cn(
                              "peer w-full bg-[var(--field-bg)] text-[var(--field-text)] border-2 rounded-xl px-4 py-3 text-sm outline-none transition-all appearance-none",
                              hasError ? "border-red-500 focus:border-red-500" : "border-[var(--field-border)] focus:border-[var(--field-focus)] focus:text-[var(--field-focus)]"
                            )}
                            style={customFieldStyle}
                            required={field.required}
                            name={field.label}
                            autoComplete={getAutoAutocomplete(field)}
                          >
                            <option value="" disabled hidden></option>
                            {(field.options || "").split("\n").map(opt => {
                              const clean = opt.trim();
                              if (!clean) return null;
                              return <option key={clean} value={clean}>{clean}</option>;
                            })}
                          </select>
                          <label
                            htmlFor={`field-${idx}`}
                            className={cn(
                              "absolute right-4 transition-all pointer-events-none flex items-center gap-1 bg-[var(--field-bg)] px-1 rounded-sm",
                              !!formData[field.label]
                                ? (hasError ? "top-0 -translate-y-1/2 text-xs text-red-500" : "top-0 -translate-y-1/2 text-xs text-[var(--field-focus)]")
                                : cn(
                                    "top-1/2 -translate-y-1/2 text-sm",
                                    hasError ? "text-red-500" : "text-[var(--field-text)] opacity-70",
                                    "peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-xs",
                                    hasError ? "peer-focus:text-red-500" : "peer-focus:text-[var(--field-focus)]"
                                  )
                            )}
                            style={customFieldStyle}
                          >
                            {FieldIcon && <FieldIcon className="w-3.5 h-3.5" />}
                            {field.label}
                            {field.required && <span className="text-red-500 mr-1">*</span>}
                          </label>
                        </div>
                      )
                    ) : (
                      <div className="relative mt-3">
                        <input
                          id={`field-${idx}`}
                          type={field.type === "email" ? "email" : field.type === "tel" ? "tel" : field.type === "number" ? "number" : "text"}
                          value={formData[field.label] || ""}
                          onChange={(e) => handleInputChange(field.label, e.target.value)}
                          className={cn(
                            "peer w-full text-[var(--field-text)] border-2 rounded-xl px-4 py-3 text-sm outline-none transition-all placeholder-transparent",
                            "bg-[var(--field-bg)] border-[var(--field-border)] focus:border-[var(--field-focus)] focus:text-[var(--field-focus)]",
                            hasError && "border-red-500 focus:border-red-500"
                          )}
                          style={customFieldStyle}
                          required={field.required}
                          placeholder={field.label}
                          name={field.label}
                          autoComplete={getAutoAutocomplete(field)}
                        />
                        <label
                          htmlFor={`field-${idx}`}
                          className={cn(
                            "absolute right-4 transition-all pointer-events-none flex items-center gap-1 bg-[var(--field-bg)] px-1 rounded-sm",
                            !!formData[field.label]
                              ? (hasError ? "top-0 -translate-y-1/2 text-xs text-red-500" : "top-0 -translate-y-1/2 text-xs text-[var(--field-focus)]")
                              : cn(
                                  "top-1/2 -translate-y-1/2 text-sm",
                                  hasError ? "text-red-500" : "text-slate-400",
                                  "peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-xs",
                                  hasError ? "peer-focus:text-red-500" : "peer-focus:text-[var(--field-focus)]"
                                )
                          )}
                          style={customFieldStyle}
                        >
                          {FieldIcon && <FieldIcon className="w-3.5 h-3.5" />}
                          {field.label}
                          {field.required && <span className="text-red-500 mr-1">*</span>}
                        </label>
                      </div>
                    )}

                    {hasError && (
                      <p className="text-[10px] text-red-500 font-bold mt-1 ml-1 animate-in slide-in-from-top-1">
                        {hasError}
                      </p>
                    )}
                  </>
                )}
              </div>
            );
          })}
          </div>

          {config.form_type === "payment" && config.payment_frequency === "user-choice" && currentStep === totalSteps && (
            <div className="flex items-center gap-3 p-3 bg-blue-50/50 border border-blue-100 rounded-xl mb-4">
              <button
                type="button"
                onClick={() => setIsRecurring(!isRecurring)}
                className={cn(
                  "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                  isRecurring ? 'bg-blue-600' : 'bg-slate-300'
                )}
              >
                <span
                  className={cn(
                    "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                    isRecurring ? 'translate-x-6' : 'translate-x-1'
                  )}
                />
              </button>
              <div className="flex items-center gap-2 text-sm text-blue-900 font-medium">
                <RefreshCw className="w-4 h-4 text-blue-600" />
                הפוך לתרומה חודשית קבועה
              </div>
            </div>
          )}

          {/* Stepper Buttons (Prev / Next / Submit) */}
          <div className="flex gap-3 pt-4">
            {currentStep > 1 && (
              <Button
                type="button"
                onClick={handlePrevStep}
                variant="outline"
                style={currentStepConf?.backButtonBgColor || currentStepConf?.backButtonTextColor || config.back_button_bg_color || config.back_button_text_color ? {
                  backgroundColor: currentStepConf?.backButtonBgColor || config.back_button_bg_color || 'transparent',
                  color: currentStepConf?.backButtonTextColor || config.back_button_text_color || '#cbd5e1',
                  borderColor: currentStepConf?.backButtonTextColor || config.back_button_text_color ? `${currentStepConf?.backButtonTextColor || config.back_button_text_color}40` : 'rgba(255,255,255,0.1)'
                } : undefined}
                className={cn(
                  "flex-1 py-3.5 px-6 rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 border cursor-pointer transition-all hover:opacity-80",
                  !(currentStepConf?.backButtonBgColor || currentStepConf?.backButtonTextColor || config.back_button_bg_color || config.back_button_text_color) && "border-white/10 text-slate-300 bg-transparent hover:bg-white/5"
                )}
              >
                <ChevronRight className="w-4 h-4" />
                {currentStepConf?.backButtonText || config.back_button_text || "חזור"}
              </Button>
            )}
            
            {currentStep < totalSteps ? (
              <Button
                type="button"
                onClick={handleNextStep}
                style={btnStyle}
                className="flex-1 py-3.5 px-6 rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 shadow-lg transition-all hover:scale-[1.01] cursor-pointer"
              >
                {nextStepConf?.buttonText || config.continue_button_text || "המשך"}
                {(nextStepConf?.buttonIcon !== undefined ? nextStepConf.buttonIcon : config.continue_button_icon) === "arrow-left" && <ChevronLeft className="w-4 h-4" />}
                {(nextStepConf?.buttonIcon !== undefined ? nextStepConf.buttonIcon : config.continue_button_icon) === "chevron-left" && <ChevronLeft className="w-4 h-4" />}
                {(nextStepConf?.buttonIcon !== undefined ? nextStepConf.buttonIcon : config.continue_button_icon) === "check" && <CheckCircle2 className="w-4 h-4" />}
                {!(nextStepConf?.buttonIcon !== undefined ? nextStepConf.buttonIcon : config.continue_button_icon) && <ChevronLeft className="w-4 h-4" />}
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={submitting}
                style={btnStyle}
                className="flex-1 py-3.5 px-6 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all hover:scale-[1.01] cursor-pointer"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : config.form_type === "payment" ? (
                  <CreditCard className="w-4 h-4" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                {submitting ? "מעבד..." : config.submit_button_text || "שלח פנייה"}
              </Button>
            )}
          </div>
        </form>
      )}
      
      {/* Success Modal */}
      <Modal isOpen={isSubmitted} onClose={() => setIsSubmitted(false)}>
        <Modal.Content className="max-w-md rounded-[2rem] p-8 text-center bg-white border border-slate-100 shadow-2xl relative">
          <Modal.Close className="absolute left-4 top-4 right-auto" />
          
          <div className="w-20 h-20 rounded-full bg-amber-900/100/10 text-emerald-600 border-2 border-emerald-500/20 flex items-center justify-center mx-auto shadow-inner animate-bounce mb-6">
            <CheckCircle2 className="w-12 h-12" />
          </div>
          
          {config.custom_success_modal_image_url && (
            <div className="mb-6 rounded-2xl overflow-hidden shadow-sm">
              <img src={config.custom_success_modal_image_url} alt="Success" className="w-full h-auto object-cover max-h-48" />
            </div>
          )}

          {/<[a-z][\s\S]*>/i.test(successMsg) ? (
            <div 
              className="text-white leading-relaxed text-right prose prose-sm max-w-none mx-auto"
              dangerouslySetInnerHTML={{ __html: successMsg }} 
            />
          ) : (
            <div className="space-y-3">
              <h3 className="text-2xl font-black text-white leading-tight">הפעולה בוצעה בהצלחה!</h3>
              <p className="text-slate-600 text-sm leading-relaxed px-4 whitespace-pre-line font-medium">
                {successMsg}
              </p>
            </div>
          )}
          
          <Button
            onClick={() => setIsSubmitted(false)}
            className="mt-8 bg-zinc-800 hover:bg-slate-200 text-slate-300 font-bold px-8 py-3 rounded-xl border border-slate-200 w-full shadow-sm transition-all hover:shadow"
          >
            סגור והמשך
          </Button>
        </Modal.Content>
      </Modal>

    </div>
  );
}
