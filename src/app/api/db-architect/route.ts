import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { GoogleGenAI } from "@google/genai";

let geminiKey = process.env.GEMINI_API_KEY;
const aiConfig: any = {};
if (geminiKey?.startsWith("AQ.")) {
  aiConfig.httpOptions = { headers: { Authorization: `Bearer ${geminiKey}` } };
} else {
  aiConfig.apiKey = geminiKey || process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
}
const ai = new GoogleGenAI(aiConfig);

const tools: any[] = [
  {
    functionDeclarations: [
      {
        name: "seed_database_collection",
        description: "Creates multiple documents in a specific Firestore collection path to seed the database with initial data. Can be used for deep paths like 'users/123/tasks'.",
        parameters: {
          type: "OBJECT",
          properties: {
            collectionPath: { type: "STRING", description: "The full path of the collection (e.g., 'products' or 'users/123/tasks')" },
            documents: {
              type: "ARRAY",
              description: "Array of JSON objects to insert. Each object represents a document data.",
              items: { type: "OBJECT" }
            }
          },
          required: ["collectionPath", "documents"]
        }
      },
      {
        name: "query_database",
        description: "Read and analyze existing documents from a Firestore collection to understand the current schema and data.",
        parameters: {
          type: "OBJECT",
          properties: {
            collectionPath: { type: "STRING", description: "The full path of the collection to read (e.g., 'products')" }
          },
          required: ["collectionPath"]
        }
      }
    ]
  }
];

const systemInstruction = `
אתה "ארכיטקט מסדי נתונים" (Database Architect) של המערכת. התפקיד שלך הוא לעזור למשתמש בסיעור מוחות כדי לבנות מודלים, סכמות, וקולקציות למסד הנתונים (Firestore).

שלבים:
1. שאל את המשתמש איזה סוג נתונים הוא רוצה לאחסן ולנהל.
2. הצע סכמות JSON חכמות והגיוניות הכוללות שדות שימושיים (כמו סטטוסים, תאריכים, מזהים מקושרים).
3. באפשרותך להשתמש בכלי 'query_database' כדי לקרוא קולקציות קיימות ולהבין איך הן בנויות, כך שתוכל להתאים את הסכמות החדשות למבנה הקיים.
4. לאחר שהמשתמש מאשר ומרוצה מהסכמה, הצע לייצר עבורו נתוני דמו (Mock Data).
5. אם המשתמש מסכים, השתמש בכלי 'seed_database_collection' כדי לייצר 3-5 דוגמאות ריאליסטיות ולהזריק אותן בפועל למסד הנתונים כדי שהמשתמש יראה אותן נוצרות מולו!

שים לב: 
- יש לך הרשאות קריאה וכתיבה (הזרקת נתונים).
- אין לך אישור למחוק נתונים! המשתמש הבהיר שהוא מוחק בעצמו. אל תציע למחוק.
- תמיד ענה בעברית בצורה שירותית, טכנית ומקצועית. עזור למשתמש לחשוב על שדות חשובים שאולי פספס.
- שים לב שאתה מסוגל לכתוב מספר מסמכים במכה אחת (Batch) בעזרת הכלי שלך.
`;

export async function POST(req: Request) {
  try {
    const { message, history } = await req.json();
    
    const contents: any[] = [];
    if (history && history.length > 0) {
      for (const msg of history) {
        contents.push({
          role: msg.role === 'ai' || msg.role === 'model' ? 'model' : 'user',
          parts: [{ text: msg.text || msg.content }]
        });
      }
    }
    contents.push({
      role: 'user',
      parts: [{ text: message }]
    });

    let isSeeding = false;
    let seededCount = 0;
    
    // Multi-turn loop
    let maxTurns = 3;
    let currentResponse;
    let currentText = '';

    while (maxTurns > 0) {
      maxTurns--;
      currentResponse = await ai.models.generateContent({
        model: "gemini-2.5-pro",
        contents,
        config: {
          systemInstruction,
          tools,
          temperature: 0.7
        }
      });

      if (currentResponse.functionCalls && currentResponse.functionCalls.length > 0) {
        const call = currentResponse.functionCalls[0];
        let toolResponsePayload: any = {};

        // Add model's function call to history
        contents.push({
          role: 'model',
          parts: [{
            functionCall: {
              name: call.name,
              args: call.args
            }
          }]
        });

        if (call.name === "seed_database_collection") {
          const { collectionPath, documents } = call.args as any;
          if (collectionPath && Array.isArray(documents) && documents.length > 0) {
            isSeeding = true;
            const batch = adminDb.batch();
            const colRef = adminDb.collection(collectionPath);
            documents.forEach((docData: any) => {
              const newDoc = colRef.doc();
              const cleanData = JSON.parse(JSON.stringify(docData));
              batch.set(newDoc, {
                 ...cleanData,
                 createdAt: Date.now()
              });
            });
            await batch.commit();
            seededCount += documents.length;
            toolResponsePayload = { success: true, message: `הוזרקו בהצלחה ${documents.length} רשומות לתוך ${collectionPath}` };
          } else {
            toolResponsePayload = { success: false, error: "Invalid parameters" };
          }
        } else if (call.name === "query_database") {
          const { collectionPath } = call.args as any;
          try {
            const snap = await adminDb.collection(collectionPath).limit(10).get();
            if (snap.empty) {
              toolResponsePayload = { success: true, message: `הקולקציה ${collectionPath} ריקה או לא קיימת.` };
            } else {
              const records = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
              toolResponsePayload = { success: true, count: snap.size, data: records };
            }
          } catch (err: any) {
            toolResponsePayload = { success: false, error: err.message };
          }
        }

        // Add function response to history
        contents.push({
          role: 'user',
          parts: [{
            functionResponse: {
              name: call.name,
              response: toolResponsePayload
            }
          }]
        });

      } else {
        // No more function calls, we have the final text
        currentText = currentResponse.text || '';
        break;
      }
    }

    if (seededCount > 0) {
      currentText += `\n\n[פעולת מערכת: הוזרקו בהצלחה ${seededCount} רשומות למסד הנתונים]`;
    }

    return NextResponse.json({
      success: true,
      text: currentText,
      seededCount,
      isSeeding
    });

  } catch (error: any) {
    console.error("DB Architect API Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "שגיאה פנימית" },
      { status: 500 }
    );
  }
}
