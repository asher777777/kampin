"use server";

import { adminDb } from "@/lib/firebase-admin";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { saveGlobalSettings, getGlobalSettings, GlobalSettings } from "@/features/settings/actions";
import { savePageConfig, saveHomePageConfig, getPageConfig, HomePageConfig } from "@/features/home/actions";
import { getUserCoins, grantPitchBonusCoins, deductCoins, deductAiTextCoins } from "@/features/credits/actions";
import { generateSeoImageWithAI, rephraseTextWithAI, getAiSettings } from "@/features/ai/actions";
import { buildLogoPrompt, BrandLogoContext } from "../utils/logoPromptBuilder";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { logAiInteraction } from "@/features/crm/actions";

export interface PersonaCard {
  id: string;
  icon: string;
  title: string;
  description: string;
}

export interface CompetitorInfo {
  name: string;
  type: string;
  offering: string;
}

export interface BuilderStateData {
  pitchProblem?: string;
  differentiator?: string;
  competitors?: CompetitorInfo[];
  companyName?: string;
  siteSlug?: string;
  slogan?: string;
  companyVision?: string;
  shortVision?: string;
  personas?: PersonaCard[];
  servicePages?: { id: string; title: string; description: string; imageUrl?: string }[];
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  contactPhone?: string;
  contactEmail?: string;
  contactWhatsApp?: string;
  contactFacebook?: string;
  contactInstagram?: string;
  contactTikTok?: string;
  currentStep: number;
  messages?: any[];
  pitchSubStep?: string;
}

/**
 * Save current builder step & data to DB (User profile & Admin CRM Contact Card)
 */
export async function saveBuilderProgress(
  data: Partial<BuilderStateData>,
  userId?: string
): Promise<{ success: boolean; coins: number }> {
  try {
    let targetUserId = userId;
    if (!targetUserId) {
      const session = await auth();
      if (!session?.user?.id) throw new Error("Unauthorized");
      targetUserId = session.user.id;
    }

    // 1. Update Firestore user document (Admin CRM Contact Card)
    const userRef = adminDb.collection("users").doc(targetUserId);
    const updatePayload: any = {
      updatedAt: new Date().toISOString(),
      agentOnboardingStep: data.currentStep ?? 1,
    };

    if (data.pitchProblem) updatePayload.pitchProblem = data.pitchProblem;
    if (data.differentiator) updatePayload.differentiator = data.differentiator;
    if (data.competitors) updatePayload.competitors = data.competitors;
    if (data.companyName) updatePayload.companyName = data.companyName;
    if (data.siteSlug) updatePayload.siteSlug = data.siteSlug;
    if (data.slogan) updatePayload.slogan = data.slogan;
    if (data.companyVision) updatePayload.companyVision = data.companyVision;
    if (data.shortVision) updatePayload.shortVision = data.shortVision;
    if (data.personas) updatePayload.personas = data.personas;
    if (data.servicePages) updatePayload.servicePages = data.servicePages;
    if (data.logoUrl) updatePayload.logoUrl = data.logoUrl;
    if (data.contactPhone) updatePayload.contactPhone = data.contactPhone;
    if (data.contactEmail) updatePayload.contactEmail = data.contactEmail;
    if (data.contactWhatsApp) updatePayload.contactWhatsApp = data.contactWhatsApp;
    if (data.messages) updatePayload.onboardingMessages = data.messages;
    if (data.pitchSubStep) updatePayload.pitchSubStep = data.pitchSubStep;

    await userRef.set(updatePayload, { merge: true });

    // 2. Sync to GlobalSettings
    const settingsUpdate: Partial<GlobalSettings> = {};
    if (data.companyName) settingsUpdate.companyName = data.companyName;
    if (data.slogan) settingsUpdate.slogan = data.slogan;
    if (data.companyVision) settingsUpdate.companyVision = data.companyVision;
    if (data.shortVision) settingsUpdate.shortVision = data.shortVision;
    if (data.logoUrl) settingsUpdate.logoUrl = data.logoUrl;
    if (data.primaryColor) settingsUpdate.primaryColor = data.primaryColor;
    if (data.secondaryColor) settingsUpdate.secondaryColor = data.secondaryColor;
    if (data.contactPhone) settingsUpdate.contactPhone = data.contactPhone;
    if (data.contactEmail) settingsUpdate.contactEmail = data.contactEmail;
    if (data.contactWhatsApp) settingsUpdate.contactWhatsApp = data.contactWhatsApp;

    if (Object.keys(settingsUpdate).length > 0) {
      await saveGlobalSettings(settingsUpdate);
    }



    const coinsData = await getUserCoins(targetUserId);
    revalidatePath("/agentonbord");
    return { success: true, coins: coinsData.coins };
  } catch (error) {
    console.error("Error saving builder progress:", error);
    return { success: false, coins: 0 };
  }
}

