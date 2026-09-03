export interface GroupRule {
  field: "total_spent" | "order_count" | "lead_source" | "gender" | "mh_crm_city" | "company_name" | "last_form_name" | "has_phone";
  operator: "gte" | "lte" | "eq" | "contains" | "exists" | "not_exists";
  value: string | number;
}

export interface SmartGroup {
  id: string;
  name: string;
  color: string;
  description?: string;
  type: "manual" | "smart";
  rules?: GroupRule[];
  matchType?: "all" | "any"; // AND / OR
  count?: number;
  ownerId?: string;

  // Community enhanced parameters
  leaderName?: string; // שם מוביל הקהילה
  targetGoal?: number; // יעד כספי לקהילה
  gallery?: string[]; // א. גלריית תמונות
  vision?: string; // ב. חזון הקהילה
  purpose?: string; // ג. מטרת הקהילה
  pageId?: string; // ד. מזהה עמוד הקהילה
  pageSlug?: string; // ד. נתיב עמוד הקהילה
  pageUrl?: string; // ד. קישור לעמוד
  mainCampaignId?: string; // ה. קמפיין ראשי הקשור לעמוד הקהילה
  campaignTitle?: string;
}

export interface GroupsDataResponse {
  success: boolean;
  error?: string;
  groups: SmartGroup[];
  contacts: any[];
  totalContacts: number;
  untaggedCount: number;
  availableCities: string[];
}

export function evaluateRule(contact: any, rule: GroupRule): boolean {
  const { field, operator, value } = rule;

  if (field === "has_phone") {
    const has = Boolean(contact.conta_phone && String(contact.conta_phone).trim().length > 0);
    return operator === "exists" ? has : !has;
  }

  const contactVal = contact[field];

  if (field === "total_spent" || field === "order_count") {
    const num = Number(contactVal || 0);
    const target = Number(value || 0);
    if (operator === "gte") return num >= target;
    if (operator === "lte") return num <= target;
    if (operator === "eq") return num === target;
    return false;
  }

  const str = String(contactVal || "").toLowerCase().trim();
  const targetStr = String(value || "").toLowerCase().trim();

  if (operator === "eq") return str === targetStr;
  if (operator === "contains") return str.includes(targetStr);
  if (operator === "exists") return Boolean(str);
  if (operator === "not_exists") return !str;
  return false;
}

export function isContactInGroup(contact: any, group: SmartGroup): boolean {
  if (group.type === "smart" && group.rules && group.rules.length > 0) {
    const matchType = group.matchType || "all";
    if (matchType === "all") {
      return group.rules.every((r) => evaluateRule(contact, r));
    } else {
      return group.rules.some((r) => evaluateRule(contact, r));
    }
  }

  // Manual group: matched by tags array
  const tags: string[] = Array.isArray(contact.tags) ? contact.tags : [];
  return tags.includes(group.name) || tags.includes(group.id);
}
