import { adminDb } from "@/lib/firebase-admin";

export type Trigger = 
  | { type: "webhook"; webhookId: string }
  | { type: "form_submission"; formId: string }
  | { type: "specific_time"; cronExpression: string }
  | { type: "specific_date"; dateIso: string };

export type ActionStep =
  | { type: "whatsapp_send"; config: { phoneField: string; messageTemplate: string } }
  | { type: "crm_create_contact"; config: { nameField: string; phoneField: string; emailField?: string; customMapping?: Record<string, string> } }
  | { type: "crm_add_reminder"; config: { contactIdField: string; title: string; text: string; timeField: string } }
  | { type: "email_send"; config: { contactIdField: string; emailField: string; subject: string; bodyTemplate: string } }
  | { type: "create_invoice"; config: { nameField: string; amountField: string; description: string; phoneField?: string } }
  | { type: "generate_ai_post"; config: { promptTemplate: string; tone: string } }
  | { type: "calendar_create_event"; config: { titleField: string; descriptionField?: string; timeField: string; type: "task" | "meeting" | "reminder" } }
  | { type: "crm_update_with_receipt"; config: { phoneField: string; amountField: string; documentNumberField: string; documentUrlField: string } };

export interface Automation {
  id: string;
  ownerId: string;
  name: string;
  isActive: boolean;
  trigger: Trigger;
  steps: ActionStep[];
  createdAt?: string;
  updatedAt?: string;
  lastRunAt?: string;
}

// Replaces placeholders like {{field_name}} with actual data from payload
export function parseTemplate(template: string, payload: any): string {
  if (!template) return "";
  return template.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
    const value = payload[key.trim()];
    return value !== undefined ? String(value) : match;
  });
}