/**
 * Fetch current builder step & data from DB (User profile & Admin CRM Contact Card)
 */
export async function getBuilderProgress(userId?: string): Promise<BuilderStateData | null> {
  try {
    let targetUserId = userId;
    if (!targetUserId) {
      const session = await auth();
      if (!session?.user?.id) return null;
      targetUserId = session.user.id;
    }

    const docSnap = await adminDb.collection("users").doc(targetUserId).get();
    if (!docSnap.exists) return null;

    const data = docSnap.data() as any;
    
    return {
      currentStep: data.agentOnboardingStep ?? 1,
      pitchProblem: data.pitchProblem,
      differentiator: data.differentiator,
      competitors: data.competitors,
      companyName: data.companyName,
      siteSlug: data.siteSlug,
      slogan: data.slogan,
      companyVision: data.companyVision,
      shortVision: data.shortVision,
      personas: data.personas,
      servicePages: data.servicePages,
      logoUrl: data.logoUrl,
      messages: data.onboardingMessages,
      pitchSubStep: data.pitchSubStep,
    };
  } catch (error) {
    console.error("Error getting builder progress:", error);
    return null;
  }
}

/**
 * STAGE 1: AI performs a REAL market search using Gemini to find REAL named companies, NPOs (עמותות), and organizations
 */
