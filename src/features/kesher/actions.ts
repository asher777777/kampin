"use server";

import { adminDb } from "@/lib/firebase-admin";

export async function getEffectiveKesherSettings(userId?: string, campaignId?: string) {
  try {
    // 1. Check specified userId
    if (userId) {
      const userDoc = await adminDb.collection("users").doc(userId).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        if (userData?.kesherSettings?.userName && userData?.kesherSettings?.apiKey) {
          return {
            userName: userData.kesherSettings.userName,
            apiKey: userData.kesherSettings.apiKey,
            paymentPageId: userData.kesherSettings.paymentPageId || "",
            ezCountToken: userData.kesherSettings.ezCountToken || "",
            isActive: true,
          };
        }
        if (userData?.useAdminKesher === false) {
          const userKesherDoc = await adminDb.collection("users").doc(userId).collection("settings").doc("kesher").get();
          if (userKesherDoc.exists) {
            const uData = userKesherDoc.data();
            if (uData?.userName && uData?.apiKey) {
              return {
                userName: uData.userName,
                apiKey: uData.apiKey,
                paymentPageId: uData.paymentPageId || "",
                ezCountToken: uData.ezCountToken || "",
                isActive: true,
              };
            }
          }
        }
      }
    }

    // 2. Check campaign owner if campaignId is provided
    if (campaignId && campaignId !== "home" && campaignId !== "default-campaign") {
      try {
        const campaignDoc = await adminDb.collection("campaigns").doc(campaignId).get();
        if (campaignDoc.exists) {
          const campData = campaignDoc.data();
          const ownerId = campData?.ownerId || campData?.userId;
          if (ownerId && ownerId !== userId) {
            const ownerSettings: any = await getEffectiveKesherSettings(ownerId);
            if (ownerSettings?.isActive) {
              return ownerSettings;
            }
          }
        }
      } catch (e) {}
    }

    // 3. Check configs/global (Superadmin Global Config)
    const globalDoc = await adminDb.collection("configs").doc("global").get();
    if (globalDoc.exists) {
      const gData = globalDoc.data() || {};
      const uName = gData.kesherUserName || gData.userName || gData.kesherSettings?.userName;
      const aKey = gData.kesherApiKey || gData.apiKey || gData.kesherSettings?.apiKey;
      if (uName && aKey) {
        return {
          userName: uName,
          apiKey: aKey,
          paymentPageId: gData.kesherPaymentPageId || gData.paymentPageId || gData.kesherSettings?.paymentPageId || "",
          ezCountToken: gData.kesherEzCountToken || gData.ezCountToken || gData.kesherSettings?.ezCountToken || "",
          isActive: true,
        };
      }
    }

    // 4. Check root settings/kesher
    const rootKesherDoc = await adminDb.collection("settings").doc("kesher").get();
    if (rootKesherDoc.exists) {
      const rData = rootKesherDoc.data() || {};
      const uName = rData.userName || rData.kesherUserName;
      const aKey = rData.apiKey || rData.kesherApiKey;
      if (uName && aKey) {
        return {
          userName: uName,
          apiKey: aKey,
          paymentPageId: rData.paymentPageId || rData.kesherPaymentPageId || "",
          ezCountToken: rData.ezCountToken || rData.kesherEzCountToken || "",
          isActive: true,
        };
      }
    }

    // 5. Check all SUPERADMIN / ADMIN users in Firestore
    try {
      const superAdmins = await adminDb.collection("users").where("role", "in", ["SUPERADMIN", "ADMIN"]).limit(5).get();
      for (const doc of superAdmins.docs) {
        const data = doc.data();
        if (data.kesherSettings?.userName && data.kesherSettings?.apiKey) {
          return {
            userName: data.kesherSettings.userName,
            apiKey: data.kesherSettings.apiKey,
            paymentPageId: data.kesherSettings.paymentPageId || "",
            ezCountToken: data.kesherSettings.ezCountToken || "",
            isActive: true,
          };
        }
        const adminSub = await adminDb.collection("users").doc(doc.id).collection("settings").doc("kesher").get();
        if (adminSub.exists) {
          const subData = adminSub.data();
          if (subData?.userName && subData?.apiKey) {
            return {
              userName: subData.userName,
              apiKey: subData.apiKey,
              paymentPageId: subData.paymentPageId || "",
              ezCountToken: subData.ezCountToken || "",
              isActive: true,
            };
          }
        }
      }
    } catch (e) {}

    // 6. Check legacy doc("1")
    try {
      const legacyAdmin = await adminDb.collection("users").doc("1").collection("settings").doc("kesher").get();
      if (legacyAdmin.exists) {
        const lData = legacyAdmin.data();
        if (lData?.userName && lData?.apiKey) {
          return {
            userName: lData.userName,
            apiKey: lData.apiKey,
            paymentPageId: lData.paymentPageId || "",
            ezCountToken: lData.ezCountToken || "",
            isActive: true,
          };
        }
      }
    } catch (e) {}

    // 7. Fallback: Environment Variables
    if (process.env.KESHER_USER_NAME && process.env.KESHER_API_KEY) {
      return {
        userName: process.env.KESHER_USER_NAME,
        apiKey: process.env.KESHER_API_KEY,
        paymentPageId: process.env.KESHER_PAYMENT_PAGE_ID || "",
        ezCountToken: process.env.KESHER_EZCOUNT_TOKEN || "",
        isActive: true,
      };
    }
  } catch (err) {
    console.error("Error in getEffectiveKesherSettings:", err);
  }

  return {
    userName: "",
    apiKey: "",
    paymentPageId: "",
    ezCountToken: "",
    isActive: false,
  };
}

