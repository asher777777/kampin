"use server";

import { adminDb } from "@/lib/firebase-admin";
import { auth } from "@/lib/auth";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getAiSettings } from "@/features/ai/actions";
import { WbsTask, SmartGoals, ValidatorResult, ProjectData, RiskItem, ProjectBaseline, RoleRequirement, ChangeRequest, WarRoomMessage } from "./types";
import { Contact } from "@/features/crm/types";
import { revalidatePath } from "next/cache";

// Helper to get Google Generative AI client
async function getGenAIClient(): Promise<GoogleGenerativeAI> {
  let apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";
  if (!apiKey) {
    const aiSettings = await getAiSettings();
    apiKey = aiSettings?.googleAiKey || "";
  }
  if (!apiKey) {
    throw new Error("מפתח ה-API של Gemini אינו מוגדר. אנא הגדר אותו בהגדרות המערכת.");
  }
  return new GoogleGenerativeAI(apiKey);
}

// 1. Speech-to-Text using Gemini Audio capabilities
export async function speechToText(audioBlobBase64: string, mimeType: string = "audio/webm"): Promise<{ success: boolean; text?: string; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "לא מורשה - יש להתחבר למערכת" };

    const genAI = await getGenAIClient();
    const model = genAI.getGenerativeModel({ model: "gemini-3.1-pro-preview" });

    const response = await model.generateContent([
      {
        inlineData: {
          mimeType: mimeType,
          data: audioBlobBase64
        }
      },
      "תמלל את ההקלטה הבאה לעברית תקנית. תמלל רק את מה שנאמר בהקלטה עצמה, ללא הקדמות, ללא הסברים, וללא הערות שוליים."
    ]);

    const transcribedText = response.response.text().trim();
    return { success: true, text: transcribedText };
  } catch (error: any) {
    console.error("Error in speechToText:", error);
    return { success: false, error: error.message || "שגיאה בפענוח ההקלטה הקולית" };
  }
}

// 2. Generate SMART Goals from prompt and/or document upload
export async function generateSmartGoals(input: { text?: string; fileBase64?: string; fileType?: string }): Promise<{ success: boolean; data?: SmartGoals; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "לא מורשה - יש להתחבר למערכת" };

    const genAI = await getGenAIClient();
    const model = genAI.getGenerativeModel({ model: "gemini-3.1-pro-preview" });

    const userPrompt = input.text || "רעיון לפרויקט חדש";

    const prompt = `אתה עוזר בינה מלאכותית מומחה לניהול פרויקטים במגזר השלישי ובארגונים קהילתיים.
תפקידך לנתח את הרעיון הגולמי לפרויקט (ואת המסמך המצורף אם ישנו) ולזקק אותו ליעדים חדים ומדידים במודל SMART מוקפד בעברית תקנית.

מבנה יעדי ה-SMART הנדרש:
- S (Specific / ספציפי): הגדרת תוצר ספציפי ומדויק שהפרויקט יפיק.
- M (Measurable / מדיד): הגדרת מדדי הצלחה כמותיים (KPIs), למשל מספר משתתפים, תקציב או כמות דוכנים.
- A (Achievable / בר-השגה): הסבר מדוע היעד הוא ריאלי ובר-השגה בהתחשב באופי הקהילתי/ארגוני.
- R (Relevant / רלוונטי): חיבור היעד למטרות העל ולחזון של הארגון או הקהילה (למשל, חיזוק קשרים קהילתיים, תמיכה בנזקקים).
- T (Time-bound / תחום בזמן): הגדרת לוח זמנים או דד-ליין קשיח להשלמת הפרויקט.

החזר את התשובה אך ורק במבנה JSON הבא:
{
  "s": "...",
  "m": "...",
  "a": "...",
  "r": "...",
  "t": "..."
}

רעיון המנהל:
"${userPrompt}"`;

    const contents: any[] = [];
    if (input.fileBase64 && input.fileType) {
      contents.push({
        inlineData: {
          mimeType: input.fileType,
          data: input.fileBase64
        }
      });
    }
    contents.push(prompt);

    const result = await model.generateContent({
      contents: [{ role: "user", parts: contents.map(c => typeof c === 'string' ? { text: c } : c) }],
      generationConfig: {
        // responseMimeType: "application/json"
      }
    });

    const responseText = result.response.text();
    const parsedData = JSON.parse(responseText) as SmartGoals;

    return { success: true, data: parsedData };
  } catch (error: any) {
    console.error("Error in generateSmartGoals:", error);
    return { success: false, error: error.message || "שגיאה ביצירת יעדי SMART" };
  }
}

