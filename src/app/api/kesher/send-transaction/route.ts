import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { auth } from "@/lib/auth";
import crypto from "crypto";

const ENCRYPTION_KEY = process.env.PAYMENT_ENCRYPTION_KEY || "12345678901234567890123456789012"; // 32 bytes
const IV_LENGTH = 16;

function encrypt(text: string) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString("hex") + ":" + encrypted.toString("hex");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      amount, 
      creditNumber, 
      expiry, 
      cvv2, 
      clientName, 
      phone, 
      email, 
      transactionId, 
      installments,
      paymentFrequency, // "one-time" | "recurring" | "user-choice"
      documentType,
      id,
      userId: requestUserId 
    } = body;

    const session = await auth();
    const userId = requestUserId || session?.user?.id;

    let settings: any = null;

    if (userId) {
      // Get user settings
      const userDoc = await adminDb.collection("users").doc(userId).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        
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

    if (!settings || !settings.userName || !settings.apiKey) {
      return NextResponse.json({ success: false, error: "כרגע לא ניתן להשתמש בשירות התשלומים. אנא פנה להנהלה." }, { status: 400 });
    }

    let numPayments = 1;
    let creditType = 1;

    if (paymentFrequency === "recurring" || installments === 9999) {
      // If the user specified a specific number of months (e.g. 12), use it. Otherwise, unlimited (9999).
      numPayments = (installments && installments > 0) ? installments : 9999;
      creditType = 10; // 10 is required by Kesher for standing order (הוראת קבע)
    } else if (installments && installments > 1) {
      // In Kesher, for installments, NumPayment is the total number minus the first payment
      numPayments = installments - 1;
      creditType = 8; // 8 is required by Kesher for installments (תשלומים)
    }

    let finalExpiry = expiry;
    if (finalExpiry && finalExpiry.length === 4) {
      const p1 = finalExpiry.substring(0, 2);
      const p2 = finalExpiry.substring(2, 4);
      // If the first part is <= 12 and the second part is > 12, it was sent as MMYY. Swap to YYMM.
      if (parseInt(p1) <= 12 && parseInt(p2) > 12) {
        finalExpiry = p2 + p1;
      }
    }

    const payload = {
      Json: {
        userName: settings.userName,
        password: settings.apiKey, 
        func: "SendTransaction",
        format: "json",
        tran: {
          Address: "",
          City: "",
          CreditNum: creditNumber,
          Token: null,
          Expiry: finalExpiry, // YYMM required by Kesher
          Cvv2: cvv2,
          Total: Math.round(Number(amount) * 100), // Required format: Agorot (e.g. 1 ILS = 100)
          Currency: 1, // 1 = ILS
          CreditType: creditType,
          NumPayment: numPayments,
          Phone: phone || "",
          ParamJ: "J4",
          TransactionType: "debit",
          Comment1: transactionId || "תשלום מובנה",
          FirstName: clientName ? clientName.split(" ")[0] : "",
          LastName: clientName && clientName.includes(" ") ? clientName.split(" ").slice(1).join(" ") : "NONAME",
          ProjectNumber: settings.paymentPageId || "",
          Mail: email || "",
          DocumentType: documentType ? Number(documentType) : 320,
          Id: id || ""
        }
      },
      format: "json"
    };

    console.log("================ KESHER API SEND_TRANSACTION REQUEST ================");
    console.log(JSON.stringify(payload, null, 2));

    const response = await fetch("https://kesherhk.info/ConnectToKesher/ConnectToKesher", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const resultText = await response.text();
    console.log("================ KESHER API RESPONSE ================");
    console.log(resultText);
    
    // DEBUG LOGGING
    try {
      require('fs').writeFileSync('kesher_debug_log.json', JSON.stringify({
        sentPayload: payload,
        response: resultText
      }, null, 2));
    } catch (e) {}

    let result;
    try {
      result = JSON.parse(resultText);
    } catch (e) {
      console.error("Kesher Parse Error:", resultText);
      return NextResponse.json({ success: false, error: "שגיאה בפיענוח תשובת קשר" }, { status: 500 });
    }

    const requestResult = result.RequestResult || result;

    if (requestResult.Status === false || requestResult.status === "error" || requestResult.error) {
      return NextResponse.json({ 
        success: false, 
        error: requestResult.Description || requestResult.error || "שגיאה בשליחה למערכת קשר",
        payloadSent: payload,
        rawResponse: requestResult
      }, { status: 400 });
    }

    // Encrypt the CC details to save in CRM
    const encryptedCC = encrypt(JSON.stringify({ creditNumber, expiry, cvv2 }));
    
    const receiptUrl = result?.DocumentsDetails?.DocumentDetails?.[0]?.PdfLink || 
                       result?.DocumentsDetails?.DocumentDetails?.[0]?.PdfLinkCopy || 
                       result?.CompanyTranId || 
                       result?.NumTransaction || 
                       "";

    return NextResponse.json({
      success: true,
      message: "התשלום עבר בהצלחה", // Prevent Kesher internal warnings like Code 499 ('נתונים לא נכונים') from reaching the UI
      transactionId: receiptUrl,
      encryptedCC
    });

  } catch (error: any) {
    console.error("Kesher SendTransaction Error:", error);
    return NextResponse.json({ success: false, error: error.message || "שגיאת שרת פנימית" }, { status: 500 });
  }
}