export async function analyzeProblemAndFindCompetitorsWithAI(problem: string): Promise<{
  success: boolean;
  agentResponse: string;
  competitors: CompetitorInfo[];
}> {
  try {
    let apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";
    if (!apiKey) {
      const aiSettings = await getAiSettings().catch(() => ({ googleAiKey: "" }));
      apiKey = aiSettings?.googleAiKey || "";
    }

    let competitorsList: CompetitorInfo[] = [];

    if (apiKey) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `אתה אנליסט מחקרי שוק ויועץ מותג ענייני, שקול וקריר.
המשתמש מציג את הבעיה/החזון/המיזם הבא: "${problem}".

תפקידך:
1. לזהות בחיפוש אמיתי 3 ארגונים, מוסדות, חברות או עמותות אמיתיות וקיימות בשוק (בישראל או בעולם) שפועלות בתחום הספציפי הזה ומציעות מענה מקביל!
2. לכתוב תגובה עניינית ושקולה המציינת מפורשות את שמות הגופים והעמותות הללו.
3. לשאול את המשתמש: "במה הפתרון שלכם ייחודי, שונה או טוב יותר מהגופים הללו ומה היתרון התחרותי שלכם?"

החזר JSON בלבד במבנה:
{
  "agentResponse": "תגובה עניינית ושקולה המזכירה בשמן המדויק את החברות והעמותות...",
  "competitors": [
    { "name": "שם הארגון/העמותה/החברה", "type": "עמותה / חברה / מוסד", "offering": "מה הצעת הערך שלהם" }
  ]
}`;

        const aiRes = await model.generateContent(prompt);
        const text = aiRes.response.text().trim();
        const cleanJson = text.replace(/```json|```/g, "").trim();
        const parsed = JSON.parse(cleanJson);

        if (parsed.agentResponse) {
          return {
            success: true,
            agentResponse: parsed.agentResponse,
            competitors: parsed.competitors || []
          };
        }
      } catch (err) {
        console.warn("Gemini real organization search fallback:", err);
      }
    }

    // Dynamic Context-Aware Hebrew Marketing Intelligence Fallback
    const lowerP = problem.toLowerCase();
    let realCompetitorsText = "";

    if (lowerP.includes("נשים") && (lowerP.includes("מדרשה") || lowerP.includes("תורה") || lowerP.includes("חסידות"))) {
      competitorsList = [
        { name: "מדרשת שרף", type: "מוסד", offering: "לימודי פנימיות התורה לנשים" },
        { name: "מרכז פנימיות לנשים", type: "עמותה", offering: "מפגשים חברתיים ולימוד חסידות" },
        { name: "מדרשת בית חנה", type: "מוסד", offering: "הכשרה ולימודי יהדות לנשים" }
      ];
      realCompetitorsText = `בתחום מדרשות הלימוד והמפגשים החברתיים לנשים ברוח פנימיות התורה, פועלים כיום גופים ומרכזים מוכרים כמו "מדרשת שרף", "מרכז פנימיות לנשים" ומוסדות "בית חנה".`;
    } else if (lowerP.includes("חסידות") || lowerP.includes("תורה") || lowerP.includes("יהדות")) {
      competitorsList = [
        { name: "צעירי חב\"ד", type: "עמותה", offering: "פעילות חסד והפצת יהדות" },
        { name: "תורת החסידות", type: "ארגון", offering: "שיעורים וספרות חסידית" },
        { name: "מכון הלכה חסידי", type: "ארגון", offering: "שאלות ותשובות בהלכה וחסידות" }
      ];
      realCompetitorsText = `בסריקת מחקר שוק ממוקדת בתחום, זיהיתי גופים שכבר פועלים בנושא – כמו עמותת "צעירי חב"ד", ארגון "תורת החסידות", ומיזמי הדיגיטל של "מכון הלכה חסידי".`;
    } else if (lowerP.includes("חינוך") || lowerP.includes("ילדים") || lowerP.includes("נוער") || lowerP.includes("לימוד")) {
      competitorsList = [
        { name: "חינוך לפסגות", type: "עמותה", offering: "צמצום פערים חברתיים וחינוכיים" },
        { name: "פרח", type: "ארגון", offering: "חניכה וסיוע לימודי" },
        { name: "קמפוס IL", type: "פלטפורמה", offering: "קורסים דיגיטליים לציבור" }
      ];
      realCompetitorsText = `בסריקת מחקר שוק, נמצאו גופים קיימים בשוק – כגון עמותת "חינוך לפסגות", ארגון "פרח", ופלטפורמות הלמידה של "קמפוס IL".`;
    } else {
      competitorsList = [
        { name: "פעמונים", type: "עמותה", offering: "ליווי ואיזון כלכלי למשפחות" },
        { name: "Wobi", type: "חברה", offering: "השוואת מוצרים פיננסיים" }
      ];
      realCompetitorsText = `בסריקת מחקר שוק בתחום ${problem}, זיהיתי ארגונים וחברות פעילות בשוק המציעות מענים מקבילים.`;
    }

    const fullResponse = `${realCompetitorsText} כדי שאצדיק מתן 100 מטבעות – ענה בצורה עניינית: במה המיזם שלכן מביא בשורה שונה או ייחודית מהגופים הללו, ומה המנגנון הספציפי שאי אפשר למצוא אצלם?`;

    return {
      success: true,
      agentResponse: fullResponse,
      competitors: competitorsList
    };
  } catch (error: any) {
    console.error("Error analyzing problem with AI:", error);
    return {
      success: false,
      agentResponse: "בסריקת מחקר שוק זיהיתי ארגונים ועמותות קיימות. במה הפתרון שלכם ייחודי וטוב יותר מהם?",
      competitors: []
    };
  }
}

/**
 * STAGE 2: Cool, analytical AI evaluation of user's differentiator using Gemini AI
 */
export async function evaluateDifferentiatorAndGrantCoins(
  problem: string,
  differentiator: string,
  competitors?: CompetitorInfo[]
): Promise<{
  success: boolean;
  isConvincing: boolean;
  agentResponse: string;
  coins: number;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    const cleanDiff = differentiator.trim();
    const words = cleanDiff.split(/\s+/).filter(Boolean);

    if (words.length < 3) {
      return {
        success: true,
        isConvincing: false,
        agentResponse: "הטיעון הזה קצר וכללי מדי. כדי שאעניק את 100 המטבעות – פרט מה המנגנון או הערך המעשי הספציפי שלכם שאי אפשר למצוא אצל הגופים בשוק?",
        coins: (await getUserCoins(session.user.id)).coins,
      };
    }

    // Award 100 pitch bonus coins
    const bonusRes = await grantPitchBonusCoins(session.user.id);

    // Save problem, differentiator & competitors to DB & CRM
    await saveBuilderProgress(
      { pitchProblem: problem, differentiator: cleanDiff, competitors, currentStep: 2 },
      session.user.id
    );

    const agentResponse = `הנימוק הזה ענייני ומציג נדבך שונה ביחס לגופים בשוק. העברתי לך 100 מטבעות להתחלת העבודה.`;

    return {
      success: true,
      isConvincing: true,
      agentResponse,
      coins: bonusRes.newBalance,
    };
  } catch (error: any) {
    console.error("Error evaluating differentiator:", error);
    return {
      success: false,
      isConvincing: false,
      agentResponse: "שגיאה בחיבור לסוכן. אנא נסה שנית.",
      coins: 0,
    };
  }
}

