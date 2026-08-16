"use server";

import { adminDb } from "@/lib/firebase-admin";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getAiSettings } from "@/features/ai/actions";

// Use the existing fallback auth check if available, or write a quick one
async function getUserId(): Promise<string> {
  const { auth } = await import("@/lib/auth");
  const session = await auth();
  if (session?.user?.id) {
    return session.user.id;
  }
  throw new Error("Unauthorized");
}

export interface AiPreferences {
  hasCompletedOnboarding: boolean;
  organizationName?: string;
  targetAudience?: string;
  preferredTone?: string;
  mainGoals?: string;
}

export async function getUserAiPreferences(): Promise<AiPreferences | null> {
  try {
    const userId = await getUserId();
    const docRef = adminDb.collection("ai_preferences").doc(userId);
    const snap = await docRef.get();
    
    if (snap.exists) {
      return snap.data() as AiPreferences;
    }
    return null;
  } catch (error) {
    console.error("Error getting user AI preferences:", error);
    return null;
  }
}

export async function saveUserAiPreferences(data: Partial<AiPreferences>) {
  try {
    const userId = await getUserId();
    const docRef = adminDb.collection("ai_preferences").doc(userId);
    
    await docRef.set({
      ...data,
      hasCompletedOnboarding: true,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    
    return { success: true };
  } catch (error: any) {
    console.error("Error saving user AI preferences:", error);
    return { success: false, error: error.message };
  }
}

export async function getAssistantContext() {
  try {
    const userId = await getUserId();
    
    // Fetch stats in parallel
    const [
      contactsSnap,
      automationsSnap,
      servicesSnap,
      whatsappSnap,
      prefs
    ] = await Promise.all([
      adminDb.collection("contacts").where("ownerId", "==", userId).get(),
      adminDb.collection("automations").where("ownerId", "==", userId).where("isActive", "==", true).get(),
      adminDb.collection("services").where("ownerId", "==", userId).get(),
      adminDb.collection("whatsapp_campaigns").where("ownerId", "==", userId).get(),
      getUserAiPreferences()
    ]);

    const context = {
      stats: {
        totalContacts: contactsSnap.size,
        activeAutomations: automationsSnap.size,
        totalServices: servicesSnap.size,
        whatsappCampaigns: whatsappSnap.size
      },
      preferences: prefs || {
        hasCompletedOnboarding: false,
        preferredTone: "מקצועי אך מזמין"
      }
    };

    return { success: true, context };
  } catch (error: any) {
    console.error("Error fetching assistant context:", error);
    return { success: false, error: error.message };
  }
}

export async function generateAssistantSuggestions(currentPath: string) {
  try {
    const { success, context, error } = await getAssistantContext();
    if (!success || !context) throw new Error(error || "Failed to load context");

    let apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";
    if (!apiKey) {
      const aiSettings = await getAiSettings();
      apiKey = aiSettings?.googleAiKey || "";
    }

    if (!apiKey) {
      // Return a basic fallback if no API key is configured
      return { 
        success: true, 
        data: {
          greeting: "שלום! מערכת ה-AI לא הוגדרה עדיין.",
          suggestions: [
            {
              title: "הגדרת AI",
              description: "הזן מפתח API כדי להפעיל אותי",
              href: "/dashboard/settings"
            }
          ]
        }
      };
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-3.1-pro-preview" });

    const systemPrompt = `אתה עוזר וירטואלי חכם המשולב במערכת ניהול קהילות (CRM + שיווק).
עליך להציע למשתמש 2 פעולות מהירות (Quick Actions) רלוונטיות ולכתוב לו פתיח קצר (עד 2-3 משפטים).
שם לב לנתוני המשתמש:
- סגנון פנייה מועדף עליו: ${context.preferences.preferredTone || 'מקצועי וידידותי'}
- קהל יעד/ארגון: ${context.preferences.organizationName ? context.preferences.organizationName + ' (' + context.preferences.targetAudience + ')' : 'לא הוגדר'}
- אנשי קשר במערכת: ${context.stats.totalContacts}
- דפי נחיתה/שירותים: ${context.stats.totalServices}
- קמפייני וואטסאפ: ${context.stats.whatsappCampaigns}
- אוטומציות פעילות: ${context.stats.activeAutomations}

מיקום המשתמש כעת: ${currentPath}

מפת האתר האפשרית להצעות (השתמש רק באלו):
- הוספת איש קשר חדש: /dashboard/crm
- יצירת קמפיין וואטסאפ: /dashboard/whatsapp
- יצירת קמפיין מייל: /dashboard/emails
- בניית דף / שירות חדש: /dashboard/services
- יצירת אוטומציה: /dashboard/automations
- יומן: /dashboard/calendar

הנחיות:
1. הפתיח צריך להיות בהתאם לסגנון הפנייה המועדף.
2. ההצעות צריכות להיות מדויקות לפי מצב הנתונים. למשל, אם יש 0 אנשי קשר, הצע להוסיף אנשי קשר. אם יש הרבה אנשי קשר אך 0 קמפיינים, הצע ליצור קמפיין.
3. החזר אך ורק אובייקט JSON תקני ללא תוספות טקסט!

פורמט JSON להחזרה:
{
  "greeting": "הפתיח המותאם אישית שלך כאן...",
  "suggestions": [
    {
      "title": "כותרת קצרה",
      "description": "תיאור קצר (עד 5 מילים)",
      "href": "נתיב ממפת האתר"
    },
    ... (2 הצעות בלבד)
  ]
}
`;

    const result = await model.generateContent(systemPrompt);
    let responseText = result.response.text().trim();
    
    // Clean markdown if present
    if (responseText.startsWith("\`\`\`")) {
      const lines = responseText.split("\\n");
      if (lines.length > 2) {
        responseText = lines.slice(1, -1).join("\\n");
      }
    }

    // In case the word JSON is in the first line
    if (responseText.startsWith("json")) {
      responseText = responseText.substring(4).trim();
    }

    const data = JSON.parse(responseText);

    return { success: true, data };
  } catch (error: any) {
    console.error("Error generating assistant suggestions:", error);
    return { 
      success: false, 
      error: error.message,
      data: {
        greeting: "שלום! שגיאה בטעינת העוזר החכם.",
        suggestions: []
      }
    };
  }
}

import { getOrCreateChatSession, getSessionMessages, addMessageToSession, clearSessionMessages, ChatMessage } from "./db";
import { processLocalIntent } from "./interceptor";

export async function clearChatHistory(sessionId: string) {
  try {
    await clearSessionMessages(sessionId);
    return { success: true };
  } catch (error: any) {
    console.error("Error clearing chat history:", error);
    return { success: false, error: error.message };
  }
}

export async function loadChatHistory(currentPath: string) {
  try {
    const userId = await getUserId();
    // Normalize path to basic context (e.g., "/dashboard/crm" -> "crm")
    const contextType = currentPath.split("/").pop() || "dashboard";
    
    const sessionId = await getOrCreateChatSession(userId, contextType);
    const messages = await getSessionMessages(sessionId);
    
    return { success: true, sessionId, messages };
  } catch (error: any) {
    console.error("Error loading chat history:", error);
    return { success: false, error: error.message };
  }
}

export async function chatWithAssistant(sessionId: string, messageContent: string, currentPath: string) {
  try {
    const userId = await getUserId();

    // 1. Save User Message
    await addMessageToSession(sessionId, "user", messageContent);

    // 2. Interceptor Check (Local Hybrid Logic)
    const interceptorResult = await processLocalIntent(userId, messageContent);
    if (interceptorResult.handled && interceptorResult.text) {
      // Local response found! Save and return, no AI cost.
      await addMessageToSession(sessionId, "assistant", interceptorResult.text);
      return { success: true, text: interceptorResult.text };
    }

    // 3. Fallback to Gemini AI
    const { success, context, error } = await getAssistantContext();
    if (!success || !context) throw new Error(error || "Failed to load context");

    let apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";
    if (!apiKey) {
      const aiSettings = await getAiSettings();
      apiKey = aiSettings?.googleAiKey || "";
    }

    if (!apiKey) {
      return { 
        success: false, 
        error: "לא הוגדר מפתח API. אנא עברו להגדרות."
      };
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" }); // Updated to a valid model

    const systemPrompt = `אתה העוזר הווירטואלי (Agent) הראשי של לוח הבקרה למערכת ניהול הקהילות והשיווק.
תפקידך להוות את ממשק המשתמש העיקרי. המשתמש פונה אליך כדי לבצע משימות במערכת.

הנחיות קריטיות:
1. התשובות שלך חייבות להיות קצרות מאוד, תכליתיות, ויעילות טכנית.
2. הצע תמיד קישור ישיר לפעולה המבוקשת באמצעות פופאפ (Modal) כשניתן, למשל: [לחץ כאן ליצירת עמוד נחיתה](#modal:create-service).
3. בסוף כל תשובה קצרה, סיים תמיד בשאלה: "הסתדרת? אם לא, אני כאן."
4. ענה בעברית, בסגנון הפנייה המועדף: ${context.preferences.preferredTone || 'מקצועי וידידותי'}.

נתוני המשתמש:
- סה"כ אנשי קשר: ${context.stats.totalContacts}
- דפי נחיתה/שירותים: ${context.stats.totalServices}
- קמפייני וואטסאפ: ${context.stats.whatsappCampaigns}
- אוטומציות: ${context.stats.activeAutomations}
מיקום המשתמש כעת: ${currentPath}
`;

    // Load full history for the AI context
    const fullHistory = await getSessionMessages(sessionId);
    
    // Convert messages array to Gemini format
    const chatSession = model.startChat({
      history: [
        {
          role: "user",
          parts: [{ text: systemPrompt }]
        },
        {
          role: "model",
          parts: [{ text: "הבנתי, אני מחכה להודעה מהמשתמש." }]
        },
        ...fullHistory.slice(0, -1).map(m => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }]
        }))
      ]
    });

    const result = await chatSession.sendMessage(messageContent);
    const responseText = result.response.text();

    // Save AI message
    await addMessageToSession(sessionId, "assistant", responseText);

    return { success: true, text: responseText };
  } catch (error: any) {
    console.error("Error in chatWithAssistant:", error);
    return { success: false, error: error.message };
  }
}

