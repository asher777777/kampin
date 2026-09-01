"use server";

import { adminDb } from "@/lib/firebase-admin";
import { auth } from "@/lib/auth";
import { Contact } from "./types";
import { getContacts, getCustomFields } from "./actions";

async function getUserId(): Promise<string> {
  const session = await auth();
  if (session?.user?.id) {
    return session.user.id;
  }
  throw new Error("Unauthorized");
}

function parseDateToTime(val: any): number | null {
  if (!val) return null;
  if (val instanceof Date) return val.getTime();
  if (typeof val === "object" && typeof val._seconds === "number") {
    return val._seconds * 1000;
  }
  if (typeof val === "object" && typeof val.toDate === "function") {
    try {
      return val.toDate().getTime();
    } catch (e) {
      return null;
    }
  }
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (!trimmed) return null;
    if (/^\d{2}\/\d{2}\/\d{4}/.test(trimmed)) {
      const parts = trimmed.split(/[\/\-]/);
      if (parts.length >= 3) {
        const d = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const y = parseInt(parts[2], 10);
        const dateObj = new Date(y, m, d);
        if (!isNaN(dateObj.getTime())) return dateObj.getTime();
      }
    }
    const parsed = Date.parse(trimmed);
    if (!isNaN(parsed)) return parsed;
  }
  return null;
}

export interface CRMAnalyticsFilter {
  startDate?: string;
  endDate?: string;
  status?: "active" | "trashed" | "all";
}

export async function getCRMAnalytics(filter?: CRMAnalyticsFilter) {
  try {
    const ownerId = await getUserId();
    const contactStatus = filter?.status || "active";
    
    let contacts: Contact[] = [];

    if (contactStatus === "all") {
      const snapshot = await adminDb
        .collection("contacts")
        .where("ownerId", "==", ownerId)
        .get();

      contacts = snapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data(),
      } as Contact));
    } else {
      // 1. Fetch using standard getContacts action (ensuring 100% parity with CRM)
      const contactsRes = await getContacts({
        status: contactStatus as "active" | "trashed",
        page: 1,
        per_page: 0,
      });

      contacts = contactsRes?.contacts || [];

      // Fallback if needed: direct collection query
      if (contacts.length === 0) {
        const snapshot = await adminDb
          .collection("contacts")
          .where("ownerId", "==", ownerId)
          .get();

        contacts = snapshot.docs
          .map((doc: any) => ({
            id: doc.id,
            ...doc.data(),
          } as Contact))
          .filter((c) => contactStatus === "trashed" ? c.status === "trashed" : c.status !== "trashed");
      }
    }

    try {
      require("fs").appendFileSync("debug-crm.log", JSON.stringify({
        time: new Date().toISOString(),
        action: "getCRMAnalytics",
        ownerId,
        status: contactStatus,
        contactsFound: contacts.length,
      }) + "\n");
    } catch (e) {}

    // Date filtering if provided
    if (filter?.startDate || filter?.endDate) {
      const start = filter.startDate ? parseDateToTime(filter.startDate) ?? 0 : 0;
      const end = filter.endDate ? (parseDateToTime(filter.endDate + "T23:59:59.999Z") ?? Infinity) : Infinity;

      contacts = contacts.filter((c) => {
        const contactDateVal = c.createdAt || c.updatedAt || c.last_form_submission_date || c.last_order_date;
        const time = parseDateToTime(contactDateVal);
        if (time === null) return true;
        return time >= start && time <= end;
      });
    }

    // Fetch custom fields
    const customFields = await getCustomFields();

    let totalSpent = 0;
    let totalCampaignAmount = 0;
    const tagsCount: Record<string, number> = {};
    const leadSourcesCount: Record<string, number> = {};
    const formsCount: Record<string, number> = {};
    const numericFieldsAgg: Record<string, { 
      sum: number; 
      count: number; 
      entries: Array<{
        contactId: string;
        parentName: string;
        phone: string;
        childName?: string;
        totalSpent: number;
        hasPaid: boolean;
        value: number;
      }>;
    }> = {};
    const textFieldsAgg: Record<string, Record<string, number>> = {};

    contacts.forEach((c: any) => {
      // Actual Total Spent (from total_spent field)
      const spent = Number(c.total_spent || 0);
      if (!isNaN(spent)) {
        totalSpent += spent;
      }

      // Campaign Amount (pledged / total campaign donations)
      const campAmount = Number(c.campaign_amount || 0);
      if (!isNaN(campAmount)) {
        totalCampaignAmount += campAmount;
      }

      // Tags
      [c.tg1, c.tg2, c.tg3].forEach((t) => {
        if (t && typeof t === "string" && t.trim()) {
          const trimmed = t.trim();
          tagsCount[trimmed] = (tagsCount[trimmed] || 0) + 1;
        }
      });

      // Lead source & City
      if (c.lead_source && typeof c.lead_source === "string" && c.lead_source.trim()) {
        const ls = c.lead_source.trim();
        leadSourcesCount[ls] = (leadSourcesCount[ls] || 0) + 1;
      } else if (c.mh_crm_city && typeof c.mh_crm_city === "string" && c.mh_crm_city.trim()) {
        const city = `עיר: ${c.mh_crm_city.trim()}`;
        leadSourcesCount[city] = (leadSourcesCount[city] || 0) + 1;
      }

      // Forms count
      if (c.last_form_name && typeof c.last_form_name === "string" && c.last_form_name.trim()) {
        const fn = c.last_form_name.trim();
        formsCount[fn] = (formsCount[fn] || 0) + 1;
      }
      if (Array.isArray(c.form_submissions)) {
        c.form_submissions.forEach((fs: any) => {
          if (fs?.name && typeof fs.name === "string" && fs.name.trim()) {
            const fn = fs.name.trim();
            if (fn !== c.last_form_name) {
              formsCount[fn] = (formsCount[fn] || 0) + 1;
            }
          }
        });
      }

      // Custom fields numeric & text aggregation
      customFields.forEach((cf) => {
        const val = c[cf.id];
        if (val !== undefined && val !== null && val !== "") {
          if (cf.type === "number" || (!isNaN(Number(val)) && typeof val === "number")) {
            const num = Number(val);
            if (!numericFieldsAgg[cf.label || cf.id]) {
              numericFieldsAgg[cf.label || cf.id] = { sum: 0, count: 0, entries: [] };
            }
            numericFieldsAgg[cf.label || cf.id].sum += num;
            numericFieldsAgg[cf.label || cf.id].count += 1;
            numericFieldsAgg[cf.label || cf.id].entries.push({
              contactId: c.id,
              parentName: c.conta_name || "",
              phone: c.conta_phone || "",
              childName: c.child_first_name || c.first_name || "",
              totalSpent: Number(c.total_spent || 0),
              hasPaid: Number(c.total_spent || 0) > 0,
              value: num,
            });
          } else if (typeof val === "string" && val.length < 50) {
            if (!textFieldsAgg[cf.label || cf.id]) {
              textFieldsAgg[cf.label || cf.id] = {};
            }
            textFieldsAgg[cf.label || cf.id][val] = (textFieldsAgg[cf.label || cf.id][val] || 0) + 1;
          }
        }
      });
    });

    return {
      totalContacts: contacts.length,
      totalSpent,
      totalCampaignAmount,
      tagsCount,
      leadSourcesCount,
      formsCount,
      numericFieldsAgg,
      textFieldsAgg,
      contacts: JSON.parse(JSON.stringify(contacts)),
      customFields: customFields.map((f) => ({ id: f.id, label: f.label || f.id, category: f.category, type: f.type })),
    };
  } catch (error: any) {
    console.error("Error in getCRMAnalytics:", error);
    return { error: error.message || String(error) };
  }
}

