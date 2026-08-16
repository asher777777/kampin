"use server";

import { adminDb } from "@/lib/firebase-admin";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function getAiSettings() {
  try {
    const { auth } = await import("@/lib/auth");
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) throw new Error("Unauthorized");

    // First check user doc overrides
    const userDoc = await adminDb.collection("users").doc(userId).get();
    const userData = userDoc.data();
    
    if (userData?.useAdminGoogleAi) {
      const globalDoc = await adminDb.collection("configs").doc("global").get();
      const globalConfig = globalDoc.data() || {};
      return { googleAiKey: globalConfig.googleAiKey || "" };
    }
    
    if (userData?.googleAiKey) {
      return { googleAiKey: userData.googleAiKey };
    }

    const { getUserDb } = await import("@/lib/firebase-admin");
    const docRef = getUserDb(userId).collection("settings").doc("ai");
    const docSnap = await docRef.get();
    if (docSnap.exists) {
      return docSnap.data();
    }
    return { googleAiKey: "" };
  } catch (error) {
    console.error("Error getting AI settings:", error);
    return { googleAiKey: "" };
  }
}

export async function saveAiSettings(settings: { googleAiKey: string }) {
  try {
    const { auth } = await import("@/lib/auth");
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) throw new Error("Unauthorized");
    const { getUserDb } = await import("@/lib/firebase-admin");

    const docRef = getUserDb(userId).collection("settings").doc("ai");
    await docRef.set({ ...settings, updatedAt: new Date().toISOString() }, { merge: true });
    return { success: true };
  } catch (error: any) {
    console.error("Error saving AI settings:", error);
    return { success: false, error: error.message };
  }
}

