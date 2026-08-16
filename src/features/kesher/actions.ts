"use server";

import { adminDb } from "@/lib/firebase-admin";

export async function getKesherSettings() {
  try {
    const { auth } = await import("@/lib/auth");
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) throw new Error("Unauthorized");

    // First check user doc overrides
    const userDoc = await adminDb.collection("users").doc(userId).get();
    const userData = userDoc.data();
    
    if (userData?.useAdminKesher) {
      const globalDoc = await adminDb.collection("configs").doc("global").get();
      const globalConfig = globalDoc.data() || {};
      return { 
        userName: globalConfig.kesherUserName || "", 
        apiKey: globalConfig.kesherApiKey || "",
        isActive: !!(globalConfig.kesherUserName && globalConfig.kesherApiKey)
      };
    }
    
    if (userData?.kesherSettings?.userName || userData?.kesherSettings?.apiKey) {
      return { 
        ...userData.kesherSettings,
        isActive: !!(userData.kesherSettings.userName && userData.kesherSettings.apiKey)
      };
    }

    const { getUserDb } = await import("@/lib/firebase-admin");
    const docRef = getUserDb(userId).collection("settings").doc("kesher");
    const docSnap = await docRef.get();
    
    if (docSnap.exists) {
      return docSnap.data();
    }
  } catch (err) {
    console.error("Error getting Kesher settings:", err);
  }
  return null;
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

export async function syncKesherClients(timeframe: "all" | "year" | "3months" | "week" = "all") {
  try {
    const { auth } = await import("@/lib/auth");
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");
    const userId = session.user.id;

    const settings = await getKesherSettings();
    if (!settings?.userName || !settings?.apiKey) {
      return { success: false, error: "לא הוגדרו פרטי קשר (שם משתמש וסיסמה)." };
    }

    const payload = {
      Json: {
        userName: settings.userName,
        password: settings.apiKey, // Kesher password is saved in apiKey
        func: "GetTrans",
        format: "json",
        fromTranId: 0
      },
      format: "json"
    };

    console.log("\n==================================");
    console.log("[Kesher Sync] Payload to Send:", JSON.stringify(payload, null, 2));

    const response = await fetch("https://kesherhk.info/ConnectToKesher/ConnectToKesher", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    console.log("[Kesher Sync] Raw Response (first 1000 chars):", responseText.substring(0, 1000));
    console.log("==================================\n");
    let result;
    try {
      result = JSON.parse(responseText);
    } catch {
      return { success: false, error: "תשובה לא תקינה מקשר.", payloadSent: payload, rawResponse: responseText };
    }

    if (result && result.Status === false) {
      return { success: false, error: `שגיאה מקשר: ${result.Description || "לא ידוע"}`, payloadSent: payload, rawResponse: result };
    }

    let transactions: any[] = [];
    if (result?.Transaction) {
      if (Array.isArray(result.Transaction)) {
        transactions = result.Transaction;
      } else {
        transactions = [result.Transaction];
      }
    }

    if (transactions.length === 0) {
      return { 
        success: true, 
        added: 0, 
        updated: 0, 
        message: "לא נמצאו עסקאות בקשר.",
        payloadSent: payload,
        rawResponse: result
      };
    }

    const now = new Date();
    let cutoffDate = new Date(0); // all
    if (timeframe === "year") {
      cutoffDate = new Date(now.setFullYear(now.getFullYear() - 1));
    } else if (timeframe === "3months") {
      cutoffDate = new Date(now.setMonth(now.getMonth() - 3));
    } else if (timeframe === "week") {
      cutoffDate = new Date(now.setDate(now.getDate() - 7));
    }

    // Process unique clients from transactions
    const clientsMap = new Map<string, any>();
    
    for (const tx of transactions) {
      // Filter by timeframe if Date exists
      if (tx.Date) {
        const txDate = new Date(tx.Date);
        if (txDate < cutoffDate) continue;
      }

      const tz = tx.Tz?.trim() || "";
      const phone = tx.Phone?.trim() || "";
      const mail = tx.Mail?.trim() || "";
      const name = tx.Name?.trim() || `${tx.FirstName || ""} ${tx.LastName || ""}`.trim();

      if (!tz && !phone && !mail) continue; // Skip if no identifying info

      // Prefer Tz, then Phone, then Mail as the unique key for grouping
      const uniqueKey = tz || phone || mail;

      if (!clientsMap.has(uniqueKey)) {
        clientsMap.set(uniqueKey, {
          conta_name: name,
          f_m: tx.FirstName?.trim() || "",
          l_m: tx.LastName?.trim() || "",
          conta_phone: phone,
          email: mail,
          tg1: tz, // Assuming tg1 holds Tz
          mh_crm_city: tx.City?.trim() || "",
          mh_crm_street: tx.Address?.trim() || "",
          total_spent: 0,
        });
      }
      
      // Aggregate total spent
      const client = clientsMap.get(uniqueKey);
      client.total_spent += (tx.Total || 0) / 100; // Total is in agorot
    }

    // Fetch existing contacts for this user
    const contactsRef = adminDb.collection("contacts");
    const snapshot = await contactsRef.where("ownerId", "==", userId).get();
    
    const existingContacts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    let addedCount = 0;
    let updatedCount = 0;

    const batchArray: any[] = [];
    let currentBatch = adminDb.batch();
    let batchOperationCount = 0;

    const commitBatch = async () => {
      if (batchOperationCount > 0) {
        batchArray.push(currentBatch.commit());
        currentBatch = adminDb.batch();
        batchOperationCount = 0;
      }
    };

    for (const [key, clientData] of clientsMap.entries()) {
      // Find match
      const existing: any = existingContacts.find((c: any) => {
        if (clientData.tg1 && c.tg1 === clientData.tg1) return true;
        if (clientData.conta_phone && c.conta_phone === clientData.conta_phone) return true;
        if (clientData.email && c.email === clientData.email) return true;
        return false;
      });

      if (existing) {
        // Update existing if some fields are missing
        const updates: any = {};
        if (!existing.mh_crm_city && clientData.mh_crm_city) updates.mh_crm_city = clientData.mh_crm_city;
        if (!existing.mh_crm_street && clientData.mh_crm_street) updates.mh_crm_street = clientData.mh_crm_street;
        if (!existing.email && clientData.email) updates.email = clientData.email;
        if (!existing.tg1 && clientData.tg1) updates.tg1 = clientData.tg1;
        if (!existing.f_m && clientData.f_m) updates.f_m = clientData.f_m;
        
        if (Object.keys(updates).length > 0) {
          updates.updatedAt = new Date().toISOString();
          currentBatch.update(contactsRef.doc(existing.id), updates);
          batchOperationCount++;
          updatedCount++;
        }
      } else {
        // Create new
        const newRef = contactsRef.doc();
        currentBatch.set(newRef, {
          ownerId: userId,
          status: "active",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lead_source: "Kesher Import",
          ...clientData
        });
        batchOperationCount++;
        addedCount++;
      }

      if (batchOperationCount >= 400) {
        await commitBatch();
      }
    }

    await commitBatch();
    await Promise.all(batchArray);

    return { 
      success: true, 
      added: addedCount, 
      updated: updatedCount, 
      message: `הסנכרון הושלם. ${addedCount} לקוחות נוספו, ${updatedCount} עודכנו.`,
      payloadSent: payload,
      rawResponse: result 
    };

  } catch (error: any) {
    console.error("Error syncing Kesher clients:", error);
    return { success: false, error: error.message };
  }
}
