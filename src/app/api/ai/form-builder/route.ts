import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getAiSettings } from "@/features/ai/actions";
import { getGlobalSettings } from "@/features/settings/actions";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { prompt } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    let apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";
    if (!apiKey) {
      const aiSettings = await getAiSettings();
      apiKey = aiSettings?.googleAiKey || "";
    }

    if (!apiKey) {
      return NextResponse.json({ error: "Gemini API Key is not configured." }, { status: 400 });
    }

    const globalSettings = await getGlobalSettings();
    const primaryColor = globalSettings?.primaryColor || "#4f46e5";
    const secondaryColor = globalSettings?.secondaryColor || "#f8fafc";

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-3.1-pro-preview" });

    const systemPrompt = `You are an expert CRM Form Architect, UI/UX Designer, and Conversion Copywriter specializing in modern Hebrew digital marketing.
Your task is to generate a JSON configuration for a CRM form based on a detailed user brief.

## Core Design Rules (MUST FOLLOW)
1. **SINGLE COLUMN ONLY**: Every field MUST have \`widthPercentage: 100\`. NEVER use 50% or smaller. All fields stack vertically, one below the other.
2. **STRICTLY 1 FIELD PER STEP**: Every single field MUST be assigned to its own unique step (step: 1, step: 2, step: 3, etc.). NEVER put more than 1 field in the same step. Keep the form short, maximum 5 fields (and therefore 5 steps) total.
3. **OPTIONAL SENSITIVE FIELDS**: Email address (\`email\`) and alternative receipt name must NEVER be mandatory required fields. They should have \`required: false\` and be presented as optional/nice-to-have. Use clear placeholder text like "אופציונלי".
4. **DYNAMIC MODERN COLORS**: Analyze the user's brief. If the form is for a summer camp, use vibrant summer colors (e.g. blue and yellow). If it's for luxury real estate, use elegant gold/black, etc. Choose a fitting \`form_bg_color\`, a complementary \`field_bg_color\` (like #f8f9ff or an off-white tint of the theme), and a bold \`submit_button_bg_color\`. NEVER use flat grays.
5. **PERSUASIVE HEBREW COPY**: All labels, placeholders, success messages, and WhatsApp messages must be written in natural, emotionally engaging, conversion-optimized Hebrew. Match the tone from the user brief.
6. **NO EMOJIS WHATSOEVER**: You are STRICTLY FORBIDDEN from using emojis anywhere in the JSON. No emojis in labels, no emojis in buttons, no emojis in messages. Use ONLY text.
7. **INTERACTIVE SELECTION BOXES**: Instead of asking the user to type out answers, whenever possible, use the \`select\` field type with 2 to 4 options (separated by \`\\n\`). This will automatically render as beautiful interactive radio cards.
8. **MODERN ICONS ONLY**: You must assign an icon from this exact list: "user" | "phone" | "mail" | "map-pin" | "building" | "briefcase" | "calendar" | "file-text" | "heart" | "smile" | "alert-circle" | "credit-card" | "coins". Do NOT use any other icons.

## The FormConfig Interface
\`\`\`typescript
interface FormField {
  label: string; // Hebrew label
  type: "text" | "tel" | "email" | "textarea" | "select" | "number" | "fixed_amount" | "hidden" | "calculated";
  map_to: string; // CRM field key (see list below)
  map_to_2?: string;
  required: boolean; // SENSITIVE fields (email, ID) MUST be false
  placeholder?: string;
  default_value: string;
  options: string; // newline-separated for select type
  url_param_enable: boolean;
  url_param_name: string;
  cond_enable: boolean;
  cond_field_index: number;
  cond_operator: "is" | "is_not";
  cond_value: string;
  step?: number; // 1-based, strictly 1 field per step, max 5 steps total
  calc_formula?: string;
  icon?: string; // "user" | "phone" | "mail" | "map-pin" | "building" | "briefcase" | "calendar" | "file-text" | "heart" | "smile" | "alert-circle" | "credit-card" | "coins"
  widthPercentage: 100; // ALWAYS 100 — single column mandatory
  autocomplete?: string; // e.g., "name", "given-name", "tel", "email", "organization"
}

interface FormConfig {
  enabled: boolean; // always true
  form_type: "standard" | "payment" | "register";
  submit_button_text: string; // Punchy Hebrew CTA with emoji
  submit_button_bg_color: string; // Use brand primary: ${primaryColor}
  submit_button_text_color: string; // "#ffffff"
  form_bg_color?: string; // "#ffffff" or subtle tint
  field_bg_color?: string; // "#f8f9ff" for clean modern look
  fields: FormField[];
  save_to_crm: boolean; // always true
  crm_owner_id: string; // leave empty
  standard_success_message: string; // Warm, celebratory Hebrew message
  standard_redirect_url: string;
  standard_whatsapp_message: string; // Friendly WhatsApp message with {Field Label} placeholders
  standard_whatsapp_image_url: string;
  payment_amount: number;
  payment_amount_crm_map: string; // "payment_amount"
  payment_pending_message: string;
  payment_pending_image_url: string;
  payment_success_message: string;
  payment_success_image_url: string;
  payment_group: string;
  payment_zeut_kupa: string;
  payment_receipt_type: string;
  payment_frequency?: "one-time" | "recurring";
  payment_installments?: number;
  crm_save_step?: number;
  register_role?: "DEVELOPING" | "TRIAL";
}
\`\`\`

## Allowed CRM Fields (map_to values)
- "conta_name": שם מלא (usually mandatory)
- "f_m": שם משפחה
- "gender": מגדר
- "birth_date": תאריך לידה
- "email": דוא"ל — OPTIONAL ONLY (required: false)
- "conta_phone": טלפון נייד / וואטסאפ (mandatory for WhatsApp)
- "work_phone": טלפון עבודה
- "website": אתר אינטרנט
- "mh_crm_city": עיר
- "mh_crm_street": רחוב
- "company_name": שם החברה
- "job_title": תפקיד
- "lead_source": מקור הליד
- "notes": הערות
- "tg1": תג סטטוס
- "tg2": תג 2
- "tg3": תג 3
- "payment_amount": סכום לתשלום


## User Brief
${prompt}

---
Return ONLY a raw valid JSON object. No markdown, no explanation. Just the JSON.`;

    const result = await model.generateContent(systemPrompt);
    let responseText = result.response.text().trim();

    // Clean up Markdown code blocks if included accidentally
    if (responseText.startsWith("```")) {
      const lines = responseText.split("\n");
      responseText = lines.slice(1, lines[lines.length - 1].trim() === "```" ? -1 : lines.length).join("\n");
    }

    try {
      const formConfig = JSON.parse(responseText);

      // Enforce single column — override any AI mistakes
      if (formConfig.fields) {
        formConfig.fields = formConfig.fields.map((f: any) => ({
          ...f,
          widthPercentage: 100
        }));
      }

      return NextResponse.json({ success: true, formConfig });
    } catch (parseError) {
      console.error("Failed to parse AI response as JSON:", responseText);
      return NextResponse.json({ error: "Failed to parse AI response. Please try again." }, { status: 500 });
    }
  } catch (error: any) {
    console.error("AI Form Builder Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