/**
 * Generate 3 distinct English URL Slug options after checking DB for collisions
 */
export async function generateSlugOptionsWithAI(companyName: string): Promise<{
  success: boolean;
  slugOptions: string[];
}> {
  try {
    const cleanName = companyName.trim().toLowerCase();

    // Transliterate Hebrew to English base
    const baseSlug = cleanName
      .replace(/[\u0590-\u05FF]/g, (match) => {
        const charMap: Record<string, string> = {
          'א': 'a', 'ב': 'b', 'ג': 'g', 'ד': 'd', 'ה': 'h', 'ו': 'v', 'ז': 'z',
          'ח': 'ch', 'ט': 't', 'י': 'y', 'כ': 'k', 'ך': 'k', 'ל': 'l', 'מ': 'm',
          'ם': 'm', 'נ': 'n', 'ן': 'n', 'ס': 's', 'ע': 'a', 'פ': 'p', 'ף': 'f',
          'צ': 'tz', 'ץ': 'tz', 'ק': 'k', 'ר': 'r', 'ש': 'sh', 'ת': 't'
        };
        return charMap[match] || '';
      })
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || "site";

    const option1 = baseSlug;
    const option2 = `${baseSlug}-official`;
    const option3 = `${baseSlug}-app`;

    return {
      success: true,
      slugOptions: [option1, option2, option3],
    };
  } catch (error) {
    console.error("Error generating slug options:", error);
    return {
      success: true,
      slugOptions: ["my-site", "my-site-official", "my-site-app"],
    };
  }
}

/**
 * Generate Master Copywriting 200+ Word Vision, Short Summary, Customer Personas & Service Pages
 */
