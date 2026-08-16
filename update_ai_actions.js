const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/features/ai/actions.ts');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Update function signature
content = content.replace(
  /export async function rephraseTextWithAI\(\s*text: string,\s*tone: "warm" \| "elegant" \| "punchy" \| "storytelling" = "warm",\s*customInstruction: string = "",\s*skipLimits: boolean = false\s*\): Promise<\{ success: boolean; text\?: string; error\?: string \}> \{/,
  `export async function rephraseTextWithAI(
  text: string,
  tone: "warm" | "elegant" | "punchy" | "storytelling" = "warm",
  customInstruction: string = "",
  skipLimits: boolean = false,
  isRichText: boolean = false
): Promise<{ success: boolean; text?: string; error?: string }> {`
);

// 2. Update the system prompt instructions based on isRichText
const oldInstructions = `הנחיות קריטיות לעבודה:
1. פלט: החזר אך ורק קוד HTML נקי! הטקסט חייב להיות מעוצב באמצעות תגיות HTML עשירות (כגון <h2>, <h3>, <p>, <strong>, <ul>, <li>, <em>).
2. עיצוב: אל תשמש ב-Markdown (כגון כוכביות או סולמות). השתמש רק ב-HTML.
3. אל תוסיף הקדמות כמו "להלן הקוד", אל תעטוף בסימוני markdown (כמו \`\`\`html), פשוט החזר את ה-HTML נטו שניתן להזריק ישירות לעורך טקסט.`;

const newInstructions = `הנחיות קריטיות לעבודה:
\${isRichText 
  ? \`1. פלט: החזר אך ורק קוד HTML נקי! הטקסט חייב להיות מעוצב באמצעות תגיות HTML עשירות (כגון <h2>, <h3>, <p>, <strong>, <ul>, <li>, <em>).
2. עיצוב: אל תשמש ב-Markdown (כגון כוכביות או סולמות). השתמש רק ב-HTML.
3. אל תוסיף הקדמות כמו "להלן הקוד", אל תעטוף בסימוני markdown (כמו \\\`\\\`\\\`html), פשוט החזר את ה-HTML נטו שניתן להזריק ישירות לעורך טקסט.\`
  : \`1. פלט: החזר אך ורק טקסט פשוט (Plain Text) נקי לחלוטין מתגיות HTML או מסימוני Markdown. רק את המילים.
2. אורך ומבנה: מכיוון שזו כותרת או כותרת משנית, עליה להיות קצרה, מדויקת, ללא פסקאות ארוכות או רשימות.
3. אל תוסיף שום מילות הקדמה או סיום (כמו "הנה הצעה" או "להלן הטקסט"). החזר רק את התוצאה הסופית המדויקת.\`}`;

content = content.replace(oldInstructions, newInstructions);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated actions.ts');