export async function getFormSubmissionsAnalytics(filter?: CRMAnalyticsFilter) {
  try {
    const ownerId = await getUserId();
    
    // Fetch contacts using getContacts
    const contactsRes = await getContacts({
      status: "active",
      page: 1,
      per_page: 0,
    });

    const contacts: Contact[] = contactsRes?.contacts || [];
    const submissions: any[] = [];
    const formsCount: Record<string, number> = {};

    contacts.forEach((c: any) => {
      const contactId = c.id;
      
      if (Array.isArray(c.form_submissions) && c.form_submissions.length > 0) {
        c.form_submissions.forEach((fs: any, idx: number) => {
          const formName = fs.name || c.last_form_name || "טופס כללי";
          formsCount[formName] = (formsCount[formName] || 0) + 1;
          
          submissions.push({
            id: `${contactId}_sub_${idx}`,
            contactId,
            conta_name: c.conta_name,
            conta_phone: c.conta_phone,
            email: c.email || "",
            formName,
            formPage: fs.page || c.last_form_page || "",
            submissionDate: fs.date || c.last_form_submission_date || c.createdAt || "",
            ...c,
            ...(fs.payload || {}),
          });
        });
      } else if (c.last_form_name) {
        const formName = c.last_form_name;
        formsCount[formName] = (formsCount[formName] || 0) + 1;
        
        submissions.push({
          id: `${contactId}_sub_last`,
          contactId,
          conta_name: c.conta_name,
          conta_phone: c.conta_phone,
          email: c.email || "",
          formName,
          formPage: c.last_form_page || "",
          submissionDate: c.last_form_submission_date || c.createdAt || "",
          ...c,
        });
      }
    });

    let filteredSubmissions = submissions;
    if (filter?.startDate || filter?.endDate) {
      const start = filter.startDate ? parseDateToTime(filter.startDate) ?? 0 : 0;
      const end = filter.endDate ? (parseDateToTime(filter.endDate + "T23:59:59.999Z") ?? Infinity) : Infinity;

      filteredSubmissions = filteredSubmissions.filter((s) => {
        const time = parseDateToTime(s.submissionDate);
        if (time === null) return true;
        return time >= start && time <= end;
      });
    }

    return {
      totalSubmissions: filteredSubmissions.length,
      formsCount,
      submissions: JSON.parse(JSON.stringify(filteredSubmissions)),
    };
  } catch (error: any) {
    console.error("Error in getFormSubmissionsAnalytics:", error);
    return { error: error.message || String(error) };
  }
}
