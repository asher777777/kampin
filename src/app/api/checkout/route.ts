import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { auth } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ success: false, error: "לא נמצא משתמש מחובר" }, { status: 401 });
    }

    const body = await request.json();
    const { plan, amount, name, email, phone } = body;

    // Get global Kesher settings
    const globalDoc = await adminDb.collection("configs").doc("global").get();
    const globalConfig = globalDoc.exists ? globalDoc.data() : null;

    if (!globalConfig?.kesherUserName || !globalConfig?.kesherApiKey || !globalConfig?.kesherPaymentPageId) {
      console.warn("Kesher settings not fully defined in global configs.");
      return NextResponse.json({ success: false, error: "שגיאה בהגדרות מערכת קשר" }, { status: 500 });
    }

    const payload = {
      Json: {
        userName: globalConfig.kesherUserName,
        password: globalConfig.kesherApiKey,
        func: "GetLinkToken",
        format: "json",
        request: {
          PaymentPageId: globalConfig.kesherPaymentPageId,
          Currency: 1, // ILS
          Total: Number(amount),
          FirstName: name ? name.split(" ")[0] : "",
          LastName: name ? name.split(" ").slice(1).join(" ") : "",
          Mail: email || "",
          Tel: phone || "",
          CreditType: "1",
          Date: new Date().toISOString().split("T")[0],
          Comment: `תשלום עבור תוכנית ${plan} במחולל הקהילות`,
          AddData: `SAAS_${userId}_${plan}_${Date.now()}`,
          NumPayment: 1,
          MaxPayments: 1,
          Moked: "CommunityGenerator"
        }
      },
      format: "json"
    };

    console.log("Kesher API Payload sent (Checkout):", JSON.stringify(payload, null, 2));

    const response = await fetch("https://kesherhk.info/ConnectToKesher/ConnectToKesher", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const resultText = await response.text();
    console.log("Kesher API Response (Checkout):", resultText);

    let result;
    try {
      result = JSON.parse(resultText);
    } catch (e) {
      console.error("Kesher Parse Error:", resultText);
      return NextResponse.json({ success: false, error: "שגיאה בפיענוח תשובת קשר" }, { status: 500 });
    }

    const token = result.Token;
    const status = result.RequestResult?.Status;
    const code = result.RequestResult?.Code;

    if (!token || !status || code != 944) {
      return NextResponse.json({ success: false, error: "שגיאה בהפקת דף תשלום מקשר: " + (result.RequestResult?.Description || "") }, { status: 500 });
    }

    const params = new URLSearchParams();
    params.append("token", token);
    params.append("total", String(amount));
    params.append("currency", "1");
    if (name) {
      params.append("firstname", name.split(" ")[0] || "");
      params.append("lastname", name.split(" ").slice(1).join(" ") || "");
    }
    if (phone) params.append("tel", phone);
    if (email) params.append("mail", email);
    params.append("addactiondata", `SAAS_${Date.now()}`);
    params.append("credittype", "1");

    return NextResponse.json({
      success: true,
      paymentUrl: `https://ultra.kesherhk.info/external/paymentPage/${globalConfig.kesherPaymentPageId}??${params.toString()}`
    });

  } catch (error: any) {
    console.error("Checkout API Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "שגיאה בתהליך התשלום" },
      { status: 500 }
    );
  }
}