// Execute a single step
async function executeStep(step: ActionStep, payload: any, ownerId: string) {
  switch (step.type) {
    case "whatsapp_send": {
      const phone = parseTemplate(step.config.phoneField, payload);
      const message = parseTemplate(step.config.messageTemplate, payload);
      if (!phone) throw new Error("WhatsApp: Phone number is empty after parsing template.");

      const settingsRef = adminDb.collection("whatsapp_settings").doc(ownerId);
      const settingsSnap = await settingsRef.get();
      if (!settingsSnap.exists) throw new Error("WhatsApp settings not found for user.");
      
      const settings = settingsSnap.data() as { idInstance?: string; apiToken?: string };
      if (!settings.idInstance || !settings.apiToken) throw new Error("WhatsApp settings incomplete.");

      let cleanPhone = phone.replace(/\D/g, "");
      if (cleanPhone.startsWith("0")) cleanPhone = "972" + cleanPhone.slice(1);
      const chatId = `${cleanPhone}@c.us`;

      const url = `https://api.green-api.com/waInstance${settings.idInstance}/sendMessage/${settings.apiToken}`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId, message: message.replace(/\n/g, "\r\n") }),
      });

      if (!response.ok) {
        throw new Error(`WhatsApp API Error: ${response.status}`);
      }
      return await response.json();
    }
    
    case "crm_create_contact": {
      const conta_name = parseTemplate(step.config.nameField, payload);
      const conta_phone = parseTemplate(step.config.phoneField, payload);
      const email = step.config.emailField ? parseTemplate(step.config.emailField, payload) : "";

      if (!conta_name || !conta_phone) {
        throw new Error("CRM: Name and Phone are required.");
      }

      const contactsRef = adminDb.collection("contacts");
      const phoneSnap = await contactsRef
        .where("ownerId", "==", ownerId)
        .where("conta_phone", "==", conta_phone)
        .limit(1)
        .get();

      let contactId = "";
      if (!phoneSnap.empty) {
         contactId = phoneSnap.docs[0].id;
         const currentEvents = phoneSnap.docs[0].data().events || [];
         const newEvent = {
            time: new Date().toISOString(),
            title: "אוטומציה שרת",
            text: "איש הקשר עודכן דרך אוטומציה"
         };
         await contactsRef.doc(contactId).update({
            events: [...currentEvents, newEvent],
            updatedAt: new Date().toISOString()
         });
         return { status: "updated", contactId };
      }

      const newContact = {
        ownerId,
        status: "active",
        conta_name,
        conta_phone,
        email,
        tg1: "Automation",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        events: [{
          time: new Date().toISOString(),
          title: "אוטומציה שרת",
          text: "נוצר דרך אוטומציה"
        }]
      };

      const docRef = await contactsRef.add(newContact);
      return { status: "created", contactId: docRef.id };
    }
    
    case "crm_add_reminder": {
      const contactId = parseTemplate(step.config.contactIdField, payload);
      const title = parseTemplate(step.config.title, payload);
      const text = parseTemplate(step.config.text, payload);
      const time = parseTemplate(step.config.timeField, payload);
      
      if (!contactId) throw new Error("CRM Reminder: Contact ID is required.");
      
      const docRef = adminDb.collection("contacts").doc(contactId);
      const docSnap = await docRef.get();
      if (!docSnap.exists || docSnap.data()?.ownerId !== ownerId) throw new Error("Contact not found or unauthorized");
      
      const newEvent = { time: time || new Date().toISOString(), title, text };
      const currentEvents = docSnap.data()?.events || [];
      await docRef.update({ events: [newEvent, ...currentEvents], updatedAt: new Date().toISOString() });
      return { status: "reminder_added" };
    }

    case "crm_update_with_receipt": {
      const conta_phone = parseTemplate(step.config.phoneField, payload);
      const amount = parseTemplate(step.config.amountField, payload);
      const docNum = parseTemplate(step.config.documentNumberField, payload);
      const docUrl = parseTemplate(step.config.documentUrlField, payload);
      
      if (!conta_phone) {
        throw new Error("CRM Receipt Update: Phone is required to identify contact.");
      }

      const contactsRef = adminDb.collection("contacts");
      const phoneSnap = await contactsRef
        .where("ownerId", "==", ownerId)
        .where("conta_phone", "==", conta_phone)
        .limit(1)
        .get();

      if (phoneSnap.empty) {
         return { status: "not_found", message: "Contact not found for receipt update" };
      }

      const contactId = phoneSnap.docs[0].id;
      const currentEvents = phoneSnap.docs[0].data().events || [];
      const newEvent = {
        time: new Date().toISOString(),
        title: "קבלה חדשה (אוטומציה/EZcount)",
        text: `הופקה קבלה מס' ${docNum || '-'} על סך ${amount || '-'} ₪.\nקישור למסמך: ${docUrl || 'לא סופק'}`
      };
      await contactsRef.doc(contactId).update({
        events: [newEvent, ...currentEvents],
        updatedAt: new Date().toISOString()
      });
      return { status: "receipt_updated", contactId };
    }

    case "email_send": {
      const email = parseTemplate(step.config.emailField, payload);
      const subject = parseTemplate(step.config.subject, payload);
      const body = parseTemplate(step.config.bodyTemplate, payload);
      const contactId = step.config.contactIdField ? parseTemplate(step.config.contactIdField, payload) : null;
      
      if (!email) throw new Error("Email: Address is required.");
      
      // In a real scenario, you'd trigger the email API here.
      // We will mock the sending but log it to CRM timeline if contactId exists.
      if (contactId) {
        const docRef = adminDb.collection("contacts").doc(contactId);
        const docSnap = await docRef.get();
        if (docSnap.exists && docSnap.data()?.ownerId === ownerId) {
           const newEvent = { time: new Date().toISOString(), title: "מייל יוצא מהמערכת (אוטומציה)", text: `אל: ${email}\nנושא: ${subject}\nתוכן:\n${body}` };
           const currentEvents = docSnap.data()?.events || [];
           await docRef.update({ events: [newEvent, ...currentEvents], updatedAt: new Date().toISOString() });
        }
      }
      return { status: "email_sent", email, subject };
    }

    case "create_invoice": {
      const name = parseTemplate(step.config.nameField, payload);
      const amount = parseTemplate(step.config.amountField, payload);
      const description = parseTemplate(step.config.description, payload);
      if (!name || !amount) throw new Error("Invoice: Name and Amount are required.");
      
      // We just log it as a receipt creation payload for Kesher integration.
      const invoiceData = {
        ownerId,
        customerName: name,
        amount: parseFloat(amount),
        description,
        source: "automation",
        createdAt: new Date().toISOString()
      };
      const invRef = await adminDb.collection("receipts").add(invoiceData);
      return { status: "invoice_created", invoiceId: invRef.id };
    }

    case "generate_ai_post": {
      const prompt = parseTemplate(step.config.promptTemplate, payload);
      const tone = step.config.tone || "רגיל";
      if (!prompt) throw new Error("AI: Prompt is required.");
      
      // Placeholder for AI text generation. In reality, would call `generatePostWithAI` logic.
      // We save an initial draft post.
      const postData = {
        ownerId,
        title: `טיוטת פוסט מבוססת אוטומציה`,
        content: `[טיוטת תוכן שנוצרה מ-${prompt}]`,
        tone,
        status: "draft",
        createdAt: new Date().toISOString()
      };
      const postRef = await adminDb.collection("posts").add(postData);
      return { status: "ai_post_generated", postId: postRef.id };
    }

    case "calendar_create_event": {
      const title = parseTemplate(step.config.titleField, payload);
      const description = step.config.descriptionField ? parseTemplate(step.config.descriptionField, payload) : "";
      const time = parseTemplate(step.config.timeField, payload);
      
      if (!title) throw new Error("Calendar: Title is required.");
      
      const type = step.config.type || "task";
      let collectionName = "tasks";
      if (type === "meeting") collectionName = "meetings";
      if (type === "reminder") collectionName = "reminders";

      const docData = {
        title,
        description,
        dueDate: time || new Date().toISOString(),
        startTime: time || new Date().toISOString(),
        endTime: time || new Date().toISOString(),
        ownerId,
        createdAt: new Date().toISOString()
      };
      
      const ref = await adminDb.collection(collectionName).add(docData);
      
      const { logSystemEvent } = await import("@/lib/system-logger");
      await logSystemEvent({
        level: "success",
        module: "automation",
        action: "calendar_create_event",
        description: `נוצר אירוע ${type} דרך אוטומציה: ${title}`,
        ownerId
      });
      
      return { status: "calendar_event_created", id: ref.id };
    }

    default:
      throw new Error(`Unknown step type: ${(step as any).type}`);
  }
}

