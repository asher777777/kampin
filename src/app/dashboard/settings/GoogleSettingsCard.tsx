"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/Button";
import { Calendar, Loader2 } from "lucide-react";
import Image from "next/image";

interface GoogleSettingsCardProps {
  isConnected: boolean;
}

export function GoogleSettingsCard({ isConnected }: GoogleSettingsCardProps) {
  const [loading, setLoading] = useState(false);

  const handleConnect = () => {
    setLoading(true);
    signIn("google", { callbackUrl: "/dashboard/settings" });
  };

  return (
    <div className="flex flex-col gap-4">
      {isConnected ? (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-3 text-emerald-500">
            <Calendar className="w-5 h-5" />
            <span className="font-medium">מחובר ומסונכרן בהצלחה</span>
          </div>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-400 mb-2">
            חיבור החשבון יאפשר לסנכרן פגישות ומשימות ישירות ליומן גוגל שלך.
          </p>
          <Button 
            onClick={handleConnect} 
            disabled={loading}
            variant="outline"
            className="w-full gap-2 relative h-11 border-white/20 hover:bg-white/5"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Image src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" width={20} height={20} />
            )}
            התחבר לחשבון Google
          </Button>
        </>
      )}
    </div>
  );
}