// 3. Needs Validation, Estimation and Risk Analysis (The Validator)
export async function validateProjectNeeds(input: { title: string; smartGoals: SmartGoals; type: "new" | "recurring" }): Promise<{ success: boolean; data?: ValidatorResult; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "לא מורשה - יש להתחבר למערכת" };

    const genAI = await getGenAIClient();
    const model = genAI.getGenerativeModel({ model: "gemini-3.1-pro-preview" });

    // Fetch up to 10 historical projects from Firestore for this user to pass as organizational context
    let historicalProjectsContext = "אין פרויקטים קודמים זמינים בארגון לצורך השוואה.";
    try {
      const projectsSnapshot = await adminDb.collection("projects").where("userId", "==", session.user.id).limit(10).get();
      if (!projectsSnapshot.empty) {
        const projList = projectsSnapshot.docs.map(doc => {
          const d = doc.data();
          return {
            name: d.name,
            budget: d.charter?.lockedBudget || d.metrics?.budget || "לא ידוע",
            durationDays: d.charter?.durationDays || d.metrics?.deadlineDays || "לא ידוע"
          };
        });
        historicalProjectsContext = `פרויקטים קודמים שהושלמו בארגון:\n${JSON.stringify(projList, null, 2)}`;
      }
    } catch (dbErr) {
      console.warn("Could not load historical projects context:", dbErr);
    }

    const prompt = `אתה רכיב ה-Validator (המאמת) במערכת ניהול פרויקטים קהילתיים.
תפקידך לבצע בדיקת היתכנות ותיקוף צרכים (Need Validation) ראשונית עבור פרויקט קהילתי, כדי לוודא שאינו מבזבז משאבים לחינם.
עליך לנתח את שם הפרויקט, מודל ה-SMART, וסוג הפרויקט ("new" - מיזם חדש, "recurring" - פרויקט חוזר).

השתמש בהקשר ההיסטורי של הארגון במידת האפשר, או בידע שוק רחב במגזר השלישי בישראל לצורך אומדן:
${historicalProjectsContext}

עליך להפיק:
1. טווח עלויות משוער בשקלים (מינימום ומקסימום) - למשל פרויקט דומה בארגון או בשוק עלה בין X ל-Y.
2. משך זמן מינימלי להקמה בימים.
3. דגלים אדומים (Risks): אזהרות רגולטוריות או תפעוליות חשובות. אם מדובר בילדים, דוכני מזון, קהל רב, אירועי חוץ וכד', עליך לזהות זאת ולהקפיץ אזהרה (למשל: "אישור משטרה, רישוי עסקים, ביטוח אירועים").
4. תיקוף צרכים (Demand/Need Validation): סיכום קצר המסביר האם וכיצד הערך של הפרויקט יענה על צורך אמיתי של הקהילה ומה מומלץ לוודא.

החזר את התשובה אך ורק במבנה JSON הבא:
{
  "estimatedCostMin": number,
  "estimatedCostMax": number,
  "estimatedDurationDays": number,
  "risks": ["סיכון 1...", "סיכון 2..."],
  "demandValidation": "פסקה המפרטת את תיקוף הצרכים והביקוש..."
}

פרטי הפרויקט:
- שם הפרויקט: "${input.title}"
- סוג הפרויקט: "${input.type === "new" ? "מיזם חדש" : "פרויקט חוזר"}"
- יעדי SMART:
  Specific (ספציפי): "${input.smartGoals.s}"
  Measurable (מדיד): "${input.smartGoals.m}"
  Achievable (בר-השגה): "${input.smartGoals.a}"
  Relevant (רלוונטי): "${input.smartGoals.r}"
  Time-bound (תחום בזמן): "${input.smartGoals.t}"`;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        // responseMimeType: "application/json"
      }
    });

    const responseText = result.response.text();
    const parsedData = JSON.parse(responseText) as ValidatorResult;

    return { success: true, data: parsedData };
  } catch (error: any) {
    console.error("Error in validateProjectNeeds:", error);
    return { success: false, error: error.message || "שגיאה בתיקוף צרכים והערכת פרויקט" };
  }
}

