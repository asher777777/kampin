import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { google } from "googleapis";

// Helper for Service Account OAuth2 token
async function getGoogleOAuth2Token() {
  try {
    const privateKeyB64 = process.env.FIREBASE_ADMIN_PRIVATE_KEY_B64;
    let privateKey = "";
    if (privateKeyB64) {
      privateKey = Buffer.from(privateKeyB64, "base64").toString("utf8");
    } else if (process.env.FIREBASE_ADMIN_PRIVATE_KEY) {
      privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, "\n");
    }
    const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;

    if (clientEmail && privateKey) {
      const jwtClient = new google.auth.JWT({
        email: clientEmail,
        key: privateKey,
        scopes: [
          "https://www.googleapis.com/auth/generative-language",
          "https://www.googleapis.com/auth/cloud-platform"
        ],
      });
      const tokenRes = await jwtClient.getAccessToken();
      return tokenRes.token;
    }
  } catch (err: any) {
    console.warn("Failed to get OAuth2 token:", err?.message);
  }
  return null;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const body = await req.json();
    const {
      permissions,
      permission_matrix,
      ai_capabilities,
      primary_roles,
      collaboration,
      tone_style,
      systemPrompt,
      tts_voice_id,
      custom_user_notes,
      conversation_history_id,
    } = body;

    // Maintain & generate Gemini Context Cache ID for token optimization
    const cacheHistoryId = conversation_history_id || `hist_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const promptAssistInstruction = `You are a Master AI Prompt Engineer & Agent Instructions Specialist.
We are configuring an AI Smart Worker operating under database schema: root\\${slug}\\smart-worker-config.

ALL AVAILABLE SYSTEM AI TOOLS & CAPABILITIES IN OUR SUITE:
- Text Generation & Reasoning Engine (Gemini 2.5 Flash / 1.5 Pro)
- Deep Database & Web Research Engine (Firestore Analytics Inspection)
- Document & PDF Reading / Parsing Engine
- Image & Visual Asset Generation Engine (DALL-E / Imagen)
- Dynamic Video Loop Generation Engine
- Advanced Code Writing & Refactoring Engine (Next.js, TypeScript, React)
- Google Studio TTS Audio Voice Synthesis (${tts_voice_id || "en-US-Studio-O"})
- Gemini Context Caching System (Token Optimization Cache ID: ${cacheHistoryId})

SMART WORKER FORM CONFIGURATION SENT FROM CLIENT:
1. Primary Roles: ${Array.isArray(primary_roles) && primary_roles.length > 0 ? primary_roles.join(", ") : "Advisor, Analytics"}
2. Active AI Capabilities: ${Array.isArray(ai_capabilities) && ai_capabilities.length > 0 ? ai_capabilities.join(", ") : "text_response, research, read_documents, generate_images, write_code"}
3. 2D Permission Matrix: ${JSON.stringify(permission_matrix || permissions || {})}
4. Team Collaborating Agents: ${Array.isArray(collaboration) && collaboration.length > 0 ? collaboration.join(", ") : "None"}
5. Desired Communication Tone & Style: ${tone_style || "Professional"}
6. Base Draft Prompt: "${systemPrompt || ""}"
7. Custom User Goals / Business Focus: "${custom_user_notes || "General workspace optimization"}"

TASK FOR PROMPT ENGINEER:
Synthesize all form parameters, permissions, capabilities, and team collaboration into an articulate, highly authoritative, master-level System Prompt (the primary and ONLY prompt) for this Smart Worker.
The prompt must explicitly instruct the agent on its exact persona, database access bounds, communication style, tool usage, and collaboration protocols.

RULES:
- Return ONLY the final refined System Prompt text.
- Do NOT include conversational greetings, markdown meta-comments, or code block fences.`;

    let refinedPrompt = "";

    // 1. Query Gemini with OAuth2 Token
    const oauthToken = await getGoogleOAuth2Token();
    const geminiKey = process.env.GEMINI_API_KEY;

    if (oauthToken) {
      for (const model of ["gemini-1.5-flash-latest", "gemini-1.5-pro-latest", "gemini-2.5-flash"]) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
          const res = await fetch(url, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${oauthToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              contents: [{ parts: [{ text: promptAssistInstruction }] }],
            }),
          });

          if (res.ok) {
            const data = await res.json();
            const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text?.trim()) {
              refinedPrompt = text.trim();
              break;
            }
          }
        } catch (e) {
          console.warn(`OAuth prompt assist for ${model} failed:`, e);
        }
      }
    }

    if (!refinedPrompt && geminiKey && !geminiKey.startsWith("AQ.")) {
      try {
        const aiKey = new GoogleGenAI({ apiKey: geminiKey });
        const res = await aiKey.models.generateContent({
          model: "gemini-1.5-flash-latest",
          contents: promptAssistInstruction,
        });
        if (res.text?.trim()) refinedPrompt = res.text.trim();
      } catch (e) {
        console.warn("APIKey prompt assist failed:", e);
      }
    }

    // Dynamic High-Quality Master Prompt Synthesis (Fallback if API key disabled)
    if (!refinedPrompt) {
      const rolesText = Array.isArray(primary_roles) && primary_roles.length > 0 ? primary_roles.join(", ") : "Advisor & Senior System Analyst";
      const capText = Array.isArray(ai_capabilities) && ai_capabilities.length > 0 ? ai_capabilities.join(", ") : "text_response, research, read_documents, generate_images, write_code";
      const collabText = Array.isArray(collaboration) && collaboration.length > 0 ? collaboration.join(", ") : "team agents";
      
      refinedPrompt = `You are a Smart Worker operating under schema root\\${slug}\\smart-worker-config. Your primary roles are [${rolesText}] with active AI capabilities [${capText}]. Communication tone must strictly follow a ${tone_style || "Professional"} style. You possess authorized workspace permissions to query database records (system_db_read: ${permissions?.system_db_read ?? true}, office_db_read: ${permissions?.office_db_read ?? true}), generate visual & text insights, and collaborate with team agents [${collabText}]. Always execute tasks with high accuracy, zero fluff, and direct actionable clarity.`;
    }

    return NextResponse.json({
      success: true,
      refinedPrompt,
      conversation_history_id: cacheHistoryId,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("POST /api/office/[slug]/prompt-assist error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to generate prompt assist" },
      { status: 500 }
    );
  }
}
