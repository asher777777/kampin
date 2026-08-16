"use client";

import { Suspense } from "react";
import Link from "next/link";
import { CheckCircle2, Home, Loader2 } from "lucide-react";
import { useSearchParams } from "next/navigation";

function SuccessContent() {
  const searchParams = useSearchParams();
  const transactionId = searchParams.get("transaction_id");

  return (
    <div className="glass rounded-3xl p-8 border border-green-500/20 shadow-lg">
      <div className="flex justify-center mb-6">
        <div className="p-4 bg-green-500/10 rounded-full text-green-500 inline-flex">
          <CheckCircle2 className="w-16 h-16" />
        </div>
      </div>
      <h1 className="text-3xl font-bold mb-4">תשלום התקבל בהצלחה!</h1>
      <p className="text-foreground/70 mb-2">
        תודה רבה שבחרת במחולל הקהילות.
      </p>
      {transactionId && (
        <p className="text-sm text-foreground/50 mb-8">
          מספר אישור עסקה (קשר): <br/><span className="font-mono bg-background/50 px-2 py-1 rounded mt-1 inline-block">{transactionId}</span>
        </p>
      )}
      
      <Link
        href="/"
        className="inline-flex h-12 items-center justify-center rounded-full bg-primary-600 px-8 text-base font-medium text-white shadow-lg transition-colors hover:bg-primary-700 w-full"
      >
        <Home className="mr-2 h-4 w-4" />
        חזרה לעמוד הבית
      </Link>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] py-12">
      <div className="container px-4 max-w-md mx-auto text-center">
        <Suspense fallback={<div className="text-center py-10"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary-500" /></div>}>
          <SuccessContent />
        </Suspense>
      </div>
    </div>
  );
}