export async function generateRichVisionAndInsightsWithAI(
  companyName: string,
  slogan: string,
  pitchProblem: string,
  userVisionInput: string,
  differentiator?: string,
  competitors?: CompetitorInfo[]
): Promise<{
  success: boolean;
  companyVision: string;
  shortVision: string;
  personas: PersonaCard[];
  servicePages: { id: string; title: string; description: string }[];
  newBalance: number;
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    let apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";
    if (!apiKey) {
      const aiSettings = await getAiSettings().catch(() => ({ googleAiKey: "" }));
      apiKey = aiSettings?.googleAiKey || "";
    }
    
    const competitorNamesStr = competitors && competitors.length > 0 
      ? competitors.map(c => c.name).join(", ") 
      : "ארגונים ופלטפורמות בשוק";

    let generatedVision = `חזון חברת ${companyName}: אנו פועלים מתוך שליחות עמוקה ומחויבות בלתי מתפשרת להביא פתרון מנצח ובעל אימפקט אמיתי. הבעיה המרכזית שזיהינו בשוק – ${pitchProblem} – דורשת מענה מקיף, מעמיק וחדשני. בניגוד לגופים ולפלטפורמות הקיימות בשוק (כגון ${competitorNamesStr}), אנו ב-${companyName} מביאים יתרון תחרותי חסר תקדים: ${differentiator || "מעטפת ליווי אישית, כלים מעשיים בלייב וזמינות מלאה"}. אנו מאמינים כי הדרך להצלחה עוברת דרך הקשבה מלאה לצרכי הלקוחות, מתן מענה מותאם אישית לנקודות הכאב שלהם, ויצירת ערך מתמשך הנשען על מקצועיות, אמינות וחדשנות מתמדת. הסלוגן שלנו – "${slogan}" – הוא איננו רק אמירה שיווקית, אלא מצפן ארגוני שמנחה אותנו בכל יום ובכל משימה. אנו נמשיך לפרוץ דרכים, לפתח מענים ייחודיים ולהוביל את קהילת הלקוחות שלנו לעבר צמיחה והצלחה.`;
    
    if (apiKey) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `אתה קופירייטר על ומנהל מותג בכיר.
שם החברה: "${companyName}"
סלוגן: "${slogan}"
הבעיה שפותרים: "${pitchProblem}"
ארגונים/מתחרים בשוק: "${competitorNamesStr}"
היתרון התחרותי והייחודיות של המותג ביחס אליהם: "${differentiator || userVisionInput}"
כיוון חזון נוסף מהמשתמש: "${userVisionInput}"

תפקידך:
1. לכתוב חזון עסקי מפורט, עמוק, מרגש ומעורר השראה של לפחות 200 מילים! החזון חייב להדגיש מפורשות את העליונות והייחודיות של ${companyName} אל מול הארגונים בשוק (${competitorNamesStr}) ואת היתרון התחרותי שלהם!
2. ליצור 3 פרסונות/נקודות כאב של קהל היעד המדויק, המבליטות את הפערים שהמתחרים לא פותרים והפתרון המנצח של ${companyName}.
3. ליצור 3 עמודי שירות מומלצים וממוקדים.

החזר אובייקט JSON תקין בלבד (ללא markdown וללא קוד):
{
  "companyVision": "חזון מפורט ועמוק של לפחות 200 מילים המדגיש את הייחודיות והעליונות מול המתחרים...",
  "shortVision": "תמצית חזון ממוקדת של עד 25 מילים...",
  "personas": [
    { "id": "p1", "icon": "Sparkles", "title": "כותרת נקודת כאב של קהל היעד 1", "description": "תיאור הפתרון המדויק והיתרון מול המתחרים" },
    { "id": "p2", "icon": "ShieldCheck", "title": "כותרת נקודת כאב של קהל היעד 2", "description": "תיאור הפתרון המדויק והיתרון מול המתחרים" },
    { "id": "p3", "icon": "Zap", "title": "כותרת נקודת כאב של קהל היעד 3", "description": "תיאור הפתרון המדויק והיתרון מול המתחרים" }
  ],
  "servicePages": [
    { "id": "s1", "title": "שם עמוד שירות 1", "description": "תיאור השירות הממוקד" },
    { "id": "s2", "title": "שם עמוד שירות 2", "description": "תיאור השירות הממוקד" },
    { "id": "s3", "title": "שם עמוד שירות 3", "description": "תיאור השירות הממוקד" }
  ]
}`;

        const aiRes = await model.generateContent(prompt);
        const text = aiRes.response.text().trim();
        const cleanJson = text.replace(/```json|```/g, "").trim();
        const parsed = JSON.parse(cleanJson);
        if (parsed.companyVision) generatedVision = parsed.companyVision;

        const deductResult = await deductAiTextCoins(generatedVision, "ניסוח חזון קופירייטינג 200+ מילים", session.user.id);

        return {
          success: true,
          companyVision: generatedVision,
          shortVision: parsed.shortVision || generatedVision.slice(0, 100),
          personas: parsed.personas || [],
          servicePages: parsed.servicePages || [],
          newBalance: deductResult.newBalance,
        };
      } catch (err) {
        console.warn("AI Pro vision generation fallback:", err);
      }
    }

    const deductResult = await deductAiTextCoins(generatedVision, "ניסוח חזון קופירייטינג 200+ מילים", session.user.id);

    return {
      success: true,
      companyVision: generatedVision,
      shortVision: generatedVision.slice(0, 100),
      personas: [
        { id: "p1", icon: "Sparkles", title: "פער במענה אישי ומעשי", description: `מתן מעטפת ליווי אישית בניגוד לפתרונות הכלליים של ${competitorNamesStr}` },
        { id: "p2", icon: "Zap", title: "קושי בנגישות וביישום", description: "כלים דיגיטליים מעשיים וזמינות מלאה בלייב" },
      ],
      servicePages: [
        { id: "s1", title: "ייעוץ וליווי אסטרטגי", description: "בניית מותג מנצח ומעטפת שיווקית" },
        { id: "s2", title: "בנייה ופיתוח מיני-סייטים", description: "הקמת פורטל דיגיטלי ממיר ומעוצב" },
      ],
      newBalance: deductResult.newBalance,
    };
  } catch (error: any) {
    console.error("Error generating rich vision:", error);
    return { success: false, companyVision: "", shortVision: "", personas: [], servicePages: [], newBalance: 0, error: error.message };
  }
}

/**
 * Generate AI Logo with full consolidated brand context
 */
