"use client";

import { useState } from "react";
import { changeMyPassword } from "../actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { KeyRound } from "lucide-react";

export function AccountSettingsForm() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword !== confirmPassword) {
      setMessage("הסיסמאות אינן תואמות או ריקות.");
      return;
    }

    setIsSubmitting(true);
    setMessage("");
    try {
      await changeMyPassword(newPassword);
      setMessage("הסיסמה שונתה בהצלחה!");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setMessage("שגיאה בשינוי סיסמה: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-right" dir="rtl">
      <div>
        <label className="block text-sm font-bold text-gray-300 mb-1">סיסמה חדשה</label>
        <Input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="bg-white/5 border-white/10 text-white rounded-xl"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-bold text-gray-300 mb-1">אימות סיסמה חדשה</label>
        <Input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="bg-white/5 border-white/10 text-white rounded-xl"
          required
        />
      </div>

      {message && (
        <p className={`text-sm ${message.includes("בהצלחה") ? "text-emerald-400" : "text-red-400"}`}>
          {message}
        </p>
      )}

      <Button
        type="submit"
        disabled={isSubmitting}
        className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl flex items-center gap-2"
      >
        <KeyRound className="w-4 h-4" />
        {isSubmitting ? "שומר..." : "עדכן סיסמה"}
      </Button>
    </form>
  );
}