// 4. Generate WBS Task Tree with RACI templates for each node
export async function generateProjectWbs(input: { title: string; smartGoals: SmartGoals; validator: ValidatorResult }): Promise<{ success: boolean; tasks?: WbsTask[]; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "לא מורשה - יש להתחבר למערכת" };

    const genAI = await getGenAIClient();
    const model = genAI.getGenerativeModel({ model: "gemini-3.1-pro-preview" });

    const prompt = `אתה מנוע ה-WBS ו-RACI של מערכת ניהול פרויקטים קהילתיים.
תפקידך לפרק את הפרויקט המוצע לענפים ותתי משימות היררכיות (Work Breakdown Structure).
כל משימה/ענף בעץ חייב לכלול תבנית RACI מוגדרת המכינה אותו לשיוך משאבים בשלבים הבאים.

הנחיות לבניית ה-WBS:
1. המבנה חייב להיות עץ היררכי (השתמש ב-parentId המקשר משימת בן למשימת אב). צמתים ראשיים יהיו קטגוריות על (למשל: "לוגיסטיקה", "שיווק ופרסום", "כוח אדם ומתנדבים") ויהיה להם parentId = null.&rlm;
2. צמתים משניים יתפצלו מהם (למשל "הדפסת פליירים" ישויך לקטגוריית "שיווק ופרסום").
3. כל משימה (כולל קטגוריות על) צריכה להציג:
   - durationDays: זמן משוער בימים לביצוע המשימה.
   - cost: עלות משוערת ספציפית למשימה זו (שים לב: הסכום של כל המשימות לא יעלה על התקציב המשוער ב-Validator).
   - dependencies: מערך המכיל מזהים (ids) של משימות שחייבות להסתיים לפני שמשימה זו תתחיל.
   - raci: אובייקט עם בעלי תפקידים גנריים/עקרוניים:
     - r (Responsible - המבצע): תפקיד גנרי נדרש (למשל "רכז מתנדבים", "מעצב גרפי", "קופירייטר").
     - a (Accountable - המאשר): ברירת מחדל תהיה "מנהל הפרויקט".
     - c (Consulted - המייעץ): למשל "ספק דפוס", "רכז קהילה", או "ייעוץ משפטי".
     - i (Informed - המעודכן): למשל "ועד מנהל" או "מנהל הארגון".

החזר את התשובה אך ורק במבנה JSON הבא:
{
  "tasks": [
    {
      "id": "מחרוזת מזהה ייחודית, למשל t1, t2, log-1",
      "parentId": "מזהה משימת האב או null לקטגוריות ראשיות",
      "title": "שם המשימה או הקטגוריה בעברית",
      "durationDays": number,
      "cost": number,
      "dependencies": ["מזהה_משימה_קודמת"],
      "raci": {
        "r": "תפקיד ביצוע גנרי נדרש",
        "a": "מנהל הפרויקט",
        "c": "תפקיד התייעצות גנרי",
        "i": "תפקיד יידוע גנרי"
      }
    }
  ]
}

נתוני הפרויקט:
- שם הפרויקט: "${input.title}"
- יעדי SMART:
  Specific: "${input.smartGoals.s}"
  Measurable: "${input.smartGoals.m}"
  Time-bound: "${input.smartGoals.t}"
- הערכת עלויות Validator: מינימום ${input.validator.estimatedCostMin} ש"ח, מקסימום ${input.validator.estimatedCostMax} ש"ח.`;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        // responseMimeType: "application/json"
      }
    });

    const responseText = result.response.text();
    const parsedData = JSON.parse(responseText) as { tasks: WbsTask[] };

    return { success: true, tasks: parsedData.tasks };
  } catch (error: any) {
    console.error("Error in generateProjectWbs:", error);
    return { success: false, error: error.message || "שגיאה ביצירת עץ המשימות וה-RACI" };
  }
}

