import { adminDb } from "@/lib/firebase-admin";

export interface InterceptorResult {
  handled: boolean;
  text?: string;
}

export async function processLocalIntent(userId: string, messageContent: string): Promise<InterceptorResult> {
  const content = messageContent.trim().toLowerCase();

  // ---------------------------------------------------------
  // 1. "10 הקונים האחרונים" / "הצג את 10 הקונים האחרונים"
  // ---------------------------------------------------------
  if (content.includes("10 הקונים") || content.includes("עשרת הקונים") || content.includes("10 האחרונים")) {
    const contactsSnap = await adminDb.collection("contacts")
      .where("ownerId", "==", userId)
      .where("status", "==", "active")
      .orderBy("createdAt", "desc")
      .limit(10)
      .get();
      
    if (contactsSnap.empty) {
      return { handled: true, text: "לא מצאתי אנשי קשר פעילים במערכת." };
    }
    
    let text = "הנה אנשי הקשר האחרונים שהצטרפו:\\n\\n";
    contactsSnap.docs.forEach(doc => {
      const d = doc.data();
      text += `- [${d.name || "ללא שם"}](#chat-action:view-contact:${doc.id}) (${d.phone || d.email || "אין פרטי התקשרות"})\\n`;
    });
    text += "\\n*לחיצה על שם איש הקשר תציג את הנתונים המלאים שלו ואת הפעולות שניתן לעשות איתו.*";
    return { handled: true, text };
  }

  // ---------------------------------------------------------
  // 2. "עם מי לא דיברתי בחודש האחרון?"
  // ---------------------------------------------------------
  if (content.includes("לא דיברתי") || content.includes("בחודש האחרון")) {
    const contactsSnap = await adminDb.collection("contacts")
      .where("ownerId", "==", userId)
      .where("status", "==", "active")
      .orderBy("updatedAt", "asc")
      .limit(10)
      .get();
      
    if (contactsSnap.empty) {
      return { handled: true, text: "לא מצאתי אנשי קשר במערכת." };
    }
    
    let text = "הנה עשרה אנשי קשר שהכי הרבה זמן לא עודכנו במערכת:\\n\\n";
    contactsSnap.docs.forEach(doc => {
      const d = doc.data();
      text += `- [${d.name || "ללא שם"}](#chat-action:view-contact:${doc.id})\\n`;
    });
    text += "\\n*לחץ על איש קשר כדי לפתוח את התיק שלו ולשלוח לו הודעה לחידוש הקשר!*";
    return { handled: true, text };
  }

  // ---------------------------------------------------------
  // 3. "הלידים שלא קיבלו התייחסות"
  // ---------------------------------------------------------
  if (content.includes("לידים") || content.includes("התייחסות")) {
    const contactsSnap = await adminDb.collection("contacts")
      .where("ownerId", "==", userId)
      .where("status", "==", "active")
      .get();
      
    const leads = contactsSnap.docs.filter(d => {
      const data = d.data();
      return (data.tag === "ליד" || !data.tag) && (!data.notes || data.notes.trim() === "");
    }).slice(0, 10);
    
    if (leads.length === 0) {
      return { handled: true, text: "איזה יופי! נראה שכל הלידים שלך קיבלו התייחסות וטיפול." };
    }
    
    let text = `מצאתי ${leads.length} לידים פוטנציאליים שעדיין לא נוספו להם הערות או התייחסות:\\n\\n`;
    leads.forEach(doc => {
      const d = doc.data();
      text += `- [${d.name || "ללא שם"}](#chat-action:view-contact:${doc.id})\\n`;
    });
    return { handled: true, text };
  }

  // ---------------------------------------------------------
  // 4. "מי הם אנשי הקשר ללא מייל"
  // ---------------------------------------------------------
  if (content.includes("ללא מייל") || content.includes("אין אימייל") || content.includes("חסר להם מייל")) {
    const contactsSnap = await adminDb.collection("contacts").where("ownerId", "==", userId).get();
    const noEmail = contactsSnap.docs.filter(d => !d.data().email).slice(0, 15);
    
    if (noEmail.length === 0) {
      return { handled: true, text: "מעולה! לכל אנשי הקשר שלך יש כתובת אימייל מעודכנת." };
    }
    
    let text = `מצאתי ${noEmail.length} אנשי קשר (או יותר) שחסר להם אימייל במערכת. הנה הרשימה:\\n\\n`;
    noEmail.forEach(doc => {
      const d = doc.data();
      text += `- [${d.name || "ללא שם"}](#chat-action:view-contact:${doc.id}) (${d.phone || "ללא טלפון"})\\n`;
    });
    text += "\\n*לחץ על כל אחד מהם כדי לפתוח אפשרויות (כמו שליחת וואטסאפ לעדכון הפרטים).*";
    
    return { handled: true, text };
  }

  // ---------------------------------------------------------
  // 5. Action: view-contact:<ID>
  // ---------------------------------------------------------
  if (content.startsWith("view-contact:")) {
    const contactId = content.replace("view-contact:", "").trim();
    const docRef = await adminDb.collection("contacts").doc(contactId).get();
    
    if (!docRef.exists || docRef.data()?.ownerId !== userId) {
      return { handled: true, text: "לא מצאתי את איש הקשר המבוקש." };
    }
    
    const d = docRef.data() as any;
    
    let text = `**תיק איש קשר: ${d.name || "ללא שם"}**\\n`;
    text += `* **טלפון:** ${d.phone || "חסר"}\\n`;
    text += `* **אימייל:** ${d.email || "חסר"}\\n`;
    if (d.city) text += `* **עיר:** ${d.city}\\n`;
    if (d.tag) text += `* **תגית:** ${d.tag}\\n`;
    if (d.leadSource) text += `* **מקור הגעה:** ${d.leadSource}\\n`;
    text += `* **הערות:** ${d.notes || "אין הערות"}\\n\\n`;
    
    text += `**מה תרצה לעשות עם ${d.name}?**\\n`;
    
    const whatsappClean = (d.phone || "").replace(/[^0-9]/g, '');
    if (whatsappClean) {
      text += `- [שלח הודעת WhatsApp עכשיו](https://wa.me/972${whatsappClean.startsWith('0') ? whatsappClean.substring(1) : whatsappClean})\\n`;
    }
    text += `- [העבר לסל המיחזור](#chat-action:trash-contact:${contactId})\\n`;
    
    return { handled: true, text };
  }

  // ---------------------------------------------------------
  // 6. Action: trash-contact:<ID>
  // ---------------------------------------------------------
  if (content.startsWith("trash-contact:")) {
    const contactId = content.replace("trash-contact:", "").trim();
    const docRef = await adminDb.collection("contacts").doc(contactId).get();
    if (docRef.exists && docRef.data()?.ownerId === userId) {
      await adminDb.collection("contacts").doc(contactId).update({ status: "trashed" });
      return { handled: true, text: `איש הקשר **${docRef.data()?.name || "ללא שם"}** הועבר לסל המיחזור בהצלחה.` };
    }
    return { handled: true, text: "שגיאה: איש הקשר לא נמצא." };
  }

  // ---------------------------------------------------------
  // General Contacts Query Fallback
  // ---------------------------------------------------------
  if (content.includes("אנשי קשר") || content.includes("לקוחות")) {
    if (content.includes("הצג") || content.includes("רשימ") || content.includes("כל ה")) {
      const contactsSnap = await adminDb.collection("contacts").where("ownerId", "==", userId).limit(5).get();
      if (contactsSnap.empty) {
        return { handled: true, text: "כרגע אין לך אנשי קשר במערכת." };
      }
      
      let text = "הנה 5 אנשי הקשר האחרונים שלך:\\n\\n";
      contactsSnap.docs.forEach(doc => {
        const d = doc.data();
        text += `- [${d.name || "ללא שם"}](#chat-action:view-contact:${doc.id})\\n`;
      });
      return { handled: true, text };
    }
  }

  // Automations fallback
  if (content.includes("אוטומציות") || content.includes("אוטומציה")) {
    if (content.includes("הצג") || content.includes("איזה") || content.includes("אילו")) {
      const automationsSnap = await adminDb.collection("automations").where("ownerId", "==", userId).where("isActive", "==", true).get();
      if (automationsSnap.empty) {
        return { handled: true, text: "אין לך כרגע אוטומציות פעילות. לחץ כאן כדי [ליצור אוטומציה חדשה](#modal:create-automation)." };
      }
      return { handled: true, text: `יש לך ${automationsSnap.size} אוטומציות פעילות שרצות ברקע.` };
    }
  }

  // Services fallback
  if (content.includes("עמודי נחיתה") || content.includes("עמוד נחיתה") || content.includes("שירותים")) {
    if (content.includes("הצג") || content.includes("כמה")) {
      const servicesSnap = await adminDb.collection("services").where("ownerId", "==", userId).get();
      if (servicesSnap.empty) {
        return { handled: true, text: "אין לך עמודי שירות או נחיתה פעילים. בוא ניצור אחד: [צור עמוד חדש](#modal:create-service)." };
      }
      return { handled: true, text: `יש לך ${servicesSnap.size} עמודי שירות ונחיתה פעילים.` };
    }
  }

  return { handled: false };
}
