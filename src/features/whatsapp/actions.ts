"use server";

import { adminDb } from "@/lib/firebase-admin";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { WhatsAppSettings, WhatsAppConnectionState, WhatsAppCampaign, WhatsAppRecipient } from "./types";
import { ContactEvent } from "../crm/types";

async function getUserId(): Promise<string> {
  const session = await auth();
  if (session?.user?.id) {
    return session.user.id;
  }
  throw new Error("Unauthorized");
}

// 1. Get WhatsApp Configuration Settings with Multi-tier Cascade Fallback and Detailed Logging
export async function getWhatsAppSettings(specificUserId?: string): Promise<WhatsAppSettings> {
  console.log("===> [WhatsApp Server] getWhatsAppSettings called for specificUserId:", specificUserId || "current session");
  try {
    let userId = specificUserId;
    if (!userId) {
      try {
        userId = await getUserId();
        console.log("===> [WhatsApp Server] Current session userId:", userId);
      } catch (e) {
        console.log("===> [WhatsApp Server] No active session found in getUserId:", (e as Error).message);
      }
    }

    // Helper to extract keys from any object
    const extractKeys = (obj: any, sourceName: string): WhatsAppSettings | null => {
      if (!obj || typeof obj !== "object") return null;
      const idInstance = obj.instanceId || obj.idInstance || obj.greenApiInstanceId || obj.greenApiSettings?.instanceId || obj.greenApiSettings?.idInstance;
      const apiToken = obj.apiTokenInstance || obj.apiToken || obj.greenApiToken || obj.greenApiSettings?.apiTokenInstance || obj.greenApiSettings?.apiToken;
      if (idInstance && apiToken) {
        console.log(`===> [WhatsApp Server] Found Green API keys in [${sourceName}]:`, {
          idInstance: String(idInstance).trim(),
          apiTokenLength: String(apiToken).trim().length,
        });
        return {
          idInstance: String(idInstance).trim(),
          apiToken: String(apiToken).trim(),
        };
      }
      return null;
    };

    if (userId) {
      // 1. Check user document
      const userDoc = await adminDb.collection("users").doc(userId).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        console.log("===> [WhatsApp Server] Found userData for current user:", {
          hasGreenApiSettings: !!userData?.greenApiSettings,
          useAdminGreenApi: userData?.useAdminGreenApi,
          role: userData?.role,
        });

        if (!userData?.useAdminGreenApi) {
          const keys = extractKeys(userData, `users/${userId}`);
          if (keys) return keys;
        }
      }

      // 2. Check whatsapp_settings/{userId}
      const docRef = adminDb.collection("whatsapp_settings").doc(userId);
      const docSnap = await docRef.get();
      if (docSnap.exists) {
        const keys = extractKeys(docSnap.data(), `whatsapp_settings/${userId}`);
        if (keys) return keys;
      }
    }

    // 3. Fallback to global config (configs/global)
    const globalDoc = await adminDb.collection("configs").doc("global").get();
    if (globalDoc.exists) {
      const keys = extractKeys(globalDoc.data(), "configs/global");
      if (keys) return keys;
    }

    // 4. Fallback: Search in configs/whatsapp or settings/whatsapp
    for (const [col, docId] of [["configs", "whatsapp"], ["settings", "whatsapp"], ["settings", "greenapi"]]) {
      try {
        const d = await adminDb.collection(col).doc(docId).get();
        if (d.exists) {
          const keys = extractKeys(d.data(), `${col}/${docId}`);
          if (keys) return keys;
        }
      } catch (e) {}
    }

    // 5. Fallback: Search all users with admin roles or any user having greenApi keys
    const adminRoles = ["SUPERADMIN", "ADMIN", "superadmin", "admin"];
    const adminUsersSnapshot = await adminDb.collection("users")
      .where("role", "in", adminRoles)
      .get();

    console.log(`===> [WhatsApp Server] Found ${adminUsersSnapshot.docs.length} admin user docs in search`);

    for (const adminDoc of adminUsersSnapshot.docs) {
      const aData = adminDoc.data();
      const keys = extractKeys(aData, `admin user doc [${adminDoc.id} (${aData.email || aData.username})]`);
      if (keys) return keys;

      // Check admin's whatsapp_settings doc
      const adminWaDoc = await adminDb.collection("whatsapp_settings").doc(adminDoc.id).get();
      if (adminWaDoc.exists) {
        const waKeys = extractKeys(adminWaDoc.data(), `whatsapp_settings/${adminDoc.id}`);
        if (waKeys) return waKeys;
      }
    }

    // 6. Final fallback: Scan all users to see if any user document has greenApiSettings
    const allUsersSnap = await adminDb.collection("users").limit(50).get();
    for (const uDoc of allUsersSnap.docs) {
      const uData = uDoc.data();
      const keys = extractKeys(uData, `scan user [${uDoc.id}]`);
      if (keys) return keys;
    }

    console.warn("===> [WhatsApp Server] WARNING: No Green API keys found in any Firestore collection or user document!");
    return { idInstance: "", apiToken: "" };
  } catch (error) {
    console.error("===> [WhatsApp Server] Error in getWhatsAppSettings:", error);
    return { idInstance: "", apiToken: "" };
  }
}

