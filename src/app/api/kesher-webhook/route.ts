import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Kesher returns status via GET params
    const transactionId = searchParams.get("transactionId");
    const status = searchParams.get("Status");
    const docNumber = searchParams.get("docNumber");
    const receiptLink = searchParams.get("receiptLink");
    const amount = searchParams.get("Amount");
    const addData = searchParams.get("AddData");

    const recordId = addData || transactionId;

    if (!recordId) {
      return NextResponse.json({ success: false, error: "חסר מזהה עסקה" }, { status: 400 });
    }

    // Get global configs for Kesher credentials
    const globalDoc = await adminDb.collection("configs").doc("global").get();
    const globalConfig = globalDoc.exists ? globalDoc.data() : null;

    let realReceiptLink = receiptLink || "";
    let realDocNumber = docNumber || "";

    // Query GetTranData to get PdfLink if not present in the webhook
    if (globalConfig?.kesherUserName && globalConfig?.kesherApiKey && transactionId) {
      try {
        const payload = {
          Json: {
            userName: globalConfig.kesherUserName,
            password: globalConfig.kesherApiKey,
            func: "GetTranData",
            format: "json",
            request: {
              transactionNum: transactionId
            }
          },
          format: "json"
        };

        const res = await fetch("https://kesherhk.info/ConnectToKesher/ConnectToKesher", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        const resText = await res.text();
        const resData = JSON.parse(resText);
        if (resData.DocumentsDetails) {
          realReceiptLink = resData.DocumentsDetails.PdfLink || resData.DocumentsDetails.PdfLinkCopy || realReceiptLink || "";
          realDocNumber = resData.DocumentsDetails.DocNumber || resData.DocNumber || realDocNumber || "";
        }
      } catch (e) {
        console.error("Failed to query GetTranData in webhook:", e);
      }
    }

    // Try to update the record in our DB
    const orderRef = adminDb.collection("orders").doc(recordId);
    
    // Update the record with receipt data
    await orderRef.set({
      kesherStatus: status || "unknown",
      docNumber: realDocNumber || "",
      receiptLink: realReceiptLink || "",
      paidAmount: amount || 0,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    // Handle SaaS subscription upgrade if AddData is present
    if (addData && addData.startsWith("SAAS_")) {
      try {
        const parts = addData.split("_");
        const userId = parts[1];
        const plan = parts[2];
        
        if (userId) {
          // Upgrade the user in Firestore
          await adminDb.collection("users").doc(userId).update({
            role: plan === "enterprise" ? "ENTERPRISE" : "PRO",
            subscriptionStatus: "active",
            subscriptionPlan: plan,
            updatedAt: new Date().toISOString()
          });
          console.log(`Successfully upgraded user ${userId} to plan ${plan} via webhook.`);
        }
      } catch (upgradeErr) {
        console.error("Failed to process user SaaS upgrade in webhook:", upgradeErr);
      }
    }

    return NextResponse.json({ success: true, message: "Webhook התקבל בהצלחה" });
  } catch (error: any) {
    console.error("Kesher Webhook Error:", error);
    return NextResponse.json({ success: false, error: "שגיאת שרת פנימית" }, { status: 500 });
  }
}
