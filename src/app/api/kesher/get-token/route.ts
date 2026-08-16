import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { auth } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { amount, clientName, phone, email, details, transactionId, installments, userId: requestUserId } = body;

    const session = await auth();
    const userId = requestUserId || session?.user?.id;

    let settings: any = null;

    if (userId) {
      // Get user settings
      const userDoc = await adminDb.collection("users").doc(userId).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        
        // If user is marked to use admin Kesher, get global config
        if (userData?.useAdminKesher) {
          const globalDoc = await adminDb.collection("configs").doc("global").get();
          const globalConfig = globalDoc.data() || {};
          settings = {
            userName: globalConfig.kesherUserName || "",
            apiKey: globalConfig.kesherApiKey || "",
            paymentPageId: globalConfig.kesherPaymentPageId || "",
            ezCountToken: globalConfig.kesherEzCountToken || ""
          };
        } else if (userData?.kesherSettings?.userName || userData?.kesherSettings?.apiKey) {
          settings = userData.kesherSettings;
        } else if (userData?.settings?.kesher) {
          settings = userData.settings.kesher;
        }
      }
    }

    // If no valid settings found at all, fall back to global admin settings
    if (!settings || (!settings.userName && !settings.apiKey)) {
      const globalDoc = await adminDb.collection("configs").doc("global").get();
      const globalConfig = globalDoc.exists ? globalDoc.data() : null;

      settings = {
        userName: globalConfig?.kesherUserName || "",
        apiKey: globalConfig?.kesherApiKey || "",
        paymentPageId: globalConfig?.kesherPaymentPageId || "",
        ezCountToken: globalConfig?.kesherEzCountToken || ""
      };
    }

    if (!settings || !settings.userName || !settings.apiKey || !settings.paymentPageId) {
      return NextResponse.json({ success: false, error: "כרגע לא ניתן להשתמש בשירות התשלומים. אנא פנה להנהלה." }, { status: 400 });
    }

    const payload = {
      Json: {
        userName: settings.userName,
        password: settings.apiKey, // The plugin uses password
        func: "GetLinkToken",
        format: "json",
        request: {
          PaymentPageId: settings.paymentPageId, // Pass as string to keep "000"
          Currency: 1, // ILS
          Total: Number(amount),
          FirstName: clientName ? clientName.split(" ")[0] : "",
          LastName: clientName ? clientName.split(" ").slice(1).join(" ") : "",
          Mail: email || "",
          Tel: phone || "",
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
      iframeUrl: `https://ultra.kesherhk.info/external/paymentPage/${settings.paymentPageId}?${params.toString()}`
    });

  } catch (error: any) {
    console.error("Kesher GetToken Error:", error);
    return NextResponse.json({ success: false, error: error.message || "שגיאת שרת פנימית" }, { status: 500 });
  }
}