// 2. Save WhatsApp Configuration Settings
export async function saveWhatsAppSettings(settings: WhatsAppSettings) {
  try {
    const userId = await getUserId();
    const docRef = adminDb.collection("whatsapp_settings").doc(userId);
    await docRef.set(settings);
    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard/whatsapp");
    return { success: true };
  } catch (error) {
    console.error("Error saving WhatsApp settings:", error);
    return { success: false, error: (error as Error).message };
  }
}

// Helper to construct Green API Endpoint URLs
function getGreenApiUrl(settings: WhatsAppSettings, action: string): string {
  return `https://api.green-api.com/waInstance${settings.idInstance}/${action}/${settings.apiToken}`;
}

// 3. Get WhatsApp Connection Status
export async function getWhatsAppConnection(): Promise<WhatsAppConnectionState> {
  console.log("===> [WhatsApp Server] getWhatsAppConnection triggered");
  try {
    const settings = await getWhatsAppSettings();
    if (!settings.idInstance || !settings.apiToken) {
      console.log("===> [WhatsApp Server] Returning notConfigured: missing idInstance or apiToken");
      return { 
        status: "notConfigured", 
        error: "טרם הוגדרו מזהה מופע (Instance ID) וטוקן (API Token) של Green API במערכת." 
      };
    }

    const stateUrl = getGreenApiUrl(settings, "getStateInstance");
    console.log("===> [WhatsApp Server] Fetching getStateInstance from Green API:", `https://api.green-api.com/waInstance${settings.idInstance}/getStateInstance/***`);
    const stateRes = await fetch(stateUrl, { next: { revalidate: 0 } });
    const stateStatus = stateRes.status;
    const stateBody = await stateRes.text();
    console.log(`===> [WhatsApp Server] Green API getStateInstance response [${stateStatus}]:`, stateBody);

    if (!stateRes.ok) {
      throw new Error(`שגיאת תקשורת עם Green API (קוד ${stateStatus}): ${stateBody || "ודא שפרטי החיבור תקינים"}`);
    }

    let stateData: any = {};
    try {
      stateData = JSON.parse(stateBody);
    } catch (e) {
      throw new Error(`תשובה לא תקינה מ-Green API: ${stateBody}`);
    }

    const status = stateData.stateInstance;
    console.log("===> [WhatsApp Server] Green API stateInstance status:", status);

    if (status === "authorized") {
      // Get settings to retrieve phone number, avatar, name
      try {
        const settingsUrl = getGreenApiUrl(settings, "getSettings");
        const settingsRes = await fetch(settingsUrl, { next: { revalidate: 0 } });
        if (settingsRes.ok) {
          const settingsData = await settingsRes.json();
          return {
            status: "authorized",
            phoneNumber: settingsData.wid ? settingsData.wid.replace("@c.us", "") : "",
            avatar: settingsData.avatar || "",
            name: settingsData.contactName || "משתמש וואטסאפ",
          };
        }
      } catch (err) {
        console.warn("Failed to get WhatsApp user profile settings:", err);
      }

      return {
        status: "authorized",
        phoneNumber: "",
        avatar: "",
        name: "וואטסאפ מחובר",
      };
    } else if (status === "notAuthorized") {
      return { status: "notAuthorized" };
    } else if (status === "blocked") {
      return { status: "error", error: "מופע הוואטסאפ חסום ב-Green API (Blocked)." };
    } else if (status === "sleepMode") {
      return { status: "error", error: "מופע הוואטסאפ במצב שינה (Sleep Mode)." };
    } else if (status === "starting") {
      return { status: "checking", error: "מופע הוואטסאפ בתהליך אתחול..." };
    } else {
      return { status: "notAuthorized" };
    }
  } catch (error) {
    console.error("===> [WhatsApp Server] Error checking WhatsApp connection:", error);
    return { status: "error", error: (error as Error).message };
  }
}