export async function getKesherSettings(customUserId?: string) {
  try {
    const { auth } = await import("@/lib/auth");
    const session = await auth();
    const userId = customUserId || session?.user?.id;
    return await getEffectiveKesherSettings(userId);
  } catch (err) {
    console.error("Error getting Kesher settings:", err);
    return await getEffectiveKesherSettings();
  }
}

export async function saveKesherSettings(settings: any) {
  try {
    const { auth } = await import("@/lib/auth");
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) throw new Error("Unauthorized");
    const { getUserDb } = await import("@/lib/firebase-admin");
    const docRef = getUserDb(userId).collection("settings").doc("kesher");
    // Automatically set isActive to true if credentials exist
    const isActive = !!(settings.userName && settings.apiKey);
    await docRef.set({ ...settings, isActive }, { merge: true });
    return { success: true };
  } catch (error) {
    console.error("Error saving Kesher settings:", error);
    return { success: false, error: (error as Error).message };
  }
}

export async function createManualInvoice(data: any) {
  try {
    const { auth } = await import("@/lib/auth");
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    const settings = await getKesherSettings();
    if (!settings?.userName || !settings?.apiKey) {
      return { success: false, error: "לא הוגדרו פרטי קשר (שם משתמש וסיסמה) בלוח הבקרה." };
    }

    if (!settings.ezCountToken) {
      return { success: false, error: "לא הוגדר טוקן איזיקאונט בלוח הבקרה. טוקן זה חובה להפקת קבלות ידניות דרך קשר." };
    }

    // SendCashTransaction for Manual Receipts (Cash/Check/BankTransfer)
    const payload = {
      Json: {
        userName: settings.userName,
        password: settings.apiKey, 
        func: "SendCashTransaction", 
        format: "json",
        cashTran: {
          Bank: data.bankName || "",
          Phone: data.phone || "",
          Total: Math.round(Number(data.amount) * 100),
          Branch: data.branchNumber || "",
          Account: data.accountNumber || "",
          Currency: 1, // ILS
          LastName: data.clientName.split(" ").slice(1).join(" ") || "",
          FirstName: data.clientName.split(" ")[0] || "",
          CheckNumber: data.checkNumber || null,
          ProjectNumber: data.receiptType || "405", // Receipt type
          TransactionType: "debit",
          ChargeOptionType: data.paymentType
        }
      },
      format: "json"
    };

    try {
      const response = await fetch("https://kesherhk.info/ConnectToKesher/ConnectToKesher", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      const responseText = await response.text();
      let result;
      try {
        result = JSON.parse(responseText);
      } catch {
        result = responseText; // In case Kesher returns non-JSON ok message
      }
      
      console.log("Kesher API Payload sent:", JSON.stringify(payload, null, 2));
      console.log("Kesher API Response:", result);

      if (result && (result.Status === false || result.status === "error" || result.error)) {
        throw new Error(`שגיאה מקשר: ${result.Description || result.error || "ללא תיאור"} (קוד: ${result.Code || ""})`);
      }
      
      // Save to CRM contacts
      // First, try to find the contact by zeout, phone, or email
      let existingContactId: string | null = null;
      let existingContactData: any = null;

      try {
        const contactsRef = adminDb.collection("contacts");
        let querySnapshot;

        if (data.phone) {
          querySnapshot = await contactsRef.where("conta_phone", "==", data.phone).limit(1).get();
        } else if (data.email) {
          querySnapshot = await contactsRef.where("email", "==", data.email).limit(1).get();
        } else if (data.zeout) {
          querySnapshot = await contactsRef.where("tg1", "==", data.zeout).limit(1).get(); // Assuming tg1 holds zeout/ID
        }

        if (querySnapshot && !querySnapshot.empty) {
          existingContactId = querySnapshot.docs[0].id;
          existingContactData = querySnapshot.docs[0].data();
        }
      } catch (e) {
        console.error("Error finding existing contact:", e);
      }

      const paymentRecord = {
        id: `pay_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        date: new Date().toISOString(),
        amount: data.amount,
        paymentType: data.paymentType,
        receiptType: data.receiptType || "405",
        kesherStatus: typeof result === 'string' ? result : "Success",
        receiptLink: result?.DocUrl || result?.Url || "" // Capture URL if returned by Kesher
      };

      const paymentDetails = {
        checkNumber: data.checkNumber || "",
        bankName: data.bankName || "",
        branchNumber: data.branchNumber || "",
        accountNumber: data.accountNumber || "",
        transferRef: data.transferRef || "",
      };

      if (existingContactId) {
        // Update existing
        const payments = existingContactData.payments || [];
        payments.push(paymentRecord);
        
        await adminDb.collection("contacts").doc(existingContactId).update({
          payments: payments,
          total_spent: (existingContactData.total_spent || 0) + data.amount,
          updatedAt: new Date().toISOString(),
        });
      } else {
        // Create new
        await adminDb.collection("contacts").add({
          ownerId: session.user.id,
          status: "active",
          conta_name: data.clientName,
          conta_phone: data.phone || "",
          email: data.email || "",
          tg1: data.zeout || "",
          payments: [paymentRecord],
          payment_details: paymentDetails,
          total_spent: data.amount,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lead_source: "Manual Receipt"
        });
      }

      return { 
        success: true, 
        message: "הקבלה נשמרה ב-CRM ונשלחה לקשר בהצלחה!", 
        kesherResult: result, 
        payloadSent: payload 
      };

    } catch (apiError: any) {
      console.error("Kesher API Error during manual invoice:", apiError);
      
      // Do not save to CRM if Kesher explicitly failed
      return { 
        success: false, 
        error: apiError.message || "שגיאה בשליחה למערכת קשר",
        payloadSent: payload,
        rawResponse: apiError.message
      };
    }

  } catch (error: any) {
    console.error("Error creating manual invoice:", error);
    return { success: false, error: error.message };
  }
}

export async function connectEasyCount(ezCountToken: string) {
  try {
    const { auth } = await import("@/lib/auth");
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    const settings = await getKesherSettings();
    if (!settings?.userName || !settings?.apiKey) {
      return { success: false, error: "לא הוגדרו פרטי קשר (שם משתמש וסיסמה)." };
    }

    // Save the ezCountToken to settings
    await saveKesherSettings({ ...settings, ezCountToken });

    // The Kesher docs specify a GET request. We guess the parameters since they are missing from their table.
    const url = new URL("https://kesherhk.info/KesherAPI/ConnectToEZCountService");
    url.searchParams.append("userName", settings.userName);
    url.searchParams.append("password", settings.apiKey);
    url.searchParams.append("token", ezCountToken); // guessing the param name

    const response = await fetch(url.toString(), {
      method: "GET",
    });

    const resultText = await response.text();
    let result;
    try {
      result = JSON.parse(resultText);
    } catch {
      result = { Message: resultText };
    }

    console.log("Kesher EasyCount Connect Response:", result);

    if (result && result.Succeeded === false) {
      return { success: false, error: result.Message || "שגיאה בחיבור לאיזיקאונט דרך קשר." };
    }

    return { success: true, message: result.Message || "חובר בהצלחה לאיזיקאונט!" };
  } catch (error: any) {
    console.error("Error connecting EasyCount:", error);
    return { success: false, error: error.message };
  }
}

function normalizePhone(phone?: string): string {
  if (!phone) return "";
  let clean = phone.replace(/[^0-9]/g, "");
  if (clean.startsWith("972")) {
    clean = "0" + clean.slice(3);
  } else if (clean.length === 9 && clean.startsWith("5")) {
    clean = "0" + clean;
  }
  return clean;
}

function formatDateForKesher(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}/${mm}/${dd}`;
}

export async function syncKesherClients(timeframe: "all" | "year" | "3months" | "week" = "all") {
  try {
    const { auth } = await import("@/lib/auth");
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");
    const userId = session.user.id;

    const settings = await getKesherSettings(userId);
    if (!settings?.userName || !settings?.apiKey) {
      return { success: false, error: "לא הוגדרו פרטי קשר (שם משתמש וסיסמה) בלוח הבקרה." };
    }

    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let pastDate = new Date("2020/01/01");
    if (timeframe === "year") {
      pastDate = new Date(now);
      pastDate.setFullYear(now.getFullYear() - 1);
    } else if (timeframe === "3months") {
      pastDate = new Date(now);
      pastDate.setMonth(now.getMonth() - 3);
    } else if (timeframe === "week") {
      pastDate = new Date(now);
      pastDate.setDate(now.getDate() - 7);
    }

    // Build payload according to official Kesher GetTrans PDF specification
    const payload = {
      func: "GetTrans",
      format: "json",
      userName: settings.userName,
      password: settings.apiKey,
      fromDate: formatDateForKesher(pastDate),
      toDate: formatDateForKesher(tomorrow)
    };

    console.log("[Kesher Sync] Sending request:", JSON.stringify({ ...payload, password: "***" }));

    let responseText = "";
    let result: any = null;
    let lastStatusCode = 200;

    // Retry loop with backoff (in case of temporary Kesher 502/Cloudflare glitch)
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const response = await fetch("https://kesherhk.info/ConnectToKesher/ConnectToKesher", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
          },
          body: JSON.stringify(payload),
        });

        lastStatusCode = response.status;
        responseText = await response.text();

        if (responseText && responseText.trim().startsWith("{")) {
          result = JSON.parse(responseText);
          break;
        }

        // If direct format didn't return json, try wrapped format
        if (attempt === 1) {
          const wrappedPayload = { Json: payload, format: "json" };
          const wrapRes = await fetch("https://kesherhk.info/ConnectToKesher/ConnectToKesher", {
            method: "POST",
            headers: { 
              "Content-Type": "application/json",
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            },
            body: JSON.stringify(wrappedPayload),
          });
          const wrapText = await wrapRes.text();
          if (wrapText && wrapText.trim().startsWith("{")) {
            result = JSON.parse(wrapText);
            break;
          }
        }
      } catch (fetchErr: any) {
        console.warn(`[Kesher Sync] Attempt ${attempt} failed:`, fetchErr.message);
      }

      if (attempt < 3) {
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    if (!result) {
      if (lastStatusCode === 502 || responseText.includes("502") || responseText.includes("Bad gateway") || responseText.includes("<!DOCTYPE")) {
        return { 
          success: false, 
          error: "שרתי חברת 'קשר' אינם זמינים כרגע באופן זמני (שגיאת תקשורת 502 Bad Gateway משרת קשר). אנא נסה שוב בעוד מספר רגעים." 
        };
      }
      return { success: false, error: "תשובה לא תקינה התקבלה משרת קשר.", rawResponse: responseText.substring(0, 300) };
    }

    if (result && result.Status === false && !result.Transaction) {
      return { success: false, error: `שגיאה מקשר: ${result.Description || result.Message || "לא ידוע"}`, rawResponse: result };
    }

    let transactions: any[] = [];
    if (result?.Transaction) {
      transactions = Array.isArray(result.Transaction) ? result.Transaction : [result.Transaction];
    } else if (result?.Transactions) {
      transactions = Array.isArray(result.Transactions) ? result.Transactions : [result.Transactions];
    }

    if (transactions.length === 0) {
      return { 
        success: true, 
        added: 0, 
        updated: 0, 
        totalTransactions: 0,
        message: "לא נמצאו עסקאות חדשות בטווח התאריכים המבוקש.",
        rawResponse: result
      };
    }

    // Group transactions by customer
    // Unique customer identifier: normalized phone -> email -> Tz
    const customersMap = new Map<string, {
      demographics: {
        conta_name: string;
        f_m: string;
        l_m: string;
        conta_phone: string;
        email: string;
        company_name: string;
        mh_crm_city: string;
        mh_crm_street: string;
        tg1: string; // Tz / ID
      };
      payments: any[];
      donations: any[];
      events: any[];
    }>();

    for (const tx of transactions) {
      const rawPhone = tx.Phone || tx.Phone2 || "";
      const normPhone = normalizePhone(rawPhone);
      const cleanEmail = (tx.Mail || "").trim().toLowerCase();
      const cleanTz = (tx.Tz || "").trim();
      const fullName = (tx.Name || `${tx.FirstName || ""} ${tx.LastName || ""}`).trim();

      if (!normPhone && !cleanEmail && !cleanTz && !fullName) {
        continue;
      }

      const customerKey = normPhone || cleanEmail || cleanTz || fullName;

      if (!customersMap.has(customerKey)) {
        customersMap.set(customerKey, {
          demographics: {
            conta_name: fullName || "לקוח קשר",
            f_m: (tx.FirstName || "").trim(),
            l_m: (tx.LastName || "").trim(),
            conta_phone: normPhone || rawPhone,
            email: cleanEmail,
            company_name: (tx.CompanyName || "").trim(),
            mh_crm_city: (tx.City || "").trim(),
            mh_crm_street: [tx.Address, tx.NumHouse, tx.Entrance ? `כניסה ${tx.Entrance}` : "", tx.ApartmentNumber ? `דירה ${tx.ApartmentNumber}` : ""].filter(Boolean).join(" ").trim(),
            tg1: cleanTz,
          },
          payments: [],
          donations: [],
          events: [],
        });
      }

      const cust = customersMap.get(customerKey)!;

      // Fill in any missing demographic data from subsequent transactions
      if (!cust.demographics.conta_phone && normPhone) cust.demographics.conta_phone = normPhone;
      if (!cust.demographics.email && cleanEmail) cust.demographics.email = cleanEmail;
      if (!cust.demographics.company_name && tx.CompanyName) cust.demographics.company_name = tx.CompanyName.trim();
      if (!cust.demographics.mh_crm_city && tx.City) cust.demographics.mh_crm_city = tx.City.trim();
      if (!cust.demographics.tg1 && cleanTz) cust.demographics.tg1 = cleanTz;

      // Extract transaction amounts & details (Kesher returns amounts in Agorot, e.g. 5400 = 54 NIS)
      const txId = String(tx.NumTransaction || tx.Id || "").trim();
      const rawTotal = tx.Total !== undefined ? tx.Total : (tx.Sum !== undefined ? tx.Sum : 0);
      const parsedTotal = typeof rawTotal === "number" ? rawTotal : parseFloat(String(rawTotal).replace(/[^0-9.-]/g, "") || "0");
      const amount = parsedTotal / 100;
      const txDate = tx.TranDate || tx.Date || new Date().toISOString();
      const isSuccess = tx.CreditStatus === 0 || tx.CreditStatus === "0" || !tx.CreditStatus || String(tx.Status || "").includes("אושר") || String(tx.Status || "").includes("הושלם");

      const paymentItem = {
        amount,
        date: txDate,
        method: tx.CreditType || tx.TransactionType || (tx.NumCard ? `אשראי ${tx.NumCard}` : "קשר"),
        status: isSuccess ? "success" : "failed",
        kesherStatus: tx.Status || (isSuccess ? "success" : "failed"),
        transactionId: txId,
        receiptLink: tx.OriginalDoc || tx.CopyDoc || "",
        docNumber: tx.DocNumber || "",
        projectName: tx.ProjectName || tx.ProjectNum || "",
        team: tx.Team || "",
        cardDigits: tx.NumCard || "",
        company: tx.CompanyName || tx.CreditCardCompany || "",
        comment: tx.Comment || tx.Details || "",
      };

      const donationItem = {
        id: txId || `kesher_${Date.now()}_${Math.random()}`,
        campaignId: tx.ProjectNum || "kesher",
        campaignTitle: tx.ProjectName || "קשר",
        amount,
        paymentStatus: isSuccess ? "completed" : "failed",
        paymentMethod: tx.CreditType || (tx.NumCard ? `אשראי (${tx.NumCard})` : "קשר"),
        transactionId: txId,
        receiptUrl: tx.OriginalDoc || tx.CopyDoc || "",
        date: txDate,
        ambassadorName: tx.Team || "",
        dedication: tx.Comment || "",
      };

      const eventItem = {
        title: `עסקה / תרומה בקשר: ₪${amount} (${tx.ProjectName || "קשר"})`,
        type: "kesher_transaction",
        amount,
        date: txDate,
      };

      cust.payments.push(paymentItem);
      cust.donations.push(donationItem);
      cust.events.push(eventItem);
    }

    // Fetch existing contacts from Firestore
    const contactsRef = adminDb.collection("contacts");
    const snapshot = await contactsRef.where("ownerId", "==", userId).get();
    const existingContacts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    let addedCount = 0;
    let updatedCount = 0;
    let totalProcessedTx = 0;

    for (const [key, custData] of customersMap.entries()) {
      totalProcessedTx += custData.payments.length;

      // Find matching contact
      const existing: any = existingContacts.find((c: any) => {
        const cPhone = normalizePhone(c.conta_phone);
        const cEmail = (c.email || "").trim().toLowerCase();
        const cTz = (c.tg1 || c.tz || "").trim();

        if (custData.demographics.conta_phone && cPhone && cPhone === custData.demographics.conta_phone) return true;
        if (custData.demographics.email && cEmail && cEmail === custData.demographics.email) return true;
        if (custData.demographics.tg1 && cTz && cTz === custData.demographics.tg1) return true;
        return false;
      });

      if (existing) {
        // --- UPDATE EXISTING CONTACT ---
        const updates: any = {};

        // Fill missing demographics
        if (!existing.conta_name || existing.conta_name === "אנונימי" || existing.conta_name === "תורם קמפיין") {
          if (custData.demographics.conta_name) updates.conta_name = custData.demographics.conta_name;
        }
        if (!existing.f_m && custData.demographics.f_m) updates.f_m = custData.demographics.f_m;
        if (!existing.l_m && custData.demographics.l_m) updates.l_m = custData.demographics.l_m;
        if (!existing.email && custData.demographics.email) updates.email = custData.demographics.email;
        if (!existing.conta_phone && custData.demographics.conta_phone) updates.conta_phone = custData.demographics.conta_phone;
        if (!existing.company_name && custData.demographics.company_name) updates.company_name = custData.demographics.company_name;
        if (!existing.mh_crm_city && custData.demographics.mh_crm_city) updates.mh_crm_city = custData.demographics.mh_crm_city;
        if (!existing.mh_crm_street && custData.demographics.mh_crm_street) updates.mh_crm_street = custData.demographics.mh_crm_street;
        if (!existing.tg1 && custData.demographics.tg1) updates.tg1 = custData.demographics.tg1;

        // Merge payments without duplicates
        const currentPayments: any[] = Array.isArray(existing.payments) ? [...existing.payments] : [];
        const currentDonations: any[] = Array.isArray(existing.campaign_donations_history) ? [...existing.campaign_donations_history] : [];
        const currentEvents: any[] = Array.isArray(existing.events) ? [...existing.events] : [];

        let addedNewPayments = false;

        for (const p of custData.payments) {
          const isDuplicate = currentPayments.some(
            cp => (cp.transactionId && p.transactionId && cp.transactionId === p.transactionId) ||
                  (cp.date === p.date && Number(cp.amount) === Number(p.amount))
          );
          if (!isDuplicate) {
            currentPayments.unshift(p);
            addedNewPayments = true;
          }
        }

        for (const d of custData.donations) {
          const isDuplicate = currentDonations.some(
            cd => (cd.transactionId && d.transactionId && cd.transactionId === d.transactionId) ||
                  (cd.id && d.id && cd.id === d.id)
          );
          if (!isDuplicate) {
            currentDonations.unshift(d);
            addedNewPayments = true;
          }
        }

        for (const ev of custData.events) {
          const isDuplicate = currentEvents.some(
            cev => cev.date === ev.date && cev.title === ev.title
          );
          if (!isDuplicate) {
            currentEvents.unshift(ev);
            addedNewPayments = true;
          }
        }

        if (addedNewPayments) {
          updates.payments = currentPayments;
          updates.campaign_donations_history = currentDonations;
          updates.events = currentEvents;

          // Recalculate totals
          const successfulPayments = currentPayments.filter(p => p.status === "success" || p.status === "completed");
          updates.total_spent = successfulPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
          updates.order_count = successfulPayments.length;
          if (successfulPayments.length > 0) {
            updates.last_order_date = successfulPayments[0].date || new Date().toISOString();
          }
        }

        if (Object.keys(updates).length > 0) {
          updates.updatedAt = new Date().toISOString();
          await contactsRef.doc(existing.id).update(updates);
          updatedCount++;
        }
      } else {
        // --- CREATE NEW CONTACT ---
        const successfulPayments = custData.payments.filter(p => p.status === "success" || p.status === "completed");
        const totalSpent = successfulPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
        const lastOrderDate = custData.payments[0]?.date || new Date().toISOString();

        await contactsRef.add({
          ownerId: userId,
          status: "active",
          lead_source: "קשר (סנכרון עסקאות)",
          ...custData.demographics,
          payments: custData.payments,
          campaign_donations_history: custData.donations,
          events: custData.events,
          total_spent: totalSpent,
          total_donated: totalSpent,
          order_count: successfulPayments.length,
          last_order_date: lastOrderDate,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

        addedCount++;
      }
    }

    const { revalidatePath } = await import("next/cache");
    revalidatePath("/dashboard/crm");
    revalidatePath("/dashboard/crm/analytics");

    return { 
      success: true, 
      added: addedCount, 
      updated: updatedCount, 
      totalTransactions: totalProcessedTx,
      message: `סנכרון עסקאות מקשר הושלם בהצלחה! ${addedCount} אנשי קשר חדשים נוצרו, ${updatedCount} עודכנו ורועננו, וסונכרנו ${totalProcessedTx} עסקאות.`,
      rawResponse: result 
    };

  } catch (error: any) {
    console.error("Error syncing Kesher clients:", error);
    return { success: false, error: error.message || String(error) };
  }
}

export async function initiateKesherDigitalWalletAction(params: {
  amount: number;
  clientName?: string;
  phone?: string;
  email?: string;
  walletType: "bit" | "google_pay";
  campaignId?: string;
  userId?: string;
  details?: string;
  transactionId?: string;
  installments?: number;
}) {
  try {
    const { amount, clientName, phone, email, walletType, campaignId, userId: reqUserId, details, transactionId, installments } = params;

    const settings = await getEffectiveKesherSettings(reqUserId, campaignId);
    if (!settings || !settings.userName || !settings.apiKey) {
      return { success: false, error: "כרגע לא ניתן להשתמש בשירות התשלומים (פרטי חיבור לקשר חסרים). אנא פנה להנהלה." };
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

      console.log("================ KESHER SEND BIT API REQUEST (Server Action) ================");
      console.log(JSON.stringify(bitPayload, null, 2));

      const bitResponse = await fetch("https://kesherhk.info/ConnectToKesher/ConnectToKesher", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bitPayload)
      });

      const bitResText = await bitResponse.text();
      console.log("================ KESHER SEND BIT API RESPONSE ================");
      console.log(bitResText);

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
        return {
          success: true,
          bitUrl: bUrl,
          message: bitResult?.RequestResult?.Description || "נשלח אליך כעת מסרון לטלפון, נא אשר את התשלום",
          transactionId: bitResult?.NumTransaction || bitResult?.CompanyTranId || "",
          isDirectBit: true
        };
      }

      const errorDesc = bitResult?.RequestResult?.Description || bitResult?.error || bitResText || "שגיאה בחיבור ל-Bit";
      return {
        success: false,
        error: `שגיאה מקשר (Bit): ${errorDesc}`
      };
    }

    // 2. GetLinkToken for Google Pay / External payment page
    const paymentPageId = (settings.paymentPageId || process.env.KESHER_PAYMENT_PAGE_ID || "").trim();
    if (!paymentPageId || paymentPageId === "000") {
      return { 
        success: false, 
        error: "לתשלום באמצעות ארנק דיגיטלי יש להגדיר 'מספר דף תשלום' (Payment Page ID) בהגדרות קשר בלוח הבקרה." 
      };
    }

    const reqData: any = {
      PaymentPageId: paymentPageId,
      Currency: 1,
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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const resultText = await response.text();
    let result: any = {};
    try {
      result = JSON.parse(resultText);
    } catch (e) {
      return { success: false, error: "שגיאה בפיענוח תשובת קשר" };
    }

    const token = result.Token;
    const status = result.RequestResult?.Status;
    const code = result.RequestResult?.Code;

    if (!token || !status || code != 944) {
      return { success: false, error: "שגיאה בהפקת טוקן לתשלום. " + (result.RequestResult?.Description || "") };
    }

    const paramsObj = new URLSearchParams();
    paramsObj.append("token", token);
    if (amount) paramsObj.append("total", String(amount));
    paramsObj.append("currency", "1");
    if (clientName) {
      paramsObj.append("firstname", firstName);
      paramsObj.append("lastname", lastName);
    }
    if (phone) paramsObj.append("tel", phone);
    if (email) paramsObj.append("mail", email);
    if (transactionId) paramsObj.append("addactiondata", transactionId);

    return {
      success: true,
      token,
      iframeUrl: `https://ultra.kesherhk.info/external/paymentPage/${paymentPageId}?${paramsObj.toString()}`
    };

  } catch (error: any) {
    console.error("Error in initiateKesherDigitalWalletAction:", error);
    return { success: false, error: error.message || "שגיאת שרת פנימית" };
  }
}

