import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { auth } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { amount, clientName, phone, email, details, transactionId, installments, campaignId, userId: requestUserId } = body;

    const session = await auth();
    const userId = requestUserId || session?.user?.id;

    const { getEffectiveKesherSettings } = await import("@/features/kesher/actions");
    const settings = await getEffectiveKesherSettings(userId, campaignId);

    if (!settings || !settings.userName || !settings.apiKey) {
      return NextResponse.json({ success: false, error: "כרגע לא ניתן להשתמש בשירות התשלומים (פרטי חיבור לקשר חסרים). אנא פנה להנהלה." }, { status: 400 });
    }

    const paymentPageId = (settings.paymentPageId || process.env.KESHER_PAYMENT_PAGE_ID || "").trim();

    if (!paymentPageId || paymentPageId === "000") {
      return NextResponse.json({ 
        success: false, 
        error: "לתשלום באמצעות Bit / Google Pay יש להגדיר 'מספר דף תשלום' (Payment Page ID) בהגדרות קשר בלוח הבקרה. ניתן לשלם כעת ישירות באמצעות כרטיס אשראי." 
      }, { status: 400 });
    }

    const rawName = (clientName || "").trim();
    const nameParts = rawName.split(" ").filter(Boolean);
    const firstName = nameParts[0] || "תורם";
    const lastName = nameParts.slice(1).join(" ") || "קמפיין";
    const validPhone = (phone && phone.trim().length >= 7) ? phone.trim() : "0500000000";
    const validEmail = (email && email.includes("@")) ? email.trim() : "donor@hakel.club";

    const payload = {
      Json: {
        userName: settings.userName,
        password: settings.apiKey,
        func: "GetLinkToken",
        format: "json",
        request: {
          PaymentPageId: paymentPageId,
          Currency: 1, // ILS
          Total: Number(amount),
          FirstName: firstName,
          LastName: lastName,
          Mail: validEmail,
          Tel: validPhone,
          CreditType: "1", // Regular payment
          Date: new Date().toISOString().split("T")[0],
          Comment: details || "תשלום / תרומה",
          AddData: transactionId || `TXN_${Date.now()}`,
          NumPayment: 1,
          MaxPayments: 1,
          Moked: "CommunityGenerator"
        }
      },
      format: "json"
    };

    const response = await fetch("https://kesherhk.info/ConnectToKesher/ConnectToKesher", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const resultText = await response.text();
    
    console.log("================ KESHER API REQUEST ================");
    console.log(JSON.stringify(payload, null, 2));
    console.log("================ KESHER API RESPONSE ================");
    console.log(resultText);
    console.log("=====================================================");

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

    // Based on plugin logic
    if (!token || !status || code != 944) {
      console.error("Kesher Token Error:", result);
      return NextResponse.json({ success: false, error: "שגיאה בהפקת טוקן לתשלום. " + (result.RequestResult?.Description || "") }, { status: 500 });
    }

    // Construct the iframe URL with all the extra parameters
    const params = new URLSearchParams();
    params.append("token", token);
    if (amount) params.append("total", String(amount));
    params.append("currency", "1");
    if (clientName) {
      params.append("firstname", clientName.split(" ")[0] || "");
      params.append("lastname", clientName.split(" ").slice(1).join(" ") || "");
    }
    if (phone) params.append("tel", phone);
    if (email) params.append("mail", email);
    if (transactionId) params.append("addactiondata", transactionId);
    if (installments && installments > 1) {
      params.append("credittype", "4"); // 4 is regular credit installments
      params.append("numpayment", String(installments));
    } else {
      params.append("credittype", "1"); // 1 is regular credit payment
    }

    return NextResponse.json({
      success: true,
      token: token,
      iframeUrl: `https://ultra.kesherhk.info/external/paymentPage/${paymentPageId}?${params.toString()}`
    });

  } catch (error: any) {
    console.error("Kesher GetToken Error:", error);
    return NextResponse.json({ success: false, error: error.message || "שגיאת שרת פנימית" }, { status: 500 });
  }
}