// 4. Fetch Connection QR Code (Base64)
export async function getWhatsAppQR(): Promise<WhatsAppConnectionState> {
  console.log("===> [WhatsApp Server] getWhatsAppQR called");
  try {
    const settings = await getWhatsAppSettings();
    if (!settings.idInstance || !settings.apiToken) {
      console.log("===> [WhatsApp Server] getWhatsAppQR: missing settings, returning notConfigured");
      return { 
        status: "notConfigured", 
        error: "טרם הוגדרו מזהה מופע (Instance ID) וטוקן (API Token) של Green API." 
      };
    }

    const qrUrl = getGreenApiUrl(settings, "qr");
    console.log("===> [WhatsApp Server] Fetching qr from Green API:", `https://api.green-api.com/waInstance${settings.idInstance}/qr/***`);
    const res = await fetch(qrUrl, { next: { revalidate: 0 } });
    const qrStatus = res.status;
    const qrBody = await res.text();
    console.log(`===> [WhatsApp Server] Green API qr response [${qrStatus}]:`, qrBody.length > 200 ? `${qrBody.substring(0, 100)}... (${qrBody.length} chars)` : qrBody);

    if (!res.ok) {
      throw new Error(`שגיאה בקבלת QR משרת Green API (קוד ${qrStatus}): ${qrBody || "ודא שמזהה המופע והטוקן תקינים"}`);
    }

    let data: any = {};
    try {
      data = JSON.parse(qrBody);
    } catch (e) {
      throw new Error(`תשובה לא תקינה מ-Green API: ${qrBody}`);
    }
    
    if (data.type === "qrCode") {
      console.log("===> [WhatsApp Server] Successfully retrieved QR code Base64!");
      return {
        status: "qr",
        qrCode: `data:image/png;base64,${data.message}`,
      };
    } else if (data.type === "alreadyLogged") {
      console.log("===> [WhatsApp Server] Instance is already logged in, redirecting to connection check");
      return getWhatsAppConnection();
    } else {
      console.log("===> [WhatsApp Server] Other QR response type:", data.type);
      return getWhatsAppConnection();
    }
  } catch (error) {
    console.error("===> [WhatsApp Server] Error getting WhatsApp QR:", error);
    return { status: "error", error: (error as Error).message };
  }
}

// 5. Logout WhatsApp Paired Device
export async function logoutWhatsApp() {
  try {
    const settings = await getWhatsAppSettings();
    if (!settings.idInstance || !settings.apiToken) {
      return { success: false, error: "לא מוגדר חיבור." };
    }

    const logoutUrl = getGreenApiUrl(settings, "logout");
    const res = await fetch(logoutUrl, { method: "GET" });
    const data = await res.json();
    
    if (data.isLogout) {
      revalidatePath("/dashboard/whatsapp");
      return { success: true };
    }
    throw new Error("התנתקות נכשלה בשרת");
  } catch (error) {
    console.error("Error logging out WhatsApp:", error);
    return { success: false, error: (error as Error).message };
  }
}

// 6. Send Single WhatsApp Message
export async function sendWhatsAppMessage(phone: string, message: string) {
  try {
    const settings = await getWhatsAppSettings();
    if (!settings.idInstance || !settings.apiToken) {
      throw new Error("חיבור וואטסאפ לא מוגדר");
    }

    // Clean phone number
    let cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.startsWith("0")) {
      cleanPhone = "972" + cleanPhone.slice(1);
    }
    const chatId = `${cleanPhone}@c.us`;

    const url = getGreenApiUrl(settings, "sendMessage");
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chatId, message: message.replace(/\n/g, "\r\n") }),
    });

    if (!response.ok) {
      throw new Error(`שגיאת שליחה: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error in sendWhatsAppMessage server action:", error);
    throw error;
  }
}

// 7. Send Single WhatsApp File
export async function sendWhatsAppFile(formData: FormData) {
  try {
    const settings = await getWhatsAppSettings();
    if (!settings.idInstance || !settings.apiToken) {
      throw new Error("חיבור וואטסאפ לא מוגדר");
    }

    const phone = formData.get("phone") as string;
    const file = formData.get("file") as File;
    const caption = formData.get("caption") as string;

    if (!phone || !file) {
      throw new Error("מספר טלפון וקובץ הם שדות חובה");
    }

    // Clean phone number
    let cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.startsWith("0")) {
      cleanPhone = "972" + cleanPhone.slice(1);
    }
    const chatId = `${cleanPhone}@c.us`;

    const greenFormData = new FormData();
    greenFormData.append("chatId", chatId);
    greenFormData.append("file", file);
    if (caption) {
      greenFormData.append("caption", caption.replace(/\n/g, "\r\n"));
    }

    const url = getGreenApiUrl(settings, "sendFileByUpload");
    const response = await fetch(url, {
      method: "POST",
      body: greenFormData,
    });

    if (!response.ok) {
      throw new Error(`שגיאת שליחת קובץ: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error in sendWhatsAppFile server action:", error);
    throw error;
  }
}