// 5. Update WBS with Chat Message instructions
export async function updateWbsWithChat(tasks: WbsTask[], chatMessage: string, projectCharterBudget: number): Promise<{ success: boolean; tasks?: WbsTask[]; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "לא מורשה - יש להתחבר למערכת" };

    const genAI = await getGenAIClient();
    const model = genAI.getGenerativeModel({ model: "gemini-3.1-pro-preview" });

    const prompt = `אתה מנוע עדכון ה-WBS של מערכת ניהול פרויקטים קהילתיים.
לפניך רשימת המשימות הנוכחית של הפרויקט (במבנה גרף היררכי עם תבניות RACI לכל משימה) ופקודת המשתמש לשינוי.

עליך לעדכן את המשימות בהתאם להוראות המשתמש:
1. הוסף, מחק, או שנה משימות, קטגוריות, תלויות (dependencies), משכי זמן (durationDays), תקציבים (cost) ותפקידי RACI בהתאם להוראה.
2. שמור על המבנה ההיררכי התקין של העץ (parentId).
3. ודא כי כל משימה חדשה או קיימת שומרת על מבנה RACI תקין.
4. החזר את רשימת המשימות המעודכנת המלאה במבנה ה-JSON המקורי.

החזר את התשובה אך ורק במבנה JSON הבא:
{
  "tasks": [
    {
      "id": "string",
      "parentId": "string | null",
      "title": "string",
      "durationDays": number,
      "cost": number,
      "dependencies": ["string"],
      "raci": {
        "r": "string",
        "a": "string",
        "c": "string",
        "i": "string"
      }
    }
  ]
}

תקציב מאושר נעול באמנה: ${projectCharterBudget} ש"ח.
רשימת משימות נוכחית:
${JSON.stringify(tasks, null, 2)}

הוראת המשתמש לשינוי:
"${chatMessage}"`;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        // responseMimeType: "application/json"
      }
    });

    const responseText = result.response.text();
    const parsedData = JSON.parse(responseText) as { tasks: WbsTask[] };

    return { success: true, tasks: parsedData.tasks };
  } catch (error: any) {
    console.error("Error in updateWbsWithChat:", error);
    return { success: false, error: error.message || "שגיאה בעדכון עץ המשימות מול ה-AI" };
  }
}

// 6. Save Project Data to Firestore
export async function saveProject(project: ProjectData): Promise<{ success: boolean; projectId?: string; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "לא מורשה - יש להתחבר למערכת" };

    const projectId = project.id || adminDb.collection("projects").doc().id;

    // Calculate final actual metrics from tasks
    let totalBudget = 0;
    let totalHours = 0;
    let maxDuration = 0;

    project.tasks.forEach(t => {
      totalBudget += t.cost || 0;
      totalHours += (t.durationDays || 0) * 8; // Assuming 8-hour workday
      if (!t.parentId) {
        // Top level category sum
        maxDuration = Math.max(maxDuration, t.durationDays || 0);
      }
    });

    // Save to Firestore with user scope
    const projectRef = adminDb.collection("projects").doc(projectId);
    const savePayload: any = {
      ...project,
      id: projectId,
      userId: session.user.id,
      metrics: {
        budget: totalBudget,
        hours: totalHours,
        deadlineDays: project.charter?.durationDays || maxDuration
      },
      updatedAt: new Date().toISOString(),
      createdAt: project.createdAt || new Date().toISOString()
    };

    await projectRef.set(savePayload);
    revalidatePath("/dashboard/generator");
    return { success: true, projectId };
  } catch (error: any) {
    console.error("Error in saveProject:", error);
    return { success: false, error: error.message || "שגיאה בשמירת הפרויקט לשרת" };
  }
}

// 7. Get Projects for current user
export async function getProjects(): Promise<{ success: boolean; data?: any[]; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "לא מורשה - יש להתחבר למערכת" };

    const snapshot = await adminDb
      .collection("projects")
      .where("userId", "==", session.user.id)
      .get();

    const projects = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id
      };
    });

    // Sort in memory to avoid index requirements
    projects.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    return { success: true, data: projects };
  } catch (err: any) {
    console.error("Error fetching projects:", err);
    return { success: false, error: err.message || "נכשל באחזור פרויקטים" };
  }
}

// 8. Delete Project
export async function deleteProject(projectId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "לא מורשה" };

    const projectRef = adminDb.collection("projects").doc(projectId);
    const doc = await projectRef.get();
    if (!doc.exists) return { success: false, error: "הפרויקט לא נמצא" };
    if (doc.data()?.userId !== session.user.id) return { success: false, error: "אין הרשאה למחוק פרויקט זה" };

    await projectRef.delete();
    revalidatePath("/dashboard/generator");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "שגיאה במחיקת הפרויקט" };
  }
}

