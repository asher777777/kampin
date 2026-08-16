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

// 1. Get WhatsApp Configuration Settings
export async function getWhatsAppSettings(): Promise<WhatsAppSettings> {
  try {
    const userId = await getUserId();
    
    // Check user overrides
    const userDoc = await adminDb.collection("users").doc(userId).get();
    const userData = userDoc.data();
    
    if (userData?.useAdminGreenApi) {
      const globalDoc = await adminDb.collection("configs").doc("global").get();
      const globalConfig = globalDoc.data() || {};
      return {
        idInstance: globalConfig.greenApiInstanceId || "",
        apiToken: globalConfig.greenApiToken || "",
      };
    }
    
    if (userData?.greenApiSettings?.instanceId || userData?.greenApiSettings?.apiTokenInstance) {
      return {
        idInstance: userData.greenApiSettings.instanceId || "",
        apiToken: userData.greenApiSettings.apiTokenInstance || "",
      };
    }

    const docRef = adminDb.collection("whatsapp_settings").doc(userId);
    const docSnap = await docRef.get();
    
    if (docSnap.exists) {
      const data = docSnap.data();
      return {
        idInstance: data?.idInstance || "",
        apiToken: data?.apiToken || "",
      };
    }
    return { idInstance: "", apiToken: "" };
  } catch (error) {
    console.warn("Error fetching WhatsApp settings:", (error as Error).message);
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
  try {
    const settings = await getWhatsAppSettings();
    if (!settings.idInstance || !settings.apiToken) {
      return { status: "notAuthorized", error: "חסרים פרטי חיבור וואטסאפ (ID Instance, API Token) בהגדרות." };
    }

    const stateUrl = getGreenApiUrl(settings, "getStateInstance");
    const stateRes = await fetch(stateUrl, { next: { revalidate: 0 } });
    if (!stateRes.ok) {
      throw new Error(`שגיאה בשרת: ${stateRes.status}`);
    }
    const stateData = await stateRes.json();
    const status = stateData.stateInstance;

    if (status === "authorized") {
      // Get settings to retrieve phone number, avatar, name
      const settingsUrl = getGreenApiUrl(settings, "getSettings");
      const settingsRes = await fetch(settingsUrl, { next: { revalidate: 0 } });
      const settingsData = await settingsRes.json();
      
      return {
        status: "authorized",
        phoneNumber: settingsData.wid ? settingsData.wid.replace("@c.us", "") : "",
        avatar: settingsData.avatar || "",
        name: settingsData.contactName || "משתמש וואטסאפ",
      };
    } else if (status === "notAuthorized") {
      return { status: "notAuthorized" };
    } else {
      return { status: "error", error: `מצב לא ידוע: ${status}` };
    }
  } catch (error) {
    console.error("Error checking WhatsApp connection:", error);
    return { status: "error", error: (error as Error).message };
  }
}

// 4. Fetch Connection QR Code (Base64)
export async function getWhatsAppQR(): Promise<WhatsAppConnectionState> {
  try {
    const settings = await getWhatsAppSettings();
    if (!settings.idInstance || !settings.apiToken) {
      return { status: "notAuthorized", error: "חסרים פרטי חיבור וואטסאפ." };
    }

    const qrUrl = getGreenApiUrl(settings, "qr");
    const res = await fetch(qrUrl, { next: { revalidate: 0 } });
    if (!res.ok) {
      throw new Error(`שגיאה בקבלת QR: ${res.status}`);
    }
    const data = await res.json();
    
    if (data.type === "qrCode") {
      return {
        status: "qr",
        qrCode: `data:image/png;base64,${data.message}`,
      };
    } else {
      // Might be already authorized or checking
      return getWhatsAppConnection();
    }
  } catch (error) {
    console.error("Error getting WhatsApp QR:", error);
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