export async function rephraseTextWithAI(
  text: string,
  tone: "warm" | "elegant" | "punchy" | "storytelling" = "warm",
  customInstruction: string = "",
  skipLimits: boolean = false,
  isRichText: boolean = false
): Promise<{ success: boolean; text?: string; error?: string }> {
  try {
    if (!skipLimits) {
      const { auth } = await import("@/lib/auth");
      const session = await auth();
      const userId = session?.user?.id;
      if (!userId) throw new Error("Unauthorized");
      const { checkFeatureLimit } = await import("@/features/users/actions");
      const limitCheck = await checkFeatureLimit(userId, "ai");
      if (!limitCheck.allowed) {
        return { success: false, error: "LIMIT_REACHED:" + ('message' in limitCheck ? limitCheck.message : "") };
      }
    }
  } catch(e) {}

  if (!text || !text.trim()) {
    return { success: false, error: "לא נשלח טקסט" };
  }

  let apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";
  if (!apiKey) {
    const aiSettings = await getAiSettings();
    apiKey = aiSettings?.googleAiKey || "";
  }

  if (!apiKey) {
    return { success: false, error: "לא נמצא מפתח API" };
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-3.1-pro-preview" });
    
    const toneGuidelines: Record<string, string> = {
      warm: "סגנון חם, מסביר פנים ומקרב לבבות.",
      elegant: "סגנון יוקרתי, רשמי, מכובד.",
      punchy: "סגנון קצר, קולע ומניע לפעולה.",
      storytelling: "סגנון סיפורי, מרגש ורוחני."
    };

    const formatInstructions = isRichText
      ? `1. פלט: החזר אך ורק קוד HTML נקי! הטקסט חייב להיות מעוצב באמצעות תגיות HTML עשירות (כגון <h2>, <h3>, <p>, <strong>, <ul>, <li>, <em>).
2. עיצוב: אל תשתמש ב-Markdown (כגון כוכביות או סולמות). השתמש רק ב-HTML.
3. אל תוסיף הקדמות, פשוט החזר את ה-HTML נטו שניתן להזריק ישירות לעורך טקסט.`
      : `1. פלט: החזר אך ורק טקסט פשוט (Plain Text) נקי לחלוטין מתגיות HTML או מסימוני Markdown. רק את המילים.
2. אורך ומבנה: מכיוון שזו כותרת או כותרת משנית, עליה להיות קצרה, מדויקת (עד 15 מילים), ללא פסקאות ארוכות או רשימות.
3. אל תוסיף שום מילות הקדמה או סיום. החזר רק את התוצאה הסופית המדויקת.`;

    const systemPrompt = `אתה קופירייטר שיווקי מומחה.
מטרה: עריכה ושדרוג קופירייטינג של טקסט המיועד לאתר האינטרנט.
טקסט מקורי:
"${text}"

סגנון כתיבה מבוקש (טון):
${toneGuidelines[tone] || toneGuidelines.warm}

${customInstruction ? `דגשים מיוחדים (חובה ליישם):
- ${customInstruction}` : ""}

הנחיות קריטיות לעבודה:
${formatInstructions}
4. עברית: כתוב בעברית קולחת וטבעית.
5. רוח המקום: התאם לרוח הקהילה - מסביר פנים ופתוח לכולם.`;

    const result = await model.generateContent(systemPrompt);
    const responseText = result.response.text().trim().replace(/^"|"$/g, '');
    
    return { success: true, text: responseText };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function generateSeoTagsWithAI(
  pageContent: string
): Promise<{ success: boolean; title?: string; description?: string; keywords?: string; error?: string }> {
  if (!pageContent || !pageContent.trim()) {
    return { success: false, error: "׳׳ ׳ ׳©׳׳— ׳×׳•׳›׳ ׳׳ ׳™׳×׳•׳—" };
  }

  try {
    const { auth } = await import("@/lib/auth");
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) throw new Error("Unauthorized");
    const { checkFeatureLimit } = await import("@/features/users/actions");
    const limitCheck = await checkFeatureLimit(userId, "ai");
    if (!limitCheck.allowed) {
      return { success: false, error: "LIMIT_REACHED:" + ('message' in limitCheck ? limitCheck.message : "") };
    }
  } catch(e) {}

  let apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";
  if (!apiKey) {
    const aiSettings = await getAiSettings();
    apiKey = aiSettings?.googleAiKey || "";
  }

  if (!apiKey) {
    return { success: false, error: "׳׳ ׳׳•׳’׳“׳¨ ׳׳₪׳×׳— API ׳©׳ Gemini. ׳׳ ׳ ׳”׳’׳“׳™׳¨׳• ׳‘׳”׳’׳“׳¨׳•׳× ׳”׳׳¢׳¨׳›׳×." };
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-3.1-pro-preview" });

    const systemPrompt = `׳׳×׳” ׳׳•׳׳—׳” SEO ׳׳§׳¦׳•׳¢׳™.
׳׳˜׳¨׳”: ׳™׳™׳¦׳•׳¨ ׳×׳’׳™׳•׳× SEO (׳›׳•׳×׳¨׳×, ׳×׳™׳׳•׳¨ ׳׳˜׳ ׳•׳׳™׳׳•׳× ׳׳₪׳×׳—) ׳׳׳•׳§׳“׳•׳× ׳•׳׳™׳›׳•׳×׳™׳•׳× ׳׳¢׳׳•׳“ ׳‘׳׳×׳¨ ׳©׳ ׳”׳׳¨׳’׳•׳, ׳¢׳ ׳‘׳¡׳™׳¡ ׳”׳×׳•׳›׳ ׳”׳‘׳ ׳©׳ ׳”׳¢׳׳•׳“.

׳×׳•׳›׳ ׳”׳¢׳׳•׳“:
"${pageContent}"

׳—׳•׳§׳™׳ ׳•׳”׳ ׳—׳™׳•׳×:
1. Title (׳›׳•׳×׳¨׳×): ׳¢׳“ 60 ׳×׳•׳•׳™׳, ׳׳•׳©׳›׳×, ׳›׳•׳׳׳× ׳׳× ׳׳™׳׳× ׳”׳׳₪׳×׳— ׳”׳¢׳™׳§׳¨׳™׳× ׳•׳©׳ ׳”׳׳•׳×׳’ (׳׳“׳•׳’׳׳” "... | ׳׳—׳•׳׳ ׳”׳§׳”׳™׳׳•׳×").
2. Description (׳×׳™׳׳•׳¨ ׳׳˜׳): ׳¢׳“ 155 ׳×׳•׳•׳™׳, ׳׳¡׳›׳ ׳׳× ׳×׳•׳›׳ ׳”׳¢׳׳•׳“, ׳׳ ׳™׳¢ ׳׳₪׳¢׳•׳׳”, ׳—׳ ׳•׳׳–׳׳™׳.
3. Keywords (׳׳™׳׳•׳× ׳׳₪׳×׳—): 5-10 ׳׳™׳׳•׳× ׳׳₪׳×׳— ׳׳•׳₪׳¨׳“׳•׳× ׳‘׳₪׳¡׳™׳§׳™׳, ׳¨׳׳•׳•׳ ׳˜׳™׳•׳× ׳׳—׳™׳₪׳•׳© ׳‘׳’׳•׳’׳.

׳₪׳׳˜ ׳ ׳“׳¨׳© (׳—׳•׳‘׳” ׳׳”׳—׳–׳™׳¨ ׳¨׳§ ׳׳•׳‘׳™׳™׳§׳˜ JSON ׳×׳§׳ ׳™, ׳׳׳ ׳₪׳•׳¨׳׳˜ Markdown ׳׳• ׳˜׳§׳¡׳˜ ׳ ׳•׳¡׳£):
{
  "title": "...",
  "description": "...",
  "keywords": "..."
}
`;

    const result = await model.generateContent(systemPrompt);
    let responseText = result.response.text().trim();
    
    // Remove markdown code blocks if any
    if (responseText.startsWith("```")) {
      const lines = responseText.split("\n");
      if (lines.length > 2) {
        responseText = lines.slice(1, -1).join("\n");
      }
    }

    const json = JSON.parse(responseText);
    
    return { 
      success: true, 
      title: json.title, 
      description: json.description, 
      keywords: json.keywords 
    };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function generateSeoImageWithAI(
  promptStr: string
): Promise<{ success: boolean; imageUrl?: string; error?: string }> {
  try {
    const { auth } = await import("@/lib/auth");
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) throw new Error("Unauthorized");
    const { checkFeatureLimit } = await import("@/features/users/actions");
    const limitCheck = await checkFeatureLimit(userId, "ai");
    if (!limitCheck.allowed) {
      return { success: false, error: "LIMIT_REACHED:" + ('message' in limitCheck ? limitCheck.message : "") };
    }
  } catch(e) {}
  let apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";
  if (!apiKey) {
    const aiSettings = await getAiSettings();
    apiKey = aiSettings?.googleAiKey || "";
  }

  if (!apiKey) {
    return { success: false, error: "׳׳ ׳׳•׳’׳“׳¨ ׳׳₪׳×׳— API ׳©׳ Gemini. ׳׳ ׳ ׳”׳’׳“׳™׳¨׳• ׳‘׳”׳’׳“׳¨׳•׳× ׳”׳׳¢׳¨׳›׳×." };
  }

  try {
    const encodedPrompt = encodeURIComponent(promptStr);
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&nologo=true`;
    
    return { success: true, imageUrl };
  } catch (error) {
    console.error("AI SEO Image Generation Error:", error);
    return { success: false, error: (error as Error).message };
  }
}

export async function suggestWizardFieldWithAI(
  fieldName: 'painPoint' | 'solution' | 'prompt',
  context: {
    type: string;
    audience: string;
    tone: string;
    painPoint?: string;
    solution?: string;
  }
): Promise<{ success: boolean; text?: string; error?: string }> {
  try {
    const { auth } = await import("@/lib/auth");
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) throw new Error("Unauthorized");
    const { checkFeatureLimit } = await import("@/features/users/actions");
    const limitCheck = await checkFeatureLimit(userId, "ai");
    if (!limitCheck.allowed) {
      return { success: false, error: "LIMIT_REACHED:" + ('message' in limitCheck ? limitCheck.message : "") };
    }
  } catch(e) {}

  let apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";
  if (!apiKey) {
    const aiSettings = await getAiSettings();
    apiKey = aiSettings?.googleAiKey || "";
  }

  if (!apiKey) {
    if (fieldName === 'painPoint') {
      return { success: true, text: `׳§׳•׳©׳™ ׳׳”׳’׳™׳¢ ׳׳§׳”׳ ׳©׳ ${context.audience} ׳‘׳¦׳•׳¨׳” ׳׳₪׳§׳˜׳™׳‘׳™׳× ׳•׳׳—׳‘׳¨ ׳׳•׳×׳ ׳׳₪׳¢׳™׳׳•׳×.` };
    }
    if (fieldName === 'solution') {
      return { success: true, text: `׳™׳¦׳™׳¨׳× ׳“׳£ ׳׳׳•׳§׳“ ׳¢׳ ׳׳¡׳¨׳™׳ ׳׳•׳×׳׳׳™׳ ׳׳™׳©׳™׳× ׳-${context.audience} ׳©׳׳ ׳™׳¢׳™׳ ׳׳₪׳¢׳•׳׳” ׳׳”׳™׳¨׳”.` };
    }
    return { success: true, text: `׳“׳£ ׳×׳•׳›׳ ׳”׳׳™׳•׳¢׳“ ׳-${context.audience} ׳‘׳˜׳•׳ ${context.tone} ׳›׳“׳™ ׳׳¢׳•׳¨׳¨ ׳¢׳ ׳™׳™׳ ׳•׳׳¢׳•׳¨׳‘׳•׳×.` };
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-3.1-pro-preview" });

    let systemPrompt = "";
    if (fieldName === 'painPoint') {
      systemPrompt = `You are a copywriting expert. Suggest 1-2 sentences in Hebrew describing the main pain point, challenge, or core need of the target audience: "${context.audience}" for a page of type "${context.type}". The tone should be "${context.tone}".
Return ONLY the suggested Hebrew text. Do not wrap in quotes or add comments.`;
    } else if (fieldName === 'solution') {
      systemPrompt = `You are a copywriting expert. Suggest 1-2 sentences in Hebrew describing the big solution offered by our organization to solve the following pain point: "${context.painPoint}". The target audience is: "${context.audience}", and page type is "${context.type}". Tone: "${context.tone}".
Return ONLY the suggested Hebrew text. Do not wrap in quotes or add comments.`;
    } else {
      systemPrompt = `You are a copywriting expert. Write a focused prompt/instruction in Hebrew for an AI writer to generate a page about "${context.type}".
Target Audience: "${context.audience}".
Tone of Voice: "${context.tone}".
Target Audience Pain Point: "${context.painPoint}".
Offered Solution: "${context.solution}".
Generate a paragraph of instructions detailing what the page should focus on.
Return ONLY the suggested Hebrew text. Do not wrap in quotes or add comments.`;
    }

    const result = await model.generateContent(systemPrompt);
    const text = result.response.text().trim();
    return { success: true, text };
  } catch (error) {
    console.error("AI Wizard Suggestion Error:", error);
    return { success: false, error: (error as Error).message };
  }
}

export async function suggestPainPointsWithAI(
  problemTitle: string,
  audiences: string[],
  skipLimits: boolean = false
): Promise<{ success: boolean; painPoints?: { title: string, description: string }[]; error?: string }> {
  try {
    if (!skipLimits) {
      const { auth } = await import("@/lib/auth");
      const session = await auth();
      const userId = session?.user?.id;
      if (!userId) throw new Error("Unauthorized");
      const { checkFeatureLimit } = await import("@/features/users/actions");
      const limitCheck = await checkFeatureLimit(userId, "ai");
      if (!limitCheck.allowed) {
        return { success: false, error: "LIMIT_REACHED:" + ('message' in limitCheck ? limitCheck.message : "") };
      }
    }
  } catch(e) {}

  let apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";
  if (!apiKey) {
    const aiSettings = await getAiSettings();
    apiKey = aiSettings?.googleAiKey || "";
  }

  if (!apiKey) {
    return { success: false, error: "׳׳ ׳׳•׳’׳“׳¨ ׳׳₪׳×׳— API ׳©׳ Gemini." };
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-3.1-pro-preview" });

    const systemPrompt = `You are an expert copywriter.
The user provides a problem title: "${problemTitle}" and a list of target audiences: ${audiences.join(', ')}.
Generate EXACTLY 6 pain points that this problem causes for these audiences.
Return the result ONLY as a JSON array of objects, where each object has "title" (string, max 5 words) and "description" (string, 1-2 short sentences in Hebrew).
Do not add any markdown formatting like \`\`\`json, just return the raw JSON array.
Example:
[
  {"title": "׳—׳•׳¡׳¨ ׳–׳׳", "description": "׳׳§׳•׳—׳•׳× ׳׳‘׳–׳‘׳–׳™׳ ׳©׳¢׳•׳× ׳¨׳‘׳•׳× ׳¢׳ ׳׳©׳™׳׳•׳× ׳™׳“׳ ׳™׳•׳× ׳©׳ ׳™׳×׳ ׳׳‘׳¦׳¢ ׳‘׳׳•׳˜׳•׳׳¦׳™׳” ׳§׳׳”."},
  ...
]`;

    const result = await model.generateContent(systemPrompt);
    let responseText = result.response.text().trim();
    
    // Remove markdown code blocks if any
    if (responseText.startsWith("\`\`\`")) {
      const lines = responseText.split("\n");
      if (lines.length > 2) {
        responseText = lines.slice(1, -1).join("\n");
      }
    }

    const painPoints = JSON.parse(responseText);
    
    return { success: true, painPoints };
  } catch (error) {
    console.error("AI Pain Points Suggestion Error:", error);
    return { success: false, error: (error as Error).message };
  }
}

export async function suggestBenefitsWithAI(
  benefitTitle: string,
  audiences: string[],
  painPointsContext: string,
  skipLimits: boolean = false
): Promise<{ success: boolean; benefits?: { title: string, description: string }[]; error?: string }> {
  try {
    if (!skipLimits) {
      const { auth } = await import("@/lib/auth");
      const session = await auth();
      const userId = session?.user?.id;
      if (!userId) throw new Error("Unauthorized");
      const { checkFeatureLimit } = await import("@/features/users/actions");
      const limitCheck = await checkFeatureLimit(userId, "ai");
      if (!limitCheck.allowed) {
        return { success: false, error: "LIMIT_REACHED:" + ('message' in limitCheck ? limitCheck.message : "") };
      }
    }
  } catch(e) {}

  let apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";
  if (!apiKey) {
    const aiSettings = await getAiSettings();
    apiKey = aiSettings?.googleAiKey || "";
  }

  if (!apiKey) {
    return { success: false, error: "׳׳ ׳׳•׳’׳“׳¨ ׳׳₪׳×׳— API ׳©׳ Gemini." };
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-3.1-pro-preview" });

    const systemPrompt = `You are an expert copywriter.
The user provides a benefit category title: "${benefitTitle}" and a list of target audiences: ${audiences.join(', ')}.
We already know the service solves the following pain points:
${painPointsContext}

Generate EXACTLY 6 benefits that this service provides for these audiences, directly addressing the pain points mentioned above.
Return the result ONLY as a JSON array of objects, where each object has "title" (string, max 5 words) and "description" (string, 1-2 short sentences in Hebrew explaining how it solves the pain points).
Do not add any markdown formatting like \`\`\`json, just return the raw JSON array.
Example:
[
  {"title": "׳—׳™׳¡׳›׳•׳ ׳׳©׳׳¢׳•׳×׳™ ׳‘׳–׳׳", "description": "׳¢׳ ׳™׳“׳™ ׳׳•׳˜׳•׳׳¦׳™׳” ׳©׳ ׳₪׳¢׳•׳׳•׳× ׳™׳“׳ ׳™׳•׳×, ׳”׳׳§׳•׳—׳•׳× ׳™׳—׳¡׳›׳• ׳©׳¢׳•׳× ׳¢׳‘׳•׳“׳” ׳™׳§׳¨׳•׳×."},
  ...
]`;

    const result = await model.generateContent(systemPrompt);
    let responseText = result.response.text().trim();
    
    // Remove markdown code blocks if any
    if (responseText.startsWith("\`\`\`")) {
      const lines = responseText.split("\n");
      if (lines.length > 2) {
        responseText = lines.slice(1, -1).join("\n");
      }
    }

    const benefits = JSON.parse(responseText);
    
    return { success: true, benefits };
  } catch (error) {
    console.error("AI Benefits Suggestion Error:", error);
    return { success: false, error: (error as Error).message };
  }
}

export async function suggestSingleServiceFromVisionWithAI(
  visionText: string,
  existingServices: string[],
  availableAudiences: string[],
  skipLimits: boolean = false
): Promise<{ success: boolean; service?: any; error?: string }> {
  try {
    if (!skipLimits) {
      const { auth } = await import("@/lib/auth");
      const session = await auth();
      const userId = session?.user?.id;
      if (!userId) throw new Error("Unauthorized");
      const { checkFeatureLimit } = await import("@/features/users/actions");
      const limitCheck = await checkFeatureLimit(userId, "ai");
      if (!limitCheck.allowed) {
        return { success: false, error: "LIMIT_REACHED:" + ('message' in limitCheck ? limitCheck.message : "") };
      }
    }
  } catch(e) {}

  let apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";
  if (!apiKey) {
    const aiSettings = await getAiSettings();
    apiKey = aiSettings?.googleAiKey || "";
  }

  if (!apiKey) {
    return { success: false, error: "לא מוגדר מפתח API של Gemini." };
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-3.1-pro-preview" });

    const systemPrompt = `You are an expert business strategist and copywriter.
The user provides their "Company Vision":
"""
${visionText}
"""

Currently, the company already offers the following services: ${existingServices.length > 0 ? existingServices.join(', ') : 'None'}.
Available target audiences in the system: ${availableAudiences.join(', ')}.

Your task:
Analyze the vision and suggest EXACTLY ONE new service that the company should offer, which is NOT in the list of existing services.
For this service, generate:
1. "name": A catchy, professional name for the service (max 5 words).
2. "targetAudiences": An array of strings selecting the most relevant audiences from the available list, or suggest new ones if none fit well.
3. "problems": An array with EXACTLY ONE object representing the main problem category this service solves. This object must have:
   - "title": The category title (e.g. "חוסר יעילות בתהליכי עבודה")
   - "painPoints": An array of EXACTLY 6 objects, each with "title" (string, max 5 words) and "description" (string, 1-2 short sentences in Hebrew explaining the pain point).
4. "benefitGroups": An array with EXACTLY ONE object representing the main benefit category of this service. This object must have:
   - "title": The category title (e.g. "אוטומציה וייעול")
   - "items": An array of EXACTLY 6 objects, each with "title" (string, max 5 words) and "description" (string, 1-2 short sentences in Hebrew explaining the benefit).

Return the result ONLY as a valid JSON object matching the exact structure below, with no markdown formatting (\`\`\`json) or additional text.
Example structure:
{
  "name": "שם השירות",
  "targetAudiences": ["קהל 1", "קהל 2"],
  "problems": [
    {
      "title": "כותרת קבוצת הכאב",
      "painPoints": [
        {"title": "כאב 1", "description": "פירוט..."}
      ]
    }
  ],
  "benefitGroups": [
    {
      "title": "כותרת קבוצת המעלות",
      "items": [
        {"title": "מעלה 1", "description": "פירוט..."}
      ]
    }
  ]
}
`;

    const result = await model.generateContent(systemPrompt);
    let responseText = result.response.text().trim();
    
    // Remove markdown code blocks if any
    if (responseText.startsWith("\`\`\`")) {
      const lines = responseText.split("\n");
      if (lines.length > 2) {
        responseText = lines.slice(1, -1).join("\n");
      }
    }

    const service = JSON.parse(responseText);
    
    return { success: true, service };
  } catch (error) {
    console.error("AI Service Suggestion Error:", error);
    return { success: false, error: (error as Error).message };
  }
}