// 8. Save Campaign Message History in Firestore
export async function saveWhatsAppCampaign(params: {
  messageContent: string;
  totalRecipients: number;
  successCount: number;
  failureCount: number;
  recipients: WhatsAppRecipient[];
}) {
  try {
    const userId = await getUserId();
    const campaignData = {
      userId,
      messageContent: params.messageContent,
      totalRecipients: params.totalRecipients,
      successCount: params.successCount,
      failureCount: params.failureCount,
      createdAt: new Date().toISOString(),
    };

    const docRef = await adminDb.collection("whatsapp_campaigns").add(campaignData);
    const campaignId = docRef.id;

    // Batch upload recipients to subcollection
    const batch = adminDb.batch();
    params.recipients.forEach((recipient) => {
      const recipientRef = docRef.collection("recipients").doc();
      batch.set(recipientRef, recipient);
    });

    await batch.commit();
    revalidatePath("/dashboard/whatsapp");
    return { success: true, campaignId };
  } catch (error) {
    console.error("Error in saveWhatsAppCampaign server action:", error);
    throw error;
  }
}

// 9. Get Paginated WhatsApp Campaigns History
export async function getWhatsAppCampaigns(page = 1, perPage = 20) {
  try {
    const userId = await getUserId();
    const campaignsRef = adminDb.collection("whatsapp_campaigns");
    
    // Fetch count
    const countSnapshot = await campaignsRef.where("userId", "==", userId).get();
    const totalItems = countSnapshot.size;
    const totalPages = Math.ceil(totalItems / perPage);

    // Fetch details
    const snapshot = await campaignsRef
      .where("userId", "==", userId)
      .orderBy("createdAt", "desc")
      .limit(perPage)
      .offset((page - 1) * perPage)
      .get();

    const campaigns: WhatsAppCampaign[] = snapshot.docs.map((doc: any) => {
      const data = doc.data();
      return {
        id: doc.id,
        userId: data.userId,
        messageContent: data.messageContent,
        totalRecipients: data.totalRecipients,
        successCount: data.successCount,
        failureCount: data.failureCount,
        createdAt: data.createdAt,
      };
    });

    return {
      campaigns,
      currentPage: page,
      totalPages,
    };
  } catch (error) {
    console.error("Error in getWhatsAppCampaigns:", error);
    return { campaigns: [], currentPage: 1, totalPages: 0 };
  }
}

// 10. Get Campaign Recipients details
export async function getCampaignRecipients(campaignId: string): Promise<WhatsAppRecipient[]> {
  try {
    const docRef = adminDb.collection("whatsapp_campaigns").doc(campaignId);
    const snapshot = await docRef.collection("recipients").get();

    return snapshot.docs.map((doc: any) => {
      const data = doc.data();
      return {
        name: data.name || "",
        phone: data.phone || "",
        status: data.status || "",
        messageId: data.messageId || "",
        apiResponse: data.apiResponse || "",
        personalizedContent: data.personalizedContent || "",
      };
    });
  } catch (error) {
    console.error("Error in getCampaignRecipients:", error);
    return [];
  }
}

