import * as React from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/store/useAuthStore";
import { Eye, EyeOff } from "lucide-react";
import Image from "next/image";

import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { submitCRMForm } from "@/features/crm/actions";
import { normalizePhone } from "@/lib/utils";

interface RegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  redirectTo?: string;
}

export function RegisterModal({ isOpen, onClose, redirectTo = "/agentonbord" }: RegisterModalProps) {
  const router = useRouter();
  const [fullName, setFullName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const setUser = useAuthStore((state) => state.setUser);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Create user and contact via CRM action
      const crmResponse = await submitCRMForm({
        formId: "register-modal-form",
        formTitle: "הרשמה למערכת והתחלת בנייה",
        formType: "register",
        formData: {
          "שם מלא": fullName,
          "טלפון": phone
        },
        formConfig: {
          fields: [
            { label: "שם מלא", map_to: "conta_name" },
            { label: "טלפון", map_to: "conta_phone" }
          ],
          register_role: "TRIAL"
        }
      });

      if (crmResponse && crmResponse.success === false) {
        setError("שגיאה בהרשמה: " + crmResponse.error);
        setLoading(false);
        return;
      }

      // Log in with phone as both username and password
      const normPhone = normalizePhone(phone);
      const result = await signIn("credentials", {
        username: normPhone,
        password: normPhone,
        redirect: false
      });

      if (result?.error) {
        setError("שגיאה בהתחברות: " + result.error);
      } else if (result?.ok) {
        setFullName("");
        setPhone("");
        onClose();
        window.location.href = redirectTo;
      }
    } catch (err) {
      setError("שגיאה בהרשמה, נסה שוב");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <Modal.Content>
        <Modal.Header title="הרשמה למערכת והתחלת בנייה" description="הכנס שם וטלפון כדי להתחיל לבנות את המותג והסייטים שלך בלייב" />
        <Modal.Close />
        
        <form onSubmit={handleRegister} className="space-y-4 mt-4" dir="rtl">
          {error && <div className="text-red-500 text-sm mb-4">{error}</div>}
          <div className="space-y-2">
            <label className="text-sm font-medium">שם מלא</label>
            <Input 
              type="text" 
              value={fullName} 
              onChange={(e) => setFullName(e.target.value)} 
              placeholder="הכנס שם מלא"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">מספר טלפון (ישמש כסיסמה להתחברות)</label>
            <Input 
              type="tel" 
              value={phone} 
              onChange={(e) => setPhone(e.target.value)} 
              placeholder="הכנס מספר טלפון תקין"
              required
            />
          </div>
          <Modal.Footer>
            <Button type="button" variant="outline" onClick={onClose} className="ml-2" disabled={loading}>ביטול</Button>
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? "נרשם ומעביר..." : "הירשם והתחל לבנות עם מיכאל"}
            </Button>
          </Modal.Footer>
          
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-200"></span>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-slate-500">או עדיף ומומלץ דרך</span>
            </div>
          </div>
          
          <Button 
            type="button" 
            variant="outline" 
            className="w-full gap-2 relative h-11" 
            onClick={() => {
              setLoading(true);
              signIn("google", { callbackUrl: redirectTo });
            }}
            disabled={loading}
          >
            <Image src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" width={20} height={20} />
            הרשמה באמצעות Google והתחלת בנייה
          </Button>
        </form>
      </Modal.Content>
    </Modal>
  );
}
