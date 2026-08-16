const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/features/ai/actions.ts');
let content = fs.readFileSync(filePath, 'utf8');

const startIndex = content.indexOf('export async function rephraseTextWithAI');
const endIndex = content.indexOf('export async function generateSeoTagsWithAI');

if (startIndex !== -1 && endIndex !== -1) {
  const newFunction = `export async function rephraseTextWithAI(
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
      ? \`1. פלט: החזר אך ורק קוד HTML נקי! הטקסט חייב להיות מעוצב באמצעות תגיות HTML עשירות (כגון <h2>, <h3>, <p>, <strong>, <ul>, <li>, <em>).
2. עיצוב: אל תשתמש ב-Markdown (כגון כוכביות או סולמות). השתמש רק ב-HTML.
3. אל תוסיף הקדמות, פשוט החזר את ה-HTML נטו שניתן להזריק ישירות לעורך טקסט.\`
      : \`1. פלט: החזר אך ורק טקסט פשוט (Plain Text) נקי לחלוטין מתגיות HTML או מסימוני Markdown. רק את המילים.
2. אורך ומבנה: מכיוון שזו כותרת או כותרת משנית, עליה להיות קצרה, מדויקת (עד 15 מילים), ללא פסקאות ארוכות או רשימות.
3. אל תוסיף שום מילות הקדמה או סיום. החזר רק את התוצאה הסופית המדויקת.\`;

    const systemPrompt = \`אתה קופירייטר שיווקי מומחה.
מטרה: עריכה ושדרוג קופירייטינג של טקסט המיועד לאתר האינטרנט.
טקסט מקורי:
"\${text}"

סגנון כתיבה מבוקש (טון):
\${toneGuidelines[tone] || toneGuidelines.warm}

\${customInstruction ? \`דגשים מיוחדים (חובה ליישם):\n- \${customInstruction}\` : ""}

הנחיות קריטיות לעבודה:
\${formatInstructions}
4. עברית: כתוב בעברית קולחת וטבעית.
5. רוח המקום: התאם לרוח הקהילה - מסביר פנים ופתוח לכולם.\`;

    const result = await model.generateContent(systemPrompt);
    const responseText = result.response.text().trim().replace(/^"|"$/g, '');
    
    return { success: true, text: responseText };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

`;

  content = content.substring(0, startIndex) + newFunction + content.substring(endIndex);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Successfully replaced function');
} else {
  console.log('Could not find start or end index');
}