// 9. Generate Scope and Risks baseline using Gemini
export async function generateScopeAndRisks(title: string, tasks: WbsTask[]): Promise<{ success: boolean; data?: ProjectBaseline; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "לא מורשה - יש להתחבר למערכת" };

    const genAI = await getGenAIClient();
    const model = genAI.getGenerativeModel({ model: "gemini-3.1-pro-preview" });

    const prompt = `אתה מנוע ניתוח תכולה וניהול סיכונים עבור פרויקטים קהילתיים בארגונים ומלכ"רים.
לפניך רשימת המשימות המתוכננות לפרויקט בשם "${title}".

עליך לנתח את המשימות ולהפיק:
1. "inScope": רשימה של 4-6 תוצרים/נושאים מרכזיים שנכללים בבירור בפרויקט (למשל: "הפקת חומרי שיווק דיגיטליים", "השכרת ציוד הגברה").
2. "outScope": רשימה של 3-5 נושאים סבירים שאינם נכללים בפרויקט וימנעו זליגת תכולה (למשל: "מימון פרסום ממומן בגוגל", "רכישת ציוד הגברה קבוע").
3. "risks": רשימה של 3-5 סיכונים פוטנציאליים המבוססים על המשימות. לכל סיכון הגדר:
   - risk: תיאור הסיכון.
   - probability: הסתברות (High, Medium, Low).
   - impact: השפעה על הפרויקט (High, Medium, Low).
   - mitigation: תוכנית מגירה/פתרון מוצע.
   - approved: כרגע false.

החזר את התשובה אך ורק במבנה JSON הבא:
{
  "inScope": ["פריט תכולה 1", "פריט תכולה 2"],
  "outScope": ["מחוץ לתכולה 1", "מחוץ לתכולה 2"],
  "risks": [
    {
      "id": "risk_1",
      "risk": "תיאור הסיכון",
      "probability": "Low" | "Medium" | "High",
      "impact": "Low" | "Medium" | "High",
      "mitigation": "תוכנית מגירה",
      "approved": false
    }
  ]
}

רשימת המשימות:
${JSON.stringify(tasks.map(t => ({ title: t.title, cost: t.cost, durationDays: t.durationDays })), null, 2)}`;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        // responseMimeType: "application/json"
      }
    });

    const responseText = result.response.text();
    const parsedData = JSON.parse(responseText);
    
    // Add IDs if missing
    if (parsedData.risks) {
      parsedData.risks = parsedData.risks.map((r: any, idx: number) => ({
        ...r,
        id: r.id || `risk_${Date.now()}_${idx}`
      }));
    }

    return { 
      success: true, 
      data: {
        inScope: parsedData.inScope || [],
        outScope: parsedData.outScope || [],
        risks: parsedData.risks || [],
        milestones: []
      }
    };
  } catch (error: any) {
    console.error("Error in generateScopeAndRisks:", error);
    return { success: false, error: error.message || "שגיאה בניתוח הסיכונים והתכולה" };
  }
}

// 10. Load a single project by ID (Server side helper)
export async function getProjectById(projectId: string): Promise<{ success: boolean; data?: ProjectData; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "לא מורשה" };

    const docRef = adminDb.collection("projects").doc(projectId);
    const snap = await docRef.get();
    if (!snap.exists) return { success: false, error: "הפרויקט לא נמצא" };

    const data = snap.data();
    if (data.userId !== session.user.id) return { success: false, error: "אין הרשאה לפרויקט זה" };

    return { success: true, data: { ...data, id: snap.id } as ProjectData };
  } catch (err: any) {
    return { success: false, error: err.message || "שגיאה באחזור הפרויקט" };
  }
}

