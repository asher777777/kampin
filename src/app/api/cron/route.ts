import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { runAutomation, Automation } from "@/lib/automations/engine";

export async function GET(request: Request) {
  try {
    // 1. Verify Authorization (Simple secret token check)
    // For Google Cloud Scheduler, you would typically pass ?token=YOUR_SECRET
    const url = new URL(request.url);
    const token = url.searchParams.get("token");
    
    // Replace this with an environment variable check in production
    // e.g., if (token !== process.env.CRON_SECRET) {
    if (token !== "automation-cron-secret-123") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Fetch all active automations with time-based triggers
    const automationsRef = adminDb.collection("automations");
    const snapshot = await automationsRef.where("isActive", "==", true).get();
    
    const now = new Date();
    const currentHour = now.getHours().toString().padStart(2, "0");
    const currentMinute = now.getMinutes().toString().padStart(2, "0");
    const currentTimeString = `${currentHour}:${currentMinute}`;
    const currentDateIso = now.toISOString().slice(0, 10); // YYYY-MM-DD
    
    let executedCount = 0;

    for (const doc of snapshot.docs) {
      const auto = doc.data() as Automation;
      const trigger = auto.trigger;
      
      let shouldRun = false;

      // Check specific_time (daily at HH:MM)
      if (trigger && trigger.type === "specific_time" && trigger.cronExpression === currentTimeString) {
        // Prevent running multiple times in the same minute
        const lastRun = auto.lastRunAt ? new Date(auto.lastRunAt).toISOString().slice(0, 16) : "";
        const currentRun = now.toISOString().slice(0, 16);
        if (lastRun !== currentRun) {
          shouldRun = true;
        }
      }

      // Check specific_date (run once at exact YYYY-MM-DDTHH:MM)
      if (trigger && trigger.type === "specific_date" && trigger.dateIso) {
        const triggerDate = new Date(trigger.dateIso).toISOString().slice(0, 16);
        const currentRun = now.toISOString().slice(0, 16);
        if (triggerDate === currentRun) {
          // Disable it after running once
          await doc.ref.update({ isActive: false });
          shouldRun = true;
        }
      }

      if (shouldRun) {
        // Run the automation asynchronously with empty payload
        void runAutomation(doc.id, { triggerTime: now.toISOString() });
        executedCount++;
      }
    }

    // 3. Sweep pending donations older than 5 minutes for automated WhatsApp reminder
    try {
      const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

      const pendingSnap = await adminDb.collectionGroup("donations")
        .where("paymentStatus", "==", "pending")
        .where("pendingWhatsAppSent", "==", false)
        .where("createdAt", "<=", fiveMinsAgo)
        .where("createdAt", ">=", twoHoursAgo)
        .limit(20)
        .get();

      for (const donDoc of pendingSnap.docs) {
        const donData = donDoc.data();
        const targetCampId = donData.campaignId || "home";
        const phone = donData.phone;
        if (!phone) {
          await donDoc.ref.update({ pendingWhatsAppSent: true });
          continue;
        }

        // Fetch drawerConfig
        const pageDoc = await adminDb.collection("pages").doc(targetCampId === "default-campaign" || targetCampId === "home" ? "home" : targetCampId).get();
        const drawerConfig = pageDoc.data()?.campaignTiers?.drawerConfig || {};

        if (drawerConfig.whatsapp_enabled === false) {
          await donDoc.ref.update({ pendingWhatsAppSent: true });
          continue;
        }

        const pendingTemplate = drawerConfig.whatsapp_pending_message || "שלום {שם מלא}, שמנו לב שהתחלת תרומה בסך ₪{סכום} עבור {שם קמפיין} אך התהליך טרם הושלם. לחץ כאן להשלמת התרומה: {קישור לתשלום}";
        const paymentUrl = `${process.env.NEXTAUTH_URL || "https://kampin.web.app"}/c/${targetCampId}?openDonate=true`;

        let resolvedMsg = pendingTemplate;
        resolvedMsg = resolvedMsg.replace(/\{שם מלא\}/g, donData.donorName || "ידיד/ת הקמפיין");
        resolvedMsg = resolvedMsg.replace(/\{טלפון\}|\{מספר טלפון נייד\}|\{מספר טלפון\}/g, phone);
        resolvedMsg = resolvedMsg.replace(/\{דוא"ל\}|\{כתובת אימייל\}|\{אימייל\}/g, donData.email || "");
        resolvedMsg = resolvedMsg.replace(/\{סכום\}|\{סכום התרומה\}/g, String(donData.amount || ""));
        resolvedMsg = resolvedMsg.replace(/\{מסלול\}|\{מסלול תרומה\}/g, donData.tier || "");
        resolvedMsg = resolvedMsg.replace(/\{סוג תרומה\}/g, donData.isRecurring ? "הוראת קבע" : "תרומה חד פעמית");
        resolvedMsg = resolvedMsg.replace(/\{מספר חודשים\}/g, String(donData.recurringMonths || 1));
        resolvedMsg = resolvedMsg.replace(/\{שם קמפיין\}|\{קמפיין\}|\{עמוד\}/g, donData.campaignTitle || "הקמפיין");
        resolvedMsg = resolvedMsg.replace(/\{שם שגריר\}|\{שגריר\}/g, donData.ambassadorName || "");
        resolvedMsg = resolvedMsg.replace(/\{הקדשה\}|\{ברכה\}/g, donData.dedication || "");
        resolvedMsg = resolvedMsg.replace(/\{קישור לתשלום\}|\{link_tashlum\}/g, paymentUrl);

        const { sendWhatsAppMessage, sendWhatsAppFileByUrl } = await import("@/features/whatsapp/actions");
        if (drawerConfig.whatsapp_pending_image_url) {
          await sendWhatsAppFileByUrl(phone, drawerConfig.whatsapp_pending_image_url, "reminder.png", resolvedMsg);
        } else {
          await sendWhatsAppMessage(phone, resolvedMsg);
        }

        await donDoc.ref.update({
          pendingWhatsAppSent: true,
          pendingWhatsAppSentAt: new Date().toISOString(),
        });
      }
    } catch (cronDonErr) {
      console.warn("Cron pending donations sweep notice:", cronDonErr);
    }

    return NextResponse.json({ success: true, executedCount, message: "Cron executed successfully" });
  } catch (error: any) {
    console.error("Cron Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
