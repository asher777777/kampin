import * as React from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/store/useAuthStore";
import { Eye, EyeOff } from "lucide-react";
import Image from "next/image";

import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { normalizePhone } from "@/lib/utils";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  redirectTo?: string;
}

export function LoginModal({ isOpen, onClose, redirectTo = "/gen-dashboard" }: LoginModalProps) {
  const router = useRouter();
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const setUser = useAuthStore((state) => state.setUser);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const isPhone = /^[\d\-\+\(\)\s]+$/.test(username);
      const finalUsername = isPhone ? normalizePhone(username) : username;

      const result = await signIn("credentials", {
        username: finalUsername,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("שם משתמש או סיסמה שגויים");
      } else if (result?.ok) {
        setUser({
          id: "1",
          name: "Admin",
          email: "admin@habad.local",
          role: "ADMIN",
        });
        setUsername("");
        setPassword("");
        onClose();
        window.location.href = redirectTo;
      }
    } catch (err) {
      setError("שגיאה בהתחברות, נסה שוב");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <Modal.Content>
        <Modal.Header title="התחברות למערכת" description="הכנס שם משתמש וסיסמה כדי להתחבר לדשבורד" />
        <Modal.Close />
        
        <form onSubmit={handleLogin} className="space-y-4 mt-4" dir="rtl">
          {error && <div className="text-red-500 text-sm mb-4">{error}</div>}
          <div className="space-y-2">
            <label className="text-sm font-medium">שם משתמש</label>
            <Input 
              type="text" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              placeholder="הכנס שם משתמש"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">סיסמה</label>
            <div className="relative">
              <Input 
                type={showPassword ? "text" : "password"} 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="הכנס סיסמה"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <Modal.Footer>
            <Button type="button" variant="outline" onClick={onClose} className="ml-2" disabled={loading}>ביטול</Button>
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? "מתחבר..." : "התחבר לדשבורד"}
            </Button>
          </Modal.Footer>
          
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-200"></span>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-slate-500">או</span>
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
            התחבר עם Google (לסנכרון יומן)
          </Button>
        </form>
      </Modal.Content>
    </Modal>
  );
}
