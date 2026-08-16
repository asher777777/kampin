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

    return NextResponse.json({ success: true, executedCount, message: "Cron executed successfully" });
  } catch (error: any) {
    console.error("Cron Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