// 11. Match CRM Contacts with Role Requirements using Gemini or fallback
export async function matchCrmContactsAction(roleTitle: string, roleRequirements: string): Promise<{ success: boolean; data?: { contact: Contact; score: number; reason: string }[]; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "לא מורשה" };

    const ownerId = session.user.id;
    const contactsSnap = await adminDb.collection("contacts")
      .where("ownerId", "==", ownerId)
      .where("status", "==", "active")
      .get();

    if (contactsSnap.empty) {
      return { success: true, data: [] };
    }

    const contactsList = contactsSnap.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    })) as Contact[];

    try {
      const genAI = await getGenAIClient();
      const model = genAI.getGenerativeModel({ model: "gemini-3.1-pro-preview" });

      const prompt = `אתה רכיב ה-Matchmaker של מערכת ניהול משאבים קהילתיים.
עליך לדרג רשימה של אנשי קשר מה-CRM בהתבסס על מידת התאמתם לדרישות תפקיד ספציפי.

פרטי התפקיד הנדרש:
- תואר תפקיד: "${roleTitle}"
- דרישות וכישורים: "${roleRequirements}"

אנשי קשר זמינים ב-CRM:
${JSON.stringify(contactsList.map(c => ({ id: c.id, name: c.conta_name, job_title: c.job_title || "", tags: [c.tg1, c.tg2, c.tg3].filter(Boolean), notes: c.notes || "" })), null, 2)}

עליך להחזיר דירוג התאמה לכל איש קשר (בין 0 ל-100) והסבר קצר בן משפט אחד בעברית מדוע הוא מתאים.
החזר אך ורק במבנה JSON הבא:
{
  "matches": [
    {
      "contactId": "מזהה איש הקשר",
      "score": 85,
      "reason": "הסבר ההתאמה בעברית"
    }
  ]
}
`;

      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { /* responseMimeType: "application/json" */ }
      });

      const responseText = result.response.text();
      const parsed = JSON.parse(responseText) as { matches: { contactId: string; score: number; reason: string }[] };

      const scoredList = parsed.matches.map(match => {
        const contact = contactsList.find(c => c.id === match.contactId);
        if (!contact) return null;
        return {
          contact,
          score: match.score,
          reason: match.reason
        };
      }).filter(Boolean) as { contact: Contact; score: number; reason: string }[];

      scoredList.sort((a, b) => b.score - a.score);
      return { success: true, data: scoredList };
    } catch (aiErr) {
      console.warn("AI CRM Match failed, using fallback similarity:", aiErr);
      const normalizedRole = roleTitle.toLowerCase();
      const scoredList = contactsList.map(c => {
        let score = 20;
        let reason = "איש קשר זמין מה-CRM.&rlm;";

        if (c.job_title && c.job_title.toLowerCase().includes(normalizedRole)) {
          score += 60;
          reason = `התאמה גבוהה לפי הגדרת תפקיד (${c.job_title}).&rlm;`;
        } else if (c.notes && c.notes.toLowerCase().includes(normalizedRole)) {
          score += 30;
          reason = "נמצאו מילות מפתח תואמות בהערות איש הקשר.&rlm;";
        } else if ([c.tg1, c.tg2, c.tg3].some(t => t && t.toLowerCase().includes(normalizedRole))) {
          score += 40;
          reason = "נמצא תיוג תואם לתחום העיסוק.&rlm;";
        }

        return { contact: c, score: Math.min(score, 100), reason };
      });

      scoredList.sort((a, b) => b.score - a.score);
      return { success: true, data: scoredList };
    }
  } catch (err: any) {
    return { success: false, error: err.message || "שגיאה בשידוך אנשי קשר מה-CRM" };
  }
}

// 12. Create Public Recruitment Page
export async function createPublicRecruitmentPage(
  projectId: string,
  roleId: string,
  roleTitle: string,
  roleRequirements: string,
  budget: number
): Promise<{ success: boolean; pageId?: string; url?: string; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "לא מורשה" };

    const pageId = `${projectId}_${roleId}`;
    const pageRef = adminDb.collection("recruitment_pages").doc(pageId);
    
    await pageRef.set({
      projectId,
      roleId,
      roleTitle,
      roleRequirements,
      budget,
      ownerId: session.user.id,
      createdAt: new Date().toISOString()
    });

    const url = `/generator/onboard/${pageId}`;
    return { success: true, pageId, url };
  } catch (err: any) {
    return { success: false, error: err.message || "שגיאה ביצירת עמוד הגיוס" };
  }
}

