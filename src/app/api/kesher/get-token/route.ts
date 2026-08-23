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
        if (userData?.useAdminKesher === false) {
          const userKesherDoc = await adminDb.collection("users").doc(userId).collection("settings").doc("kesher").get();
          if (userKesherDoc.exists) {
            settings = userKesherDoc.data();
          }
        }
      }
    }

    // Default for guest users and site-wide clearing: load from global settings
    if (!settings || (!settings.userName && !settings.apiKey)) {
      // Check configs/global
      const globalDoc = await adminDb.collection("configs").doc("global").get();
      if (globalDoc.exists) {
        const globalConfig = globalDoc.data() || {};
        settings = {
          userName: globalConfig.kesherUserName || globalConfig.userName || globalConfig.kesherSettings?.userName || "",
          apiKey: globalConfig.kesherApiKey || globalConfig.apiKey || globalConfig.kesherSettings?.apiKey || "",
          paymentPageId: globalConfig.kesherPaymentPageId || globalConfig.paymentPageId || globalConfig.kesherSettings?.paymentPageId || "",
          ezCountToken: globalConfig.kesherEzCountToken || globalConfig.ezCountToken || globalConfig.kesherSettings?.ezCountToken || "",
        };
      }

      // Check root settings/kesher
      if (!settings?.userName || !settings?.apiKey) {
        const rootKesherDoc = await adminDb.collection("settings").doc("kesher").get();
        if (rootKesherDoc.exists) {
          const rData = rootKesherDoc.data() || {};
          settings = {
            userName: rData.userName || rData.kesherUserName || "",
            apiKey: rData.apiKey || rData.kesherApiKey || "",
            paymentPageId: rData.paymentPageId || rData.kesherPaymentPageId || "",
            ezCountToken: rData.ezCountToken || rData.kesherEzCountToken || "",
          };
        }
      }

      // Check admin user settings
      if (!settings?.userName || !settings?.apiKey) {
        const adminKesher = await adminDb.collection("users").doc("1").collection("settings").doc("kesher").get();
        if (adminKesher.exists) {
          const aData = adminKesher.data() || {};
          settings = {
            userName: aData.userName || aData.kesherUserName || "",
            apiKey: aData.apiKey || aData.kesherApiKey || "",
            paymentPageId: aData.paymentPageId || aData.kesherPaymentPageId || "",
            ezCountToken: aData.ezCountToken || aData.kesherEzCountToken || "",
          };
        }
      }

      // Fallback: Environment Variables
      if (!settings?.userName || !settings?.apiKey) {
        if (process.env.KESHER_USER_NAME && process.env.KESHER_API_KEY) {
          settings = {
            userName: process.env.KESHER_USER_NAME,
            apiKey: process.env.KESHER_API_KEY,
            paymentPageId: process.env.KESHER_PAYMENT_PAGE_ID || "",
            ezCountToken: process.env.KESHER_EZCOUNT_TOKEN || "",
          };
        }
      }
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
