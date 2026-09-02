import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function GET() {
  try {
    const contactsSnap = await adminDb.collection("contacts").get();
    
    // Filter strictly to contacts belonging to this campaign
    const campaignDonors = contactsSnap.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as any))
      .filter(c => {
        const ls = c.lead_source || "";
        const cName = c.conta_name || "";
        const fm = c.f_m || "";
        const full = `${cName} ${fm}`;
        const isCampDonor = ls.includes("תורם בקמפיין") || ls.includes("דף הבית הרשמי") || full.includes("ורד עובדיה") || full.includes("שירלי הרמן");
        return c.status !== "trashed" && isCampDonor;
      });

    // 1. Delete all current donations in campaign "home" and "default-campaign"
    for (const cid of ["home", "default-campaign"]) {
      const existing = await adminDb.collection("campaigns").doc(cid).collection("donations").get();
      for (const d of existing.docs) {
        await d.ref.delete();
      }
    }

    const inserted: any[] = [];
    const THREE_DAYS_AGO = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).getTime();
    const seenNames = new Set<string>();

    // 2. Insert ONLY genuine campaign donors with deduplicated names and proper dates
    for (const contact of campaignDonors) {
      const cName = (contact.conta_name || "").trim();
      const fm = (contact.f_m || "").trim();
      
      let cleanName = "";
      if (cName && fm) {
        if (cName.includes(fm)) cleanName = cName;
        else if (fm.includes(cName)) cleanName = fm;
        else cleanName = `${cName} ${fm}`.trim();
      } else {
        cleanName = cName || fm || contact.name || contact.fullName || "תורם";
      }

      const isAnonymous = Boolean(contact.isAnonymous || cleanName.includes("אנונימי") || cName === "אנונימי");
      const donorName = isAnonymous ? "אנונימי" : cleanName;
      const phone = (contact.conta_phone || contact.phone || contact.mobile || "").trim();
      const email = (contact.email || "").trim();

      // Deduplicate duplicate contacts strictly by donorName
      const uniqueKey = isAnonymous ? `anon_${contact.id}` : donorName.trim();
      if (seenNames.has(uniqueKey)) continue;
      seenNames.add(uniqueKey);
      
      // Determine correct campaign amount
      let amount = Number(contact.total_donated) || Number(contact.campaign_donation_amount) || 0;
      if (cleanName.includes("ורד עובדיה")) amount = 2160;
      if (cleanName.includes("שירלי הרמן")) amount = 2160;
      if (cleanName.includes("רותם ליטל")) amount = 300;

      const isRecurring = Boolean(contact.is_standing_order || (contact.lead_source && contact.lead_source.includes("הוראת קבע")) || amount === 2160 || amount === 1200 || amount === 300);

      // Determine correct recent date (all happened in the last 1-3 days)
      let donationDate = contact.createdAt || new Date().toISOString();
      const history = contact.campaign_donations_history || [];
      let dedication = contact.dedication || "";

      if (history.length > 0) {
        const lastH = history[history.length - 1];
        if (lastH.dedication) dedication = lastH.dedication;
        if (lastH.date) donationDate = lastH.date;
      }

      // If the date is older than 3 days, set it to the actual campaign timeline (Sept 1st / Sept 2nd)
      const dTime = new Date(donationDate).getTime();
      if (isNaN(dTime) || dTime < THREE_DAYS_AGO) {
        if (cleanName.includes("ורד עובדיה")) donationDate = "2026-09-01T17:30:00.000Z";
        else if (cleanName.includes("שירלי הרמן")) donationDate = "2026-09-01T16:15:00.000Z";
        else if (cleanName.includes("בוקובזה")) donationDate = "2026-09-01T12:00:00.000Z";
        else donationDate = "2026-09-01T17:00:00.000Z";
      }

      // Ignore old test records like 26 nis if not part of active campaign
      if (cleanName.includes("בוקובזה בלה") && amount < 100) {
        continue;
      }

      if (amount > 0) {
        const donId = `don_${contact.id}`;
        await adminDb.collection("campaigns").doc("home").collection("donations").doc(donId).set({
          campaignId: "home",
          contactId: contact.id,
          donorName,
          realDonorName: cleanName,
          amount,
          isRecurring,
          dedication,
          isAnonymous,
          phone,
          email,
          paymentStatus: "completed",
          paymentMethod: isRecurring ? "kesher_standing_order" : "kesher_credit_card",
          createdAt: donationDate,
        });

        inserted.push({ donorName, amount, isRecurring, dedication, donationDate });
      }
    }

    // Recalculate totals
    const totalRaised = inserted.reduce((sum, item) => sum + item.amount, 0);
    await adminDb.collection("campaigns").doc("home").update({
      totalRaised,
      donorCount: inserted.length,
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      count: inserted.length,
      inserted,
    });
  } catch (err: any) {
    console.error("Error in campaign restore:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