// 13. Submit Digital signature & terms on public onboarding form
export async function submitDigitalSignatureAction(
  pageId: string,
  candidateName: string,
  candidatePhone: string,
  candidateEmail: string,
  agreedPrice: number,
  signatureData: string
): Promise<{ success: boolean; projectId?: string; error?: string }> {
  try {
    const [projectId, roleId] = pageId.split("_");
    if (!projectId || !roleId) return { success: false, error: "מזהה עמוד שגוי" };

    const projectRef = adminDb.collection("projects").doc(projectId);
    const snap = await projectRef.get();
    if (!snap.exists) return { success: false, error: "הפרויקט לא נמצא" };

    const projectData = snap.data() as ProjectData;

    // Create/update contact in owner's CRM
    const contactsRef = adminDb.collection("contacts");
    let contactId = "";
    
    const phone = candidatePhone.replace(/\D/g, "");
    const existingContact = await contactsRef
      .where("ownerId", "==", projectData.userId)
      .where("conta_phone", "==", phone)
      .limit(1)
      .get();

    if (!existingContact.empty) {
      contactId = existingContact.docs[0].id;
      await contactsRef.doc(contactId).update({
        conta_name: candidateName,
        email: candidateEmail,
        updatedAt: new Date().toISOString()
      });
    } else {
      const newContact = {
        ownerId: projectData.userId,
        status: "active",
        conta_name: candidateName,
        conta_phone: phone,
        email: candidateEmail,
        job_title: roleId, // use role identifier
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      const res = await contactsRef.add(newContact);
      contactId = res.id;
    }

    // Update roles list
    let rolesList = projectData.roles || [];
    const roleIdx = rolesList.findIndex(r => r.id === roleId);
    if (roleIdx !== -1) {
      rolesList[roleIdx] = {
        ...rolesList[roleIdx],
        assignedContactId: contactId,
        assignedContactName: candidateName,
        status: "active"
      };
    } else {
      const task = projectData.tasks.find(t => t.id === roleId);
      rolesList.push({
        id: roleId,
        taskId: roleId,
        roleTitle: task ? task.title : "ספק חיצוני",
        requirements: "קליטה חיצונית",
        budget: agreedPrice,
        assignedContactId: contactId,
        assignedContactName: candidateName,
        status: "active"
      });
    }

    // Create onboarding log message in War Room
    const newMsg: WarRoomMessage = {
      id: `msg_onboard_${Date.now()}`,
      senderName: "מערכת",
      senderRole: "מערכת",
      message: `הספק ${candidateName} השלים קליטה וחתם על משימת "${rolesList.find(r => r.id === roleId)?.roleTitle || 'ספק חיצוני'}" בסכום של ₪${agreedPrice.toLocaleString()}.&rlm;`,
      timestamp: new Date().toISOString(),
      channel: "כללי"
    };

    const updatedMsgs = [...(projectData.warRoomMessages || []), newMsg];

    await projectRef.update({
      roles: rolesList,
      warRoomMessages: updatedMsgs,
      updatedAt: new Date().toISOString()
    });

    return { success: true, projectId };
  } catch (err: any) {
    console.error("Error in submitDigitalSignatureAction:", err);
    return { success: false, error: err.message || "שגיאה בתהליך החתימה" };
  }
}

// 14. Submit Change Request in War Room
export async function submitChangeRequestAction(
  projectId: string, 
  title: string, 
  description: string, 
  budgetImpact: number, 
  scheduleImpactDays: number, 
  requestedBy: string
): Promise<{ success: boolean; changeRequests?: ChangeRequest[]; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "לא מורשה" };

    const docRef = adminDb.collection("projects").doc(projectId);
    const snap = await docRef.get();
    if (!snap.exists) return { success: false, error: "הפרויקט לא נמצא" };

    const projectData = snap.data();
    if (projectData.userId !== session.user.id) return { success: false, error: "אין הרשאה לפרויקט זה" };

    const newRequest: ChangeRequest = {
      id: `cr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title,
      description,
      budgetImpact: Number(budgetImpact) || 0,
      scheduleImpactDays: Number(scheduleImpactDays) || 0,
      requestedBy,
      requestedAt: new Date().toISOString(),
      status: "pending",
      approvedBy: []
    };

    const currentRequests = projectData.changeRequests || [];
    const updatedRequests = [...currentRequests, newRequest];

    await docRef.update({
      changeRequests: updatedRequests,
      updatedAt: new Date().toISOString()
    });

    return { success: true, changeRequests: updatedRequests };
  } catch (err: any) {
    return { success: false, error: err.message || "שגיאה בהגשת בקשת השינוי" };
  }
}

// 15. Approve Change Request and update Project baseline
export async function approveChangeRequestAction(
  projectId: string, 
  requestId: string, 
  approverName: string
): Promise<{ success: boolean; data?: ProjectData; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "לא מורשה" };

    const docRef = adminDb.collection("projects").doc(projectId);
    const snap = await docRef.get();
    if (!snap.exists) return { success: false, error: "הפרויקט לא נמצא" };

    const projectData = snap.data() as ProjectData;
    if (projectData.userId !== session.user.id) return { success: false, error: "אין הרשאה לפרויקט זה" };

    const updatedRequests = (projectData.changeRequests || []).map(req => {
      if (req.id === requestId) {
        return {
          ...req,
          status: "approved" as const,
          approvedBy: [...(req.approvedBy || []), approverName]
        };
      }
      return req;
    });

    const approvedRequest = updatedRequests.find(r => r.id === requestId);
    if (!approvedRequest) return { success: false, error: "בקשת השינוי לא נמצאה" };

    // Apply impact to project metrics and tasks
    let updatedTasks = [...projectData.tasks];
    let updatedMetrics = { ...(projectData.metrics || { budget: 0, hours: 0, deadlineDays: 0 }) };

    if (approvedRequest.budgetImpact !== 0 || approvedRequest.scheduleImpactDays !== 0) {
      const changeTask: WbsTask = {
        id: `task_change_${approvedRequest.id}`,
        parentId: null,
        title: `שינוי מאושר: ${approvedRequest.title}`,
        durationDays: approvedRequest.scheduleImpactDays,
        cost: approvedRequest.budgetImpact,
        dependencies: [],
        raci: {
          r: approvedRequest.requestedBy,
          a: approverName,
          c: "",
          i: ""
        }
      };
      updatedTasks.push(changeTask);

      let totalBudget = 0;
      let totalHours = 0;
      let maxDuration = 0;

      updatedTasks.forEach(t => {
        totalBudget += t.cost || 0;
        totalHours += (t.durationDays || 0) * 8;
        if (!t.parentId) {
          maxDuration = Math.max(maxDuration, t.durationDays || 0);
        }
      });

      updatedMetrics.budget = totalBudget;
      updatedMetrics.hours = totalHours;
      updatedMetrics.deadlineDays = projectData.charter?.durationDays ? (projectData.charter.durationDays + approvedRequest.scheduleImpactDays) : maxDuration;
    }

    const updatePayload: Partial<ProjectData> = {
      changeRequests: updatedRequests,
      tasks: updatedTasks,
      metrics: updatedMetrics,
      updatedAt: new Date().toISOString()
    };

    await docRef.update(updatePayload);

    return { 
      success: true, 
      data: {
        ...projectData,
        ...updatePayload
      }
    };
  } catch (err: any) {
    return { success: false, error: err.message || "שגיאה באישור בקשת השינוי" };
  }
}

// 16. Post message in Virtual War Room
export async function addWarRoomMessage(
  projectId: string,
  msg: Omit<WarRoomMessage, "id" | "timestamp">
): Promise<{ success: boolean; message?: WarRoomMessage; error?: string }> {
  try {
    const docRef = adminDb.collection("projects").doc(projectId);
    const snap = await docRef.get();
    if (!snap.exists) return { success: false, error: "הפרויקט לא נמצא" };

    const projectData = snap.data();
    
    const newMsg: WarRoomMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      ...msg,
      timestamp: new Date().toISOString()
    };

    const currentMsgs = projectData.warRoomMessages || [];
    const updatedMsgs = [...currentMsgs, newMsg];

    await docRef.update({
      warRoomMessages: updatedMsgs,
      updatedAt: new Date().toISOString()
    });

    return { success: true, message: newMsg };
  } catch (err: any) {
    return { success: false, error: err.message || "שגיאה בשליחת ההודעה" };
  }
}

// 17. Load recruitment page data (public route helper)
export async function getRecruitmentPageData(pageId: string): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const docRef = adminDb.collection("recruitment_pages").doc(pageId);
    const snap = await docRef.get();
    if (!snap.exists) return { success: false, error: "עמוד הגיוס לא נמצא" };
    return { success: true, data: snap.data() };
  } catch (err: any) {
    return { success: false, error: err.message || "שגיאה באחזור עמוד הגיוס" };
  }
}