export async function runAutomation(automationId: string, payload: any) {
  const executionId = Date.now().toString() + Math.random().toString(36).substring(7);
  
  try {
    const autoDoc = await adminDb.collection("automations").doc(automationId).get();
    if (!autoDoc.exists) throw new Error("Automation not found");

    const automation = autoDoc.data() as Automation;
    if (!automation.isActive) return; // Don't throw, just silently skip disabled automations

    const logs: any[] = [];
    let success = true;

    for (let i = 0; i < automation.steps.length; i++) {
      const step = automation.steps[i];
      try {
        const result = await executeStep(step, payload, automation.ownerId);
        logs.push({ step: i, type: step.type, status: "success", result });
      } catch (err: any) {
        logs.push({ step: i, type: step.type, status: "error", error: err.message });
        success = false;
        break; 
      }
    }

    await adminDb.collection("automation_logs").doc(executionId).set({
      executionId,
      automationId,
      ownerId: automation.ownerId,
      status: success ? "success" : "failed",
      payload,
      logs,
      timestamp: new Date().toISOString(),
    });
    
    // Update last run time
    await autoDoc.ref.update({ lastRunAt: new Date().toISOString() });

  } catch (error: any) {
    await adminDb.collection("automation_logs").doc(executionId).set({
      executionId,
      automationId,
      status: "failed",
      payload,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
}