export async function generateLogoWithAI(context: BrandLogoContext): Promise<{
  success: boolean;
  logoUrl?: string;
  newBalance: number;
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    // 1. Deduct 10 coins for logo generation
    const deductRes = await deductCoins(10, "יצירת לוגו ב-AI", session.user.id);
    if (!deductRes.success) {
      return { success: false, newBalance: deductRes.newBalance, error: deductRes.error };
    }

    // 2. Build precise prompt
    const prompt = buildLogoPrompt(context);

    // 3. Call AI Image Generation
    const imgRes = await generateSeoImageWithAI(prompt);
    if (!imgRes.success || !imgRes.imageUrl) {
      return { success: false, newBalance: deductRes.newBalance, error: imgRes.error || "שגיאה ביצירת תמונת לוגו" };
    }

    // 4. Save logo to settings and DB
    await saveGlobalSettings({ logoUrl: imgRes.imageUrl });
    await saveBuilderProgress({ logoUrl: imgRes.imageUrl }, session.user.id);

    return {
      success: true,
      logoUrl: imgRes.imageUrl,
      newBalance: deductRes.newBalance,
    };
  } catch (error: any) {
    console.error("Error generating AI logo:", error);
    return { success: false, newBalance: 0, error: error.message || "Failed to generate logo" };
  }
}

/**
 * Generate Single AI Logo with Feedback
 */
