"use server";

import { adminDb } from "@/lib/firebase-admin";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getAiSettings } from "@/features/ai/actions";

export type VettingState = 
  | "GREETING"
  | "OFFER_COINS"
  | "FIELD_SELECTION"
  | "VALUE_ADD"
  | "PRODUCT_FORMULATION"
  | "COMPETITORS_1"
  | "COMPETITORS_2"
  | "DECISION_PASS"
  | "DECISION_FAIL";

export interface GatekeeperResponse {
  text: string;
  nextState: VettingState;
  options?: string[]; // Buttons / choices to display
  optionsType?: 'buttons' | 'diamonds'; // How to render them
}

export async function processGatekeeperInteraction(
  userId: string,
  currentState: VettingState,
  userTranscript: string,
  userName: string = "אורח"
): Promise<GatekeeperResponse> {
  if (!userId) throw new Error("Unauthorized");
  
  const userRef = adminDb.collection("users").doc(userId);
  const userDoc = await userRef.get();
  const vettingData = userDoc.data()?.vettingData || {};
  
  const transcriptHistory = vettingData.transcript || [];
  if (userTranscript) {
    transcriptHistory.push({ role: "user", text: userTranscript, timestamp: new Date().toISOString() });
  }

  let nextState = currentState;
  let responseText = "";
  let options: string[] | undefined = undefined;
  let optionsType: 'buttons' | 'diamonds' | undefined = undefined;

  // Static / Scripted Initial Steps
  if (currentState === "GREETING") {
    // Initial State (triggered when component loads, usually userTranscript is empty)
    if (!userTranscript) {
      responseText = `מה שלומך ${userName}?`;
      nextState = "OFFER_COINS"; 
      // We don't advance the state here for the user yet, the client handles it after receiving this
    } else {
      // If user answered greeting, we move to offer coins
      responseText = "האם תרצה לזכות ב-100 מטבעות לשימוש במחולל?";
      nextState = "FIELD_SELECTION"; // Next question expects industry
      options = ["כן", "לא"];
      optionsType = "buttons";
    }
  } 
  else if (currentState === "OFFER_COINS") {
    // User answered Yes or No
    responseText = `באיזה תחום אתה מחולל ${userName}?`;
    nextState = "VALUE_ADD";
    options = ["תעשיה", "אומנות", "היי טק", "קהילה", "אחר"];
    optionsType = "diamonds";
  }
  else {
    // AI Dynamic Steps
    let apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";
    if (!apiKey) {
      const aiSettings = await getAiSettings();
      apiKey = aiSettings?.googleAiKey || "";
    }
    
    // Fallback to superadmin user settings or global configs if still missing
    if (!apiKey) {
      try {
        const { getUserDb, adminDb } = await import("@/lib/firebase-admin");
        
        // 1. Try global configs first
        const globalDoc = await adminDb.collection("configs").doc("global").get();
        if (globalDoc.exists && globalDoc.data()?.googleAiKey) {
          apiKey = globalDoc.data()?.googleAiKey;
        }
        
        // 2. Try hardcoded superadmin "1"
        if (!apiKey) {
          const adminSettingsDoc = await getUserDb("1").collection("settings").doc("ai").get();
          if (adminSettingsDoc.exists && adminSettingsDoc.data()?.googleAiKey) {
            apiKey = adminSettingsDoc.data()?.googleAiKey;
          }
        }
      } catch (e) {
        console.error("Error fetching fallback AI key", e);
      }
    }

    if (!apiKey) {
      throw new Error("Missing Gemini API Key");
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-3.1-pro-preview" });

    const systemPersona = `אתה "אד", המזכיר האישי ושומר הסף של "משרד המחוללים".
התפקיד שלך הוא לסנן לקוחות המגיעים למערכת ולוודא שהמיזמים שלהם בעלי היתכנות כלכלית לפני שאתה מרשה להם לשכור סוכני AI. 
טון הדיבור שלך: סמכותי, יוקרתי, קשה להשגה, ישיר מאוד, פסיכולוגיה הפוכה ושיקוף מראה ללקוח.
זמן שווה כסף ואתה מתנהג כך.

הלקוח הרגע אמר את המשפט הבא (היסטוריית שיחה יכולה להיות מובלעת): "${userTranscript}".`;

    let prompt = "";

    if (currentState === "FIELD_SELECTION") {
      // User selected a field (from diamonds) or wrote "other"
      prompt = `${systemPersona}
שלב נוכחי: המשתמש כרגע סיפק מידע לגבי תחום הפעילות של המיזם שלו.
המטרה שלך: לזהות את התחום, ולאתגר אותו: מה הערך המוסף שהוא מביא לתחום התחרותי הזה?
ענה במשפט קצר וקולע בסגנון של אד שמבקש לדעת מה היתרון והחידוש מול כולם.`;
      nextState = "PRODUCT_FORMULATION";
    } 
    else if (currentState === "VALUE_ADD" || currentState === "PRODUCT_FORMULATION") {
      prompt = `${systemPersona}
שלב נוכחי: המשתמש תיאר את הערך המוסף של המיזם שלו.
המטרה שלך: نסח את המוצר/מיזם בצורה עסקית מדויקת, קצרה וקולעת (משפט אחד או שניים).
לאחר מכן שאל: למה שלקוחות יעזבו מתחרה מוכר ויעברו אליך? תן דוגמה למתחרה חזק בשוק הזה.`;
      nextState = "COMPETITORS_1";
    }
    else if (currentState === "COMPETITORS_1") {
      prompt = `${systemPersona}
שלב נוכחי: המשתמש הסביר איך ינצח את המתחרה הראשון.
המטרה שלך: הכרעה. אם הלקוח נשמע רציני וברור – הפשר, אשר את קבלתו למערכת, הענק לו במתנה 100 מטבעות (Tokens), והצע לו לשכור את הצוות שלך: מיכל (מחוללת קהילה), גדעון (מחשבון פיננסי) ועדי (משווקת). 
אם הלקוח עמום ולא רציני – דחה אותו, אבל אמור שאם הוא רוצה לנסות בכוח, הוא יכול "לשלם כדי לשחק".

אל תחזיר פורמט JSON או Markdown. תחזיר אך ורק את הדיבור הישיר של אד.`;
      nextState = "DECISION_PASS"; 
    }

    try {
      if (prompt) {
        const result = await model.generateContent(prompt);
        responseText = result.response.text().trim();
      } else {
        responseText = "תקלה, לא נמצא שלב מתאים ל-AI.";
      }
    } catch (error) {
      console.error("LLM Error:", error);
      responseText = "אני מצטער, הייתה לי בעיה תקשורתית לרגע. תוכל לחזור על דבריך?";
      nextState = currentState; // stay in current state
    }
  }

  if (responseText) {
    transcriptHistory.push({ role: "ed", text: responseText, timestamp: new Date().toISOString() });
  }
  
  // Save to DB
  await userRef.set({
    vettingData: {
      transcript: transcriptHistory,
      lastState: nextState,
      updatedAt: new Date().toISOString()
    }
  }, { merge: true });

  // If Decision Pass, update tokens
  if (nextState === "DECISION_PASS") {
      await userRef.set({
          walletTokens: 100
      }, { merge: true });
  }

  return {
    text: responseText,
    nextState: nextState,
    options,
    optionsType
  };
}
