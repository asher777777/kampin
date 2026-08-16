import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { GoogleGenAI } from '@google/genai';
import { TextToSpeechClient } from '@google-cloud/text-to-speech';

// Initialize the Google GenAI SDK
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }); 

// Initialize Google Cloud TTS Client
let ttsClient: TextToSpeechClient | null = null;
try {
  const privateKeyB64 = process.env.FIREBASE_ADMIN_PRIVATE_KEY_B64;
  let privateKey = "";
  if (privateKeyB64) {
    privateKey = Buffer.from(privateKeyB64, 'base64').toString('utf8');
  } else if (process.env.FIREBASE_ADMIN_PRIVATE_KEY) {
    privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n');
  }
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;

  if (projectId && clientEmail && privateKey) {
    ttsClient = new TextToSpeechClient({
      credentials: { client_email: clientEmail, private_key: privateKey },
      projectId,
    });
  } else {
    ttsClient = new TextToSpeechClient();
  }
} catch (e: any) {
  console.warn("Could not init TTS client (it may fall back to default creds):", e.message);
}

export async function POST(req: Request) {
  try {
    const { userText, previous_interaction_id, sessionId } = await req.json();

    const systemInstruction = "You are ED, an admissions interviewer. Your goal is to extract: age, gender, area of residence, current role, past experience, whether they are bringing a new product/service or are in the middle of developing one (and if so, do they have social media ads or a landing page?). Motivate them by offering 100 coins if they impress you. With 100 coins, they can: buy professional agent time, rent digital assets, buy storage, build landing pages, or get secretarial, analytics, branding, and product management services. CRITICAL RULES: 1. Your response MUST NEVER exceed 15 words. 2. Ask only ONE question at a time to extract info sequentially. 3. Always end with a question. 4. Motivate them by mentioning specific benefits of the coins.";

    let assistantMessage = "";
    let newInteractionId = previous_interaction_id;
    let actualUserText = userText || "Hello";

    const dbSessionId = sessionId || Date.now().toString();
    const sessionRef = adminDb.collection("ed_interviews").doc(dbSessionId);

    try {
      const requestPayload: any = {
        model: 'gemini-3.5-flash',
        contents: actualUserText,
        config: {
          systemInstruction: systemInstruction,
        }
      };

      if (previous_interaction_id) {
        requestPayload.previous_interaction_id = previous_interaction_id;
      }

      if (ai.interactions && (ai.interactions as any).create) {
        const result = await (ai.interactions as any).create(requestPayload);
        assistantMessage = result.text || "I don't know what to say.";
        newInteractionId = result.interactionId || result.id || previous_interaction_id;
      } else {
        throw new Error("Interactions API not found on SDK, falling back to generateContent with history");
      }
    } catch (apiError: any) {
      console.warn("Falling back to standard generateContent:", apiError.message);
      
      // Fetch history from DB for stateful fallback
      const historySnap = await sessionRef.collection("messages").orderBy("createdAt", "asc").get();
      const historyContents: any[] = [];
      historySnap.forEach(doc => {
        const msg = doc.data();
        historyContents.push({
          role: msg.role === 'agent' ? 'model' : 'user',
          parts: [{ text: msg.text }]
        });
      });
      historyContents.push({ role: 'user', parts: [{ text: actualUserText }] });

      const fallbackResult = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: historyContents,
        config: { systemInstruction }
      });
      assistantMessage = fallbackResult.text || "Hello. Could you please answer my question?";
    }

    // Generate Text-to-Speech audio
    let audioBase64 = null;
    let ttsErrorMessage = null;
    if (ttsClient && assistantMessage) {
      try {
        const [ttsResponse] = await ttsClient.synthesizeSpeech({
          input: { text: assistantMessage },
          voice: { languageCode: 'en-US', name: 'en-US-Neural2-D' }, // Changed to Neural2 which is more universally available
          audioConfig: { audioEncoding: 'MP3' },
        });
        
        if (ttsResponse.audioContent) {
           audioBase64 = Buffer.from(ttsResponse.audioContent).toString('base64');
        }
      } catch (ttsError: any) {
        ttsErrorMessage = ttsError.message;
        console.error("Google Cloud TTS generation error:", ttsErrorMessage);
      }
    }

    // Save to Firestore Database
    try {
      const dbSessionId = sessionId || Date.now().toString();
      const sessionRef = adminDb.collection("ed_interviews").doc(dbSessionId);
      
      await sessionRef.collection("messages").add({
        role: "user",
        text: actualUserText,
        createdAt: new Date(),
      });
      
      await sessionRef.collection("messages").add({
        role: "agent",
        text: assistantMessage,
        createdAt: new Date(),
      });

      await sessionRef.set({
        lastUpdatedAt: new Date(),
        interactionId: newInteractionId || null
      }, { merge: true });

    } catch (dbError) {
      console.error("Firestore save error:", dbError);
    }

    return NextResponse.json({ 
      reply: assistantMessage, 
      interactionId: newInteractionId,
      audioBase64: audioBase64,
      ttsError: ttsErrorMessage
    });

  } catch (error: any) {
    console.error("ED Chat API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