// 11. Bulk Delete Campaigns from history
export async function bulkDeleteCampaigns(ids: string[]) {
  try {
    const userId = await getUserId();
    const campaignsRef = adminDb.collection("whatsapp_campaigns");

    for (const id of ids) {
      const docRef = campaignsRef.doc(id);
      const docSnap = await docRef.get();
      if (docSnap.exists && docSnap.data()?.userId === userId) {
        // Delete subcollection recipients first
        const recipientsSnap = await docRef.collection("recipients").get();
        const batch = adminDb.batch();
        recipientsSnap.docs.forEach((doc: any) => {
          batch.delete(doc.ref);
        });
        await batch.commit();

        // Delete parent campaign doc
        await docRef.delete();
      }
    }

    revalidatePath("/dashboard/whatsapp");
    return { success: true };
  } catch (error) {
    console.error("Error in bulkDeleteCampaigns:", error);
    throw error;
  }
}

// 12. Query Single Message Status from Green API
export async function getWhatsAppMessageStatus(chatId: string, messageId: string) {
  try {
    const settings = await getWhatsAppSettings();
    if (!settings.idInstance || !settings.apiToken) {
      throw new Error("חיבור וואטסאפ לא מוגדר");
    }

    const url = getGreenApiUrl(settings, "getMessage");
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chatId, idMessage: messageId }),
    });

    if (!response.ok) {
      throw new Error(`שגיאה בסטטוס: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error in getWhatsAppMessageStatus server action:", error);
    throw error;
  }
}

// 13. Retract Single WhatsApp Message
export async function retractWhatsAppMessage(chatId: string, messageId: string) {
  try {
    const settings = await getWhatsAppSettings();
    if (!settings.idInstance || !settings.apiToken) {
      throw new Error("חיבור וואטסאפ לא מוגדר");
    }

    const url = getGreenApiUrl(settings, "deleteMessage");
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chatId, idMessage: messageId }),
    });

    if (!response.ok) {
      // Check if it failed with invalid response but actually succeeded upstream (same as PHP proxy)
      throw new Error(`שגיאה במחיקה: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error in retractWhatsAppMessage server action:", error);
    throw error;
  }
}

// 14. Sync Chat History with Contact and update timeline events
export async function syncContactMessages(contactId: string, phone: string) {
  try {
    const userId = await getUserId();
    const settings = await getWhatsAppSettings();
    if (!settings.idInstance || !settings.apiToken) {
      throw new Error("חיבור וואטסאפ לא מוגדר");
    }

    let cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.startsWith("0")) {
      cleanPhone = "972" + cleanPhone.slice(1);
    }
    const chatId = `${cleanPhone}@c.us`;

    const url = getGreenApiUrl(settings, "getChatHistory");
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chatId, count: 100 }),
    });

    if (!response.ok) {
      throw new Error(`שגיאה במשיכת היסטוריה: ${response.status}`);
    }

    const history: any[] = await response.json();
    if (!Array.isArray(history)) {
      return { success: false, syncedCount: 0 };
    }

    // Pull current contact details
    const contactRef = adminDb.collection("contacts").doc(contactId);
    const contactSnap = await contactRef.get();
    if (!contactSnap.exists) {
      throw new Error("איש הקשר לא נמצא");
    }

    const contactData = contactSnap.data();
    if (contactData?.ownerId !== userId) {
      throw new Error("אין הרשאה לערוך איש קשר זה");
    }

    const currentEvents: ContactEvent[] = contactData?.events || [];

    // Filter incoming and outgoing texts and format as timeline events
    let syncedCount = 0;
    history.forEach((msg) => {
      const isIncoming = msg.type === "incoming";
      const text = msg.textMessage || "";
      const timestamp = msg.timestamp || Math.floor(Date.now() / 1000);
      const timeISO = new Date(timestamp * 1000).toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm

      if (!text) return; // Skip media messages without caption/text

      // Check if this WhatsApp message already exists in events to prevent duplicates
      const exists = currentEvents.some((e) => e.text.includes(text) && e.time.slice(0, 13) === timeISO.slice(0, 13));
      if (!exists) {
        currentEvents.push({
          time: timeISO,
          title: isIncoming ? "הודעה נכנסת מוואטסאפ" : "הודעה יוצאת מוואטסאפ",
          text: text,
        });
        syncedCount++;
      }
    });

    if (syncedCount > 0) {
      // Sort events by date descending
      currentEvents.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
      await contactRef.update({
        events: currentEvents,
        updatedAt: new Date().toISOString(),
      });
      revalidatePath("/dashboard/crm");
    }

    return { success: true, syncedCount };
  } catch (error) {
    console.error("Error in syncContactMessages:", error);
    throw error;
  }
}
