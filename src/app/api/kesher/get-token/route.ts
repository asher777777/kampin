import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { auth } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { amount, clientName, phone, email, details, transactionId, installments, walletType, campaignId, userId: requestUserId } = body;

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
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : firstName;
    const cleanPhone = (phone || "").replace(/[^0-9]/g, "");
    const validPhone = cleanPhone.length >= 9 ? cleanPhone : "0500000000";
    const validEmail = (email && email.includes("@")) ? email.trim() : "donor@hakel.club";

    // 1. Direct Bit transaction via SendBitTransaction API (Official Kesher Bit API)
    if (walletType === "bit") {
      const bitPayload = {
        Json: {
          userName: settings.userName,
          password: settings.apiKey,
          func: "SendBitTransaction",
          format: "json",
          transaction: {
            FirstName: firstName,
            LastName: lastName,
            Total: Math.round(Number(amount) * 100), // סכום באגורות
            Phone: validPhone,
            Currency: 1, // 1 לשקל
            CreditType: 1, // 1 = חיוב רגיל
            NumPayment: 1,
            ProjectNumber: "000"
          }
        },
        format: "json"
      };

      console.log("================ KESHER SEND BIT API REQUEST ================");
      console.log(JSON.stringify(bitPayload, null, 2));

      try {
        const bitResponse = await fetch("https://kesherhk.info/ConnectToKesher/ConnectToKesher", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(bitPayload)
        });

        const bitResText = await bitResponse.text();
        console.log("================ KESHER SEND BIT API RESPONSE ================");
        console.log(bitResText);
        console.log("==============================================================");

        let bitResult: any = null;
        try {
          bitResult = JSON.parse(bitResText);
        } catch (e) {
          console.error("Kesher Bit JSON Parse error:", bitResText);
        }

        const bUrl = bitResult?.BitOutput?.linkAndroid || 
                     bitResult?.BitOutput?.linkIos || 
                     bitResult?.BitOutput?.link || 
                     bitResult?.BitUrl || 
                     bitResult?.Url || 
                     null;

        const isSuccess = bitResult?.RequestResult?.Status === true || 
                          bitResult?.RequestResult?.Code === 30001087 || 
                          bitResult?.RequestResult?.Code === 0 || 
                          Boolean(bUrl);

        if (isSuccess) {
          return NextResponse.json({
            success: true,
            bitUrl: bUrl,
            message: bitResult?.RequestResult?.Description || "נשלח אליך כעת מסרון לטלפון, נא אשר את התשלום",
            transactionId: bitResult?.NumTransaction || bitResult?.CompanyTranId || "",
            isDirectBit: true
          });
        }

        const errorDesc = bitResult?.RequestResult?.Description || bitResult?.error || bitResText || "שגיאה בחיבור ל-Bit";
        return NextResponse.json({
          success: false,
          error: `שגיאה מקשר (Bit): ${errorDesc}`
        }, { status: 400 });

      } catch (bitErr: any) {
        console.error("SendBitTransaction exception:", bitErr);
        return NextResponse.json({
          success: false,
          error: `שגיאת תקשורת עם שרת קשר (Bit): ${bitErr.message}`
        }, { status: 500 });
      }
    }

    const reqData: any = {
      PaymentPageId: paymentPageId,
      Currency: 1, // ILS
      Total: Number(amount),
      FirstName: firstName,
      LastName: lastName,
      Mail: validEmail,
      Tel: validPhone,
      CreditType: installments && installments > 1 ? "4" : "1",
      Date: new Date().toISOString().split("T")[0],
      Comment: details || "תשלום / תרומה",
      AddData: transactionId || `TXN_${Date.now()}`,
      NumPayment: installments && installments > 1 ? installments : 1,
      MaxPayments: installments && installments > 1 ? installments : 1,
      Moked: "CommunityGenerator"
    };

    const payload = {
      Json: {
        userName: settings.userName,
        password: settings.apiKey,
        func: "GetLinkToken",
        format: "json",
        request: reqData
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
      params.append("firstname", firstName);
      params.append("lastname", lastName);
    }
    if (phone) params.append("tel", phone);
    if (email) params.append("mail", email);
    if (transactionId) params.append("addactiondata", transactionId);
    
    if (installments && installments > 1) {
      params.append("credittype", "4");
      params.append("numpayment", String(installments));
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