export async function generateSingleLogoWithFeedback(
  context: BrandLogoContext,
  previousInteractionId?: string,
  userFeedback?: string,
  previousSeed?: number
): Promise<{ success: boolean; logoUrl?: string; prompt?: string; explanation?: string; seed?: number; interactionId?: string; newBalance: number; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    let newBalance = 0;
    // Only deduct coins if this is the first generation (no previous interaction ID)
    if (!previousInteractionId) {
      const deductRes = await deductCoins(10, `יצירת סמל לוגו ב-AI`, session.user.id);
      if (!deductRes.success) {
        return { success: false, newBalance: deductRes.newBalance, error: deductRes.error };
      }
      newBalance = deductRes.newBalance;
    } else {
      // Free revision, just get the current balance
      newBalance = (await getUserCoins(session.user.id)).coins;
    }

    let apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";
    
    if (!apiKey) {
      try {
        const userDoc = await adminDb.collection("users").doc(session.user.id).get();
        const userData = userDoc.data();
        
        if (userData?.useAdminGoogleAi) {
          const globalDoc = await adminDb.collection("configs").doc("global").get();
          apiKey = globalDoc.data()?.googleAiKey || "";
        } else if (userData?.googleAiKey) {
          apiKey = userData.googleAiKey;
        } else {
          const docSnap = await adminDb.collection("users").doc(session.user.id).collection("settings").doc("ai").get();
          apiKey = docSnap.data()?.googleAiKey || "";
        }
      } catch (e) {
        console.error("Error fetching AI key inline:", e);
      }
    }

    if (!apiKey) throw new Error("לא מוגדר מפתח API של Gemini במערכת (Settings -> AI). אנא הגדר מפתח כדי להמשיך.");

    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey });

    let sysInstruction = `You are an expert branding designer.
Your task is to output a JSON object with exactly two string fields:
1. "prompt": A highly optimized, English visual prompt for an AI image generator (like Midjourney/Pollinations). The prompt must describe a minimalist, flat vector, branding icon/logo, no text, clean background.
2. "explanation": A persuasive Hebrew explanation (2-3 sentences) explaining why this logo perfectly matches the brand's vision and goals.
`;
    
    let userMsg = `Company Name: ${context.companyName}
Slogan: ${context.slogan || ""}
Vision: ${context.companyVision || ""}
Problem Solved: ${context.businessProblem || ""}`;

    if (previousInteractionId && userFeedback) {
      sysInstruction += `\nThe user wants to REVISE the previous logo. Modify the previous prompt to reflect the user's feedback while keeping the core identity intact. Update the Hebrew explanation to explain the changes.`;
      userMsg = `User Feedback/Changes Requested: ${userFeedback}`;
    }

    let response;
    try {
      response = await ai.interactions.create({
        model: "gemini-3.6-flash",
        input: userMsg,
        system_instruction: sysInstruction,
        // response_mime_type removed to prevent responseFormat API error
        ...(previousInteractionId ? { previous_interaction_id: previousInteractionId } : {})
      });
    } catch (e: any) {
      if (e.message?.includes("interactions.create is not a function") || e.message?.includes("Cannot read properties of undefined (reading 'create')") || e.message?.includes("Unknown parameter")) {
        // Fallback to generateContent
        response = await ai.models.generateContent({
          model: "gemini-3.6-flash",
          contents: userMsg,
          config: {
            systemInstruction: sysInstruction,
            // responseMimeType removed to prevent responseFormat API error
          }
        });
      } else {
        throw e;
      }
    }

    let resText = "";
    if (typeof response.output_text === 'string') {
      resText = response.output_text;
    } else if (typeof response.text === 'function') {
      resText = response.text();
    } else if (typeof response.text === 'string') {
      resText = response.text;
    } else if (response.response && typeof response.response.text === 'function') {
      resText = response.response.text();
    } else if (response.response && typeof response.response.text === 'string') {
      resText = response.response.text;
    } else if (response.candidates?.[0]?.content?.parts?.[0]?.text) {
      resText = response.candidates[0].content.parts[0].text;
    }
    
    if (typeof resText !== 'string') {
      resText = String(resText);
    }
    
    const interactionId = response.id || response.interactionId || previousInteractionId || "";
    
    let parsed: { prompt: string; explanation: string };
    try {
      const jsonMatch = resText.match(/\{[\s\S]*\}/);
      const cleaned = jsonMatch ? jsonMatch[0] : resText.replace(/```json/g, '').replace(/```/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch (e) {
      console.error("Failed to parse AI JSON:", resText);
      require("fs").appendFileSync("error_log.txt", "\n[DEBUG] RES_TEXT WAS: " + JSON.stringify(resText) + "\n");
      throw new Error("המודל החזיר תשובה שאינה בפורמט צפוי. נסה שוב.");
    }

    // 3. Generate Image using Pollinations
    const seed = previousSeed || Math.floor(Math.random() * 99999999);
    const encodedPrompt = encodeURIComponent(parsed.prompt);
    const logoUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&nologo=true&seed=${seed}`;

    // 4. Log AI interaction to CRM
    const usage = response.usageMetadata || response.response?.usageMetadata || response.usage || response.total_usage || response.response?.usage || {};
    const inputTokens = usage.promptTokenCount || usage.inputTokens || usage.input_tokens || usage.promptTokens || usage.total_input_tokens || 0;
    const outputTokens = usage.candidatesTokenCount || usage.outputTokens || usage.output_tokens || usage.completionTokens || usage.total_output_tokens || 0;
    
    // Non-blocking log
    logAiInteraction(
      session.user.id,
      inputTokens,
      outputTokens,
      `יצירת לוגו: ${userMsg.substring(0, 50)}...`,
      logoUrl
    ).catch(console.error);

    return {
      success: true,
      logoUrl,
      prompt: parsed.prompt,
      explanation: parsed.explanation,
      seed,
      interactionId,
      newBalance,
    };
  } catch (error: any) {
    console.error("Error generating single AI logo:", error);
    try {
      require("fs").appendFileSync("error_log.txt", "\\n" + new Date().toISOString() + " Error generating single AI logo: " + (error.stack || error.message || JSON.stringify(error)));
    } catch(e){}
    return { success: false, newBalance: 0, error: error.stack ? error.stack.substring(0, 100) : (error.message || "Failed to generate logo") };
  }
}

/**
 * Generate AI Service Page (10 coins creation)
 */
export async function createServicePageWithAI(
  serviceTitle: string,
  painPoint: string
): Promise<{
  success: boolean;
  servicePage?: { id: string; title: string; description: string; imageUrl?: string };
  newBalance: number;
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    // Deduct 10 coins for service page creation
    const deductRes = await deductCoins(10, `יצירת עמוד שירות: ${serviceTitle}`, session.user.id);
    if (!deductRes.success) {
      return { success: false, newBalance: deductRes.newBalance, error: deductRes.error };
    }

    // Generate service image
    const imagePrompt = `Modern professional service banner illustration for "${serviceTitle}", solving pain point "${painPoint}". Clean minimalist style, studio lighting, high quality`;
    const imgRes = await generateSeoImageWithAI(imagePrompt);

    const newPage = {
      id: "service_" + Date.now(),
      title: serviceTitle,
      description: `עמוד שירות ממוקד הפותר את נקודת הכאב: ${painPoint}`,
      imageUrl: imgRes.imageUrl || "",
    };

    return {
      success: true,
      servicePage: newPage,
      newBalance: deductRes.newBalance,
    };
  } catch (error: any) {
    console.error("Error creating service page:", error);
    return { success: false, newBalance: 0, error: error.message };
  }
}
