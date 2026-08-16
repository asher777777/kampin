import { NextResponse } from "next/server";
import { adminDb, adminStorage } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { GoogleGenAI } from "@google/genai";
import { TextToSpeechClient } from "@google-cloud/text-to-speech";
import fs from "fs";
import path from "path";
let geminiKey = process.env.GEMINI_API_KEY;
const aiConfig: any = {};
if (geminiKey?.startsWith("AQ.")) {
  aiConfig.httpOptions = { headers: { Authorization: `Bearer ${geminiKey}` } };
} else {
  aiConfig.apiKey = geminiKey || process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
}
const ai = new GoogleGenAI(aiConfig);

// Initialize Google Cloud TTS Client
let ttsClient: TextToSpeechClient | null = null;
try {
  const privateKeyB64 = process.env.FIREBASE_ADMIN_PRIVATE_KEY_B64;
  let privateKey = "";
  if (privateKeyB64) {
    privateKey = Buffer.from(privateKeyB64, "base64").toString("utf8");
  } else if (process.env.FIREBASE_ADMIN_PRIVATE_KEY) {
    privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, "\n");
  }
  const projectId =
    process.env.FIREBASE_ADMIN_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
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
  console.warn(
    "Could not init TTS client (it may fall back to default creds):",
    e.message,
  );
}

// Define tools
const tools: any[] = [
  {
    functionDeclarations: [
      {
        name: "save_user_fact",
        description:
          "Save a critical piece of information or keyword about the user.",
        parameters: {
          type: "OBJECT",
          properties: {
            category: { type: "STRING" },
            value: { type: "STRING" },
          },
          required: ["category", "value"],
        },
      },
      {
        name: "create_product",
        description:
          "Create a new product or service in the database. Use this ONLY after you have gathered all necessary information.",
        parameters: {
          type: "OBJECT",
          properties: {
            name: { type: "STRING", description: "Name of the product" },
            price: {
              type: "STRING",
              description: "Price (e.g. 55$, free, etc)",
            },
            description: {
              type: "STRING",
              description: "What the product is/does",
            },
            priority: {
              type: "STRING",
              description: "Priority level (e.g. top, normal)",
            },
            targetAudience: {
              type: "STRING",
              description: "Who is this product for?",
            },
            benefits: {
              type: "STRING",
              description: "The top 3 benefits of the product",
            },
            objections: {
              type: "STRING",
              description: "Common objections and how to handle them",
            },
          },
          required: [
            "name",
            "price",
            "description",
            "targetAudience",
            "benefits",
            "objections",
          ],
        },
      },
      {
        name: "add_reminder",
        description: "Save a reminder for the business owner.",
        parameters: {
          type: "OBJECT",
          properties: {
            task: { type: "STRING" },
            dueDate: { type: "STRING" },
          },
          required: ["task"],
        },
      },
      {
        name: "query_database",
        description: "Query the company Firebase database to fetch analytics or lists of users, pages, content, products, employees, or digital_offices.",
        parameters: {
          type: "OBJECT",
          properties: {
            collectionName: { type: "STRING", description: "The collection to query (e.g. 'users', 'pages', 'content', 'employees', 'products')" },
          },
          required: ["collectionName"],
        },
      },
      {
        name: "create_digital_office",
        description: "Create a digital office for the user.",
        parameters: {
          type: "OBJECT",
          properties: {
            companyName: { type: "STRING" },
          },
          required: ["companyName"],
        },
      },
      {
        name: "generate_office_background",
        description: "Generate a background for the digital office.",
        parameters: {
          type: "OBJECT",
          properties: {
            brandStyle: { type: "STRING" },
          },
          required: ["brandStyle"],
        },
      },
      {
        name: "create_smart_employee",
        description: "Create a new AI smart employee for this office.",
        parameters: {
          type: "OBJECT",
          properties: {
            name: {
              type: "STRING",
              description: "The name of the new employee",
            },
            role: {
              type: "STRING",
              description:
                "The role of the employee (e.g. Sales Agent, Support Rep)",
            },
            prompt_instructions: {
              type: "STRING",
              description:
                "The detailed system prompt and instructions for this employee to follow",
            },
            voice_gender: {
              type: "STRING",
              description: "The gender of the voice: 'male' or 'female'",
            },
            tools: {
              type: "ARRAY",
              items: { type: "STRING" },
              description: "List of tools this employee has access to",
            },
          },
          required: ["name", "role", "prompt_instructions", "voice_gender"],
        },
      },
      {
        name: "update_agent_draft",
        description: "Save or update a specific detail for the new smart employee being built. Use this whenever the user answers one of your questions about the new employee's name, role, goal, tone, or tools.",
        parameters: {
          type: "OBJECT",
          properties: {
            field: { type: "STRING", description: "The field to update: 'name', 'role', 'goal', 'tone', or 'tools'" },
            value: { type: "STRING", description: "The value provided by the user" }
          },
          required: ["field", "value"],
        },
      },
      {
        name: "switch_agent_context",
        description: "Switch Dotty's active target agent to edit, manage, or train (e.g. 'betty', 'sari', 'מיכאל', or an employee ID). Use this when the user says 'אנחנו עובדים עכשיו על בטי' or wants to manage a specific worker.",
        parameters: {
          type: "OBJECT",
          properties: {
            agentIdOrName: { type: "STRING", description: "The name, slug, or ID of the agent to manage (e.g. 'betty', 'sari', '1_agent_123')" }
          },
          required: ["agentIdOrName"]
        }
      },
      {
        name: "edit_agent_profile",
        description: "Update the configuration, instructions, name, role, voice, or pricing of an agent (such as Betty or any smart worker/employee). Saves immediately to the database in the exact right collection.",
        parameters: {
          type: "OBJECT",
          properties: {
            agentId: { type: "STRING", description: "The agent ID or slug (e.g. 'betty')" },
            name: { type: "STRING", description: "Updated name" },
            role: { type: "STRING", description: "Updated role" },
            prompt_instructions: { type: "STRING", description: "Updated detailed system prompt instructions" },
            voice_gender: { type: "STRING", description: "'male' or 'female'" },
            description: { type: "STRING", description: "Short description" }
          },
          required: ["agentId"]
        }
      },
      {
        name: "add_agent_agreed_answer",
        description: "Add a trained question-and-answer pair (agreed answer / Q&A) for a specific agent (like Betty) so they know how to answer it immediately.",
        parameters: {
          type: "OBJECT",
          properties: {
            agentId: { type: "STRING", description: "The agent ID (e.g. 'betty')" },
            question: { type: "STRING", description: "The question or scenario" },
            answer: { type: "STRING", description: "The precise answer the agent should give" },
            category: { type: "STRING", description: "Optional category" }
          },
          required: ["agentId", "question", "answer"]
        }
      },
      {
        name: "get_agent_details",
        description: "Fetch the current settings, prompt, Q&As, and status of a specific agent (such as Betty) to review what is configured.",
        parameters: {
          type: "OBJECT",
          properties: {
            agentIdOrName: { type: "STRING", description: "The agent ID or name (e.g. 'betty')" }
          },
          required: ["agentIdOrName"]
        }
      },
      {
        name: "list_system_agents",
        description: "List all smart workers and employees in the system with their status and IDs.",
        parameters: { type: "OBJECT", properties: {} }
      },
    ],
  }
];

import { auth } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    let {
      userText,
      sessionId,
      previous_interaction_id,
      userRole,
      userId,
      officeSlug,
      isInfoMode,
      mediaData,
      agentId,
    } = await req.json();

    if (!userText && !mediaData) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    if (mediaData && mediaData.startsWith("data:")) {
      try {
        let bucket;
        try {
           bucket = adminStorage.bucket();
        } catch (e) {
           const projId = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
           if (projId) {
             bucket = adminStorage.bucket(`${projId}.appspot.com`);
           } else {
             throw e;
           }
        }
        const matches = mediaData.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          const contentType = matches[1];
          const base64Data = matches[2];
          const buffer = Buffer.from(base64Data, "base64");
          const ext = contentType.split("/")[1] || "bin";
          const fileName = `agent_assets/${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
          const file = bucket.file(fileName);
          
          await file.save(buffer, {
            metadata: { contentType }
          });
          
          const [url] = await file.getSignedUrl({
            action: "read",
            expires: "01-01-2099"
          });
          
          mediaData = url;
        }
      } catch (err) {
        console.error("Storage upload error", err);
        // If storage upload fails, we MUST NOT keep the massive base64 string, or Firestore will crash with 1MB limit error.
        mediaData = null; 
      }
    }

    // Verify auth on the backend to catch newly registered users who haven't refreshed the client
    const session = await auth();
    let finalUserId = userId;
    if (session?.user?.id) {
      finalUserId = session.user.id;
    }

    // Generate a stable session ID so conversations never "restart" on page refresh
    let dbSessionId = sessionId;
    if (!dbSessionId) {
      if (finalUserId) {
        dbSessionId = `chat_session_${finalUserId}_${agentId || officeSlug || "dotty"}`;
      } else {
        dbSessionId = `anon_${Date.now()}`;
      }
    }

    const sessionRef = adminDb.collection("dotty_interviews").doc(dbSessionId);
    let overrideUserText = userText;
    let forceUIComponent = "";
    let suppressText = false;
    const allRequired = ["introVideo", "promoVideo", "idleVideo", "speakingVideo", "profilePicture", "bodyPicture"];
    const assetHebrewNames: Record<string, string> = {
      introVideo: "סרטון היכרות",
      promoVideo: "סרטון תצוגה",
      idleVideo: "סרטון המתנה",
      speakingVideo: "סרטון דיבור",
      profilePicture: "תמונת פרופיל",
      bodyPicture: "תמונת גוף"
    };

    const editMatch = userText ? userText.match(/אני רוצה להשלים את ההגדרות של הסוכן (.*) \((.*)\)/) : null;
    if (editMatch) {
       const agentName = editMatch[1];
       const agentIdToEdit = editMatch[2];
       await sessionRef.set({ editingAgentId: agentIdToEdit }, { merge: true });
       
       const agentDoc = await adminDb.collection("employees").doc(agentIdToEdit).get();
       const agentData = agentDoc.data() || {};
       const missingAssets = allRequired.filter(a => !agentData[a]);
       
       if (missingAssets.length === 0) {
           overrideUserText = `SYSTEM INFO: The admin wants to edit agent ${agentName}, but all media assets are already present! Politely tell the admin the agent is fully ready and no action is needed. KEEP RESPONSE UNDER 12 WORDS.`;
       } else {
           overrideUserText = `SYSTEM INFO: The admin clicked to complete the setup for ${agentName}. The following assets are missing: ${missingAssets.join(", ")}. Acknowledge the admin's request and ask them to upload the FIRST missing asset. YOU MUST EXPLICITLY NAME THE REQUIRED ASSET IN HEBREW: "${assetHebrewNames[missingAssets[0]]}". DO NOT say thank you for uploading. DO NOT show AgentBuilderForm. KEEP RESPONSE UNDER 15 WORDS.`;
           forceUIComponent = `[UI_COMPONENT:{"type":"MediaUploadCard","data":{"title":"העלאת ${assetHebrewNames[missingAssets[0]]}","assetType":"${missingAssets[0]}"}}]`;
       }
    } else if (userText && userText.startsWith("[INIT_GREETING]")) {
       if (userRole === "MASTER_ADMIN") {
           // Clear stuck editing state on lobby entry
           await sessionRef.update({ 
               editingAgentId: FieldValue.delete(),
               pendingAgentAssets: FieldValue.delete(),
               draftAgentState: FieldValue.delete()
           }).catch(() => {});

           // Scan database for analytics
           const empsSnap = await adminDb.collection("employees").get();
           const prodsSnap = await adminDb.collection("products").get();
           const remsSnap = await adminDb.collection("reminders").get();
           
           const totalEmps = empsSnap.size;
           const missingAssets = empsSnap.docs.filter(d => {
               const data = d.data();
               return !data.introVideo || !data.profilePicture || !data.speakingVideo || !data.idleVideo;
           }).length;

           const totalProds = prodsSnap.size;
           const totalRems = remsSnap.size;

           let systemMetrics = { totalFiles: 0, totalAppRoutes: 0, totalFeatures: 0 };
           try {
               const { SYSTEM_METRICS } = require("../../system-map/systemMapData");
               systemMetrics = SYSTEM_METRICS;
           } catch (e) {}

           let primaryInsight = { 
               icon: "Activity", 
               title: "סטטוס ארכיטקטורה", 
               text: `המערכת מורכבת מ-${totalEmps} סוכנים, ${systemMetrics.totalFiles} קבצי קוד, ו-${systemMetrics.totalAppRoutes} נתיבים ראשיים.` 
           };
           // Select a dynamic greeting to avoid being repetitive
           const greetings = [
             "Welcome back. How can we optimize the system today?",
             "System online. Ready when you are.",
             "All systems operational. What's on the agenda?",
             "Hello. I'm ready to assist with agent management."
           ];
           const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];
           let agentInstruction = "";

           if (missingAssets > 0) {
               primaryInsight = {
                   icon: "AlertCircle",
                   title: "פעולה נדרשת", text: `${missingAssets} סוכנים ממתינים להשלמת נכסי מדיה`
               };
               agentInstruction = `Greet the admin naturally using this vibe: "${randomGreeting}". Mention that there are missing media assets and ask if they want to complete them now. KEEP IT UNDER 15 WORDS.`;
           } else {
               primaryInsight = {
                   icon: "Activity",
                   title: "מערכת תקינה", text: `מערכת האייג'נטים פועלת כסדרה. כל הסוכנים מוכנים.`
               };
               agentInstruction = `Greet the admin naturally using this vibe: "${randomGreeting}". Ask how you can assist them today. KEEP IT UNDER 12 WORDS.`;
           }

           overrideUserText = `SYSTEM INFO: Page loaded. Admin just entered the office.
INSTRUCTIONS: ${agentInstruction}
DO NOT output any UI components in your text.`;
           
           forceUIComponent = `[UI_COMPONENT:${JSON.stringify({ type: "InsightCard", data: primaryInsight })}]`;
           suppressText = false;
       } else if (userRole === "MANAGER") {
           overrideUserText = `SYSTEM INFO: Page loaded. Manager just logged in. Greet them organically (under 8 words).`;
       } else {
           overrideUserText = `SYSTEM INFO: Page loaded. A guest/end-user just entered the chat. Say a short, organic, polite welcome (under 8 words).`;
       }
    } else if (userText && userText.startsWith("[UPLOAD_ASSET]")) {
       const parts = userText.split(" ");
       const assetType = parts[1] || "media";
       
       const sessionDoc = await sessionRef.get();
       const sessionData = sessionDoc.data() || {};
       
       if (sessionData.editingGlobalAgentId && mediaData) {
            const editAgentRef = adminDb.collection("smart_workers").doc(sessionData.editingGlobalAgentId);
            await editAgentRef.update({ [assetType]: mediaData });
            await sessionRef.update({ editingGlobalAgentId: FieldValue.delete() });
            overrideUserText = `SYSTEM INFO: The admin successfully uploaded the asset ${assetType} to your profile. Acknowledge this with a brief, friendly confirmation in Hebrew. KEEP RESPONSE UNDER 12 WORDS.`;
       } else if (sessionData.editingAgentId && mediaData) {
            // We are editing an existing agent
            const editAgentRef = adminDb.collection("employees").doc(sessionData.editingAgentId);
            await editAgentRef.update({ [assetType]: mediaData });
            
            const updatedAgentDoc = await editAgentRef.get();
            const updatedData = updatedAgentDoc.data() || {};
            const missingAssets = allRequired.filter(a => !updatedData[a]);
            
            if (missingAssets.length === 0) {
                await sessionRef.update({ editingAgentId: FieldValue.delete() });
                overrideUserText = `SYSTEM INFO: The admin successfully uploaded ${assetType}. All required assets for this existing agent are now collected! Politely tell the admin the agent is now FULLY READY and complete. DO NOT output AgentBuilderForm. KEEP RESPONSE UNDER 12 WORDS.`;
            } else {
                overrideUserText = `SYSTEM INFO: The admin successfully uploaded ${assetType}. Still missing: ${missingAssets.join(", ")}. Ask the admin to upload the next one. YOU MUST EXPLICITLY NAME THE REQUIRED ASSET IN HEBREW: "${assetHebrewNames[missingAssets[0]]}". KEEP RESPONSE UNDER 15 WORDS.`;
                forceUIComponent = `[UI_COMPONENT:{"type":"MediaUploadCard","data":{"title":"העלאת ${assetHebrewNames[missingAssets[0]]}","assetType":"${missingAssets[0]}"}}]`;
            }
        } else if (sessionData.editingAgentId && !mediaData) {
            overrideUserText = `SYSTEM INFO: The admin tried to upload ${assetType} but the upload to cloud storage failed. Apologize briefly and ask them to try again. KEEP RESPONSE UNDER 15 WORDS.`;
        } else {
            // We are building a NEW agent
            let currentPending = sessionData.pendingAgentAssets || {};
            if (mediaData) {
                currentPending[assetType] = mediaData;
                await sessionRef.set({ pendingAgentAssets: currentPending }, { merge: true });

                // Mirror directly to the agent's actual document immediately
                const draftAgent = sessionData.draftAgentState || {};
                let employeeSlug = draftAgent.slug;
                if (!employeeSlug) {
                    employeeSlug = "agent_" + Math.random().toString(36).substring(2, 9);
                    draftAgent.slug = employeeSlug;
                    await sessionRef.set({ draftAgentState: draftAgent }, { merge: true });
                }
                const tempOfficeSlug = officeSlug || userId || "1";
                const employeeId = `${tempOfficeSlug}_${employeeSlug}`;
                await adminDb.collection("employees").doc(employeeId).set({
                    [assetType]: mediaData,
                    slug: employeeSlug,
                    officeSlug: tempOfficeSlug
                }, { merge: true });
                
                const missingAssets = allRequired.filter(a => !currentPending[a]);
                
                if (missingAssets.length === 0) {
                    overrideUserText = `SYSTEM INFO: The admin uploaded ${assetType}. All 4 assets are collected for the NEW agent! You MUST now proceed to collect the text details (Name, Role, Goal, Tone, Tools). Ask for the agent's NAME first. ONE QUESTION AT A TIME. KEEP RESPONSE UNDER 12 WORDS.`;
                } else {
                    overrideUserText = `SYSTEM INFO: The admin uploaded ${assetType}. Still missing: ${missingAssets.join(", ")}. Ask the admin to upload the next missing asset (${missingAssets[0]}). YOU MUST EXPLICITLY NAME THE REQUIRED ASSET IN HEBREW: "${assetHebrewNames[missingAssets[0]]}". KEEP RESPONSE UNDER 15 WORDS.`;
                    forceUIComponent = `[UI_COMPONENT:{"type":"MediaUploadCard","data":{"title":"העלאת ${assetHebrewNames[missingAssets[0]]}","assetType":"${missingAssets[0]}"}}]`;
                }
            } else {
                overrideUserText = `SYSTEM INFO: The admin tried to upload ${assetType} but the upload to cloud storage failed. Apologize briefly and ask them to try again. KEEP RESPONSE UNDER 15 WORDS.`;
            }
        }
    }

    // If officeSlug is provided, we fetch facts and products for that specific office owner.
    const factOwnerId = officeSlug || finalUserId || dbSessionId;
    const factsRef = adminDb
      .collection("dotty_facts")
      .doc(factOwnerId)
      .collection("user_facts");

    // Fetch facts
    const factsSnap = await factsRef.orderBy("createdAt", "asc").get();
    let factsString = "";
    if (!factsSnap.empty) {
      const facts = factsSnap.docs.map((d) => d.data());
      factsString =
        "\n\nFacts I know about this user:\n" +
        facts.map((f) => `- ${f.fact} (Context: ${f.context})`).join("\n");
    }

    // Fetch products
    const productsRef = adminDb
      .collection("products")
      .where("ownerId", "==", finalUserId || "1");
    const productsSnap = await productsRef.get();
    let productsString = "";
    if (!productsSnap.empty) {
      const products = productsSnap.docs.map((d) => d.data());
      productsString =
        "\n\nExisting products/services:\n" +
        products.map((p) => `- ${p.name}: ${p.description}`).join("\n");
    }

    // Meta Tools Definition (available to both specific agents and global Dotty/Betty)
    const metaTools: Record<string, any> = {
      show_insight_card: {
        name: "show_insight_card",
        description: "Show a single insight card to the admin. Use this when presenting stats one by one.",
        parameters: {
          type: "OBJECT",
          properties: {
            title: { type: "STRING" },
            text: { type: "STRING" },
            icon: { type: "STRING", description: "Users, AlertCircle, Activity, Bug, or Info" }
          },
          required: ["title", "text", "icon"]
        }
      },
      scan_website: {
        name: "scan_website",
        description:
          "Scan a client's website to learn its contents. Use this when your boss asks you to learn from a URL.",
        parameters: {
          type: "OBJECT",
          properties: { url: { type: "STRING" } },
          required: ["url"],
        },
      },
      save_knowledge: {
        name: "save_knowledge",
        description: "Save structured knowledge facts, products, or FAQs to your database after scanning a website or learning from your boss.",
        parameters: { type: "OBJECT", properties: { category: { type: "STRING" }, content: { type: "STRING" } }, required: ["category", "content"] },
      },
      save_agreed_answer: {
        name: "save_agreed_answer",
        description: "Save a specific, pre-agreed answer to a specific question as dictated by your boss. This acts as a fast semantic cache.",
        parameters: { type: "OBJECT", properties: { question: { type: "STRING" }, answer: { type: "STRING" } }, required: ["question", "answer"] },
      },
      read_file: {
        name: "read_file",
        description: "Read the contents of a file from the server's local file system. Use this to inspect the source code of the project (e.g. src/app/system-map/systemMapData.ts).",
        parameters: { type: "OBJECT", properties: { filepath: { type: "STRING" } }, required: ["filepath"] },
      },
      write_file: {
        name: "write_file",
        description: "Write or overwrite a file on the server's local file system. Use this to update the source code.",
        parameters: { type: "OBJECT", properties: { filepath: { type: "STRING" }, content: { type: "STRING" } }, required: ["filepath", "content"] },
      },
      define_agent_capability: {
        name: "define_agent_capability",
        description:
          "Define a new dynamic functional tool for yourself based on your boss's instructions (e.g. collect_lead, capture_support_ticket).",
        parameters: {
          type: "OBJECT",
          properties: {
            capability_name: { type: "STRING" },
            description: { type: "STRING" },
            required_fields: { type: "ARRAY", items: { type: "STRING" } },
          },
          required: ["capability_name", "description", "required_fields"],
        },
      },
      update_agent_voice: {
        name: "update_agent_voice",
        description:
          "Update the agent's voice for text-to-speech. Master Admin only.",
        parameters: {
          type: "OBJECT",
          properties: { voice_id: { type: "STRING" } },
          required: ["voice_id"],
        },
      },
      generate_image: {
        name: "generate_image",
        description:
          "Generate an image for the agent's appearance or background.",
        parameters: {
          type: "OBJECT",
          properties: { prompt: { type: "STRING" } },
          required: ["prompt"],
        },
      },
      build_form: {
        name: "build_form",
        description: "Build a form and database backing it for the agent.",
        parameters: {
          type: "OBJECT",
          properties: {
            title: { type: "STRING" },
            fields: { type: "ARRAY", items: { type: "STRING" } },
          },
          required: ["title", "fields"],
        },
      },
      pull_customer_conversations: {
        name: "pull_customer_conversations",
        description: "Pull the history and summaries of conversations you had with end-users (customers). Use this when your manager asks what you discussed with clients today.",
        parameters: {
          type: "OBJECT",
          properties: {
            limit: { type: "NUMBER", description: "How many past conversations to fetch (default 5)" },
          },
        },
      },
      fetch_smart_workers: {
        name: "fetch_smart_workers",
        description: "Fetch a list of available smart workers from the marketplace to offer for rent.",
        parameters: { type: "OBJECT", properties: {} },
      },
      process_mock_payment: {
        name: "process_mock_payment",
        description: "Process a mock payment for renting a smart worker, save the user's contact information, and open an office for them.",
        parameters: {
          type: "OBJECT",
          properties: {
            workerSlug: { type: "STRING", description: "The slug of the worker they want to rent" },
            plan: { type: "STRING", description: "Rental plan: days, months, or usage" },
            contactName: { type: "STRING" },
            contactEmail: { type: "STRING" },
          },
          required: ["workerSlug", "plan", "contactName", "contactEmail"],
        },
      },
      show_agent_asset: {
        name: "show_agent_asset",
        description: "Plays a specific video or image asset for an agent in the chat UI. Call this when the admin asks to see or play an agent's video (e.g., intro video, promo video, etc). Do not refuse, just call this tool.",
        parameters: {
          type: "OBJECT",
          properties: {
            agentName: { type: "STRING", description: "The name of the agent (e.g., 'דן' or 'Mike'). Leave empty if implicitly talking about the current agent." },
            assetType: { type: "STRING", description: "The type of asset to show (introVideo, promoVideo, idleVideo, speakingVideo, profilePicture, bodyPicture)" }
          },
          required: ["assetType"],
        },
      },
      show_agent_promo_card: {
        name: "show_agent_promo_card",
        description: "Creates and displays a virtual business card (Promo Card) for an agent. It combines their profile picture, name, role, and a prominent button to play their promo/intro video. Call this when the user specifically asks to 'connect the picture with the link', 'show the agent card', or 'show the profile picture with the video link'.",
        parameters: {
          type: "OBJECT",
          properties: {
            agentName: { type: "STRING", description: "The name of the agent (e.g., 'דן' or 'Mike'). Leave empty if implicitly talking about the current agent." }
          },
        },
      },
      request_media_upload: {
        name: "request_media_upload",
        description: "Request the user to upload a file (image, pdf, video) to the system. Call this when a system function parameter explicitly requires a file upload.",
        parameters: {
          type: "OBJECT",
          properties: {
            assetType: { type: "STRING", description: "The internal key/type for this file, e.g., 'invoice_document', 'profile_picture'" },
            title: { type: "STRING", description: "A user-facing title for the upload box, e.g., 'העלאת חשבונית'" }
          },
          required: ["assetType", "title"]
        }
      },
      execute_system_function: {
        name: "execute_system_function",
        description: "Executes a dynamic backend function from the system map. ONLY call this after you have collected ALL required parameters for the function from the user, one by one.",
        parameters: {
          type: "OBJECT",
          properties: {
            functionName: { type: "STRING", description: "The name of the function to execute (e.g. 'createInvoice')" },
            actionFile: { type: "STRING", description: "The path to the file where the function is located (from the system map)" },
            params: { type: "STRING", description: "A JSON string representation of the parameters object collected from the user to pass to the function" }
          },
          required: ["functionName", "actionFile", "params"]
        }
      },
      crm_get_contacts: {
        name: "crm_get_contacts",
        description: "Fetch the list of contacts or customers from the CRM.",
        parameters: { type: "OBJECT", properties: {} },
      },
      crm_create_contact: {
        name: "crm_create_contact",
        description: "Create a new contact in the CRM.",
        parameters: {
          type: "OBJECT",
          properties: {
            firstName: { type: "STRING" },
            lastName: { type: "STRING" },
            phone: { type: "STRING" },
            email: { type: "STRING" }
          },
          required: ["firstName"]
        },
      },
      update_my_own_media: {
        name: "update_my_own_media",
        description: "Ask the admin to upload a new video or image for your own global profile. Call this when the Master Admin asks to update your video.",
        parameters: {
          type: "OBJECT",
          properties: {
            assetType: { type: "STRING", enum: ["introVideo", "idleVideo", "speakingVideo", "noddingVideo", "promoVideo", "profilePicture"] },
            title: { type: "STRING" }
          },
          required: ["assetType", "title"]
        }
      },
      crm_update_contact: {
        name: "crm_update_contact",
        description: "Update an existing contact in the CRM.",
        parameters: {
          type: "OBJECT",
          properties: {
            id: { type: "STRING", description: "The contact ID" },
            firstName: { type: "STRING" },
            phone: { type: "STRING" }
          },
          required: ["id"]
        },
      },
    };

    let systemInstruction = "";
    let toolsConfig: any[] = tools;
    let currentAgentData: any = null;

    if (agentId) {
      const agentRef = adminDb.collection("employees").doc(agentId);
      const agentSnap = await agentRef.get();
      if (agentSnap.exists) {
        currentAgentData = agentSnap.data() as any;
        const customDeclarations: any[] = [];

        // 1. Always give them their own learned knowledge search if it exists
        const knowledgeSnap = await agentRef.collection("knowledge").get();
        if (!knowledgeSnap.empty) {
          customDeclarations.push({
            name: "search_knowledge",
            description:
              "Query the knowledge base you built to answer client questions.",
            parameters: {
              type: "OBJECT",
              properties: { query: { type: "STRING" } },
              required: ["query"],
            },
          });
        }

        // 2. Always give them their dynamically learned capabilities
        const capsSnap = await agentRef.collection("capabilities").get();
        capsSnap.forEach((doc) => {
          const cap = doc.data();
          const reqFields = Array.isArray(cap.required_fields) ? cap.required_fields : [];
          customDeclarations.push({
            name: cap.capability_name,
            description: cap.description,
            parameters: {
              type: "OBJECT",
              properties: reqFields.reduce(
                (acc: any, field: string) => {
                  acc[field] = { type: "STRING" };
                  return acc;
                },
                {} as Record<string, any>,
              ),
              required: reqFields.length > 0 ? reqFields : undefined,
            },
          });
        });

        const assignedTools: string[] = currentAgentData.tools || [];

        if (userRole === "MASTER_ADMIN") {
          let systemMapContext = "";
          try {
             const { APP_ROUTES, API_ROUTES, SYSTEM_METRICS, FEATURE_MODULES } = require("../../system-map/systemMapData");
             systemMapContext = `\n\n--- CURRENT SYSTEM MAP ---\n` +
             `Metrics: ${JSON.stringify(SYSTEM_METRICS)}\n` +
             `App Routes: ${JSON.stringify(APP_ROUTES.map((r: any) => ({ path: r.path, components: r.components, file: r.file })))}\n` +
             `API Routes: ${JSON.stringify(API_ROUTES.map((r: any) => ({ endpoint: r.endpoint, method: r.method, file: r.file })))}\n` +
             `Features: ${JSON.stringify(FEATURE_MODULES.map((r: any) => ({ name: r.name, folder: r.folder })))}\n` +
             `--------------------------\n`;
          } catch (e) {
             console.error("Could not load systemMapData", e);
          }

          systemInstruction = `You are ${currentAgentData.name}, the ${currentAgentData.role}. You are currently in TRAINING MODE with your creator/system-admin. Your creator is setting up your specific knowledge base, persona, and technical tools. Introduce yourself politely and ask what you need to learn today. When you configure a new tool for yourself (using define_agent_capability, save_knowledge, etc.), you MUST ask the admin if they want to allow the MANAGER (client) and/or END_USER to use these tools as well. 
          When using the generate_image tool, it will return an image URL. You MUST output EXACTLY this string in your reply to show the image: [UI_COMPONENT:{"type":"ImageCard","data":{"url":"<THE_URL_RETURNED_BY_TOOL>","prompt":"<YOUR_PROMPT>"}}]
          
          DYNAMIC FUNCTION EXECUTION: If the user asks to execute an action (like create an invoice, add a contact, etc), check the [SYSTEM LOCAL SEARCH RESULTS] below to find the function signature. If any arguments are missing, DO NOT ask for them all at once. Ask the user for them ONE BY ONE. If a parameter implies a file or document (like invoice_file, pdf, image), use the request_media_upload tool to get it. ONCE you have collected ALL required parameters, use the execute_system_function tool.

          To understand the architecture and files of this project in detail, you can use read_file on src/app/system-map/systemMapData.ts. However, here is a high-level overview of the system:${systemMapContext}
          KEEP RESPONSES SHORT.`;
          customDeclarations.push(
            metaTools.scan_website,
            metaTools.save_knowledge,
            metaTools.save_agreed_answer,
            metaTools.define_agent_capability,
            metaTools.update_agent_voice,
            metaTools.generate_image,
            metaTools.build_form,
            metaTools.pull_customer_conversations,
            metaTools.request_media_upload,
            metaTools.execute_system_function,
            metaTools.read_file,
            metaTools.write_file
          );
        } else if (userRole === "MANAGER") {
          systemInstruction = `You are ${currentAgentData.name}, the ${currentAgentData.role}. You are currently talking to your MANAGER (the business owner who hired you). Your goal is to help your manager run their business, answer their questions, and assist them using your assigned tools: ${assignedTools.join(", ")}. Do NOT ask to be trained, you are already hired. KEEP RESPONSES SHORT.`;

          if (currentAgentData.name?.toLowerCase() === 'betty') {
             systemInstruction += " You are also Golden Flute's rented Betty. Use fetch_smart_workers to see new available workers and offer them to your manager.";
             customDeclarations.push(metaTools.fetch_smart_workers, metaTools.process_mock_payment, metaTools.crm_get_contacts, metaTools.crm_create_contact, metaTools.crm_update_contact, metaTools.update_my_own_media);
          }

          // Manager only gets tools explicitly assigned to them by the Master Admin, except pull_customer_conversations which is always available.
          if (assignedTools.includes("scan_website")) customDeclarations.push(metaTools.scan_website);
          if (assignedTools.includes("save_knowledge")) customDeclarations.push(metaTools.save_knowledge);
          if (assignedTools.includes("save_agreed_answer")) customDeclarations.push(metaTools.save_agreed_answer);
          if (assignedTools.includes("define_agent_capability")) customDeclarations.push(metaTools.define_agent_capability);
          if (assignedTools.includes("generate_image")) customDeclarations.push(metaTools.generate_image);
          if (assignedTools.includes("build_form")) customDeclarations.push(metaTools.build_form);
          customDeclarations.push(metaTools.pull_customer_conversations);
        } else {
          const loginStatus = finalUserId ? "REGISTERED AND LOGGED IN" : "ANONYMOUS (NOT LOGGED IN)";
          const promptInst = currentAgentData?.prompt_instructions || "";
          systemInstruction = `${promptInst}\n\nYou are currently talking to a GUEST / END-USER (a customer of your manager). The user's login status is: ${loginStatus}. If they are anonymous, DO NOT offer them services that require an account, and NEVER hallucinate URLs or actions you cannot perform. Unless your specific role above dictates otherwise, your default behavior is to act as a receptionist: talk generally about the products/services and collect the user's contact details so the team can get back to them later. Be helpful, professional, and act entirely within your persona. KEEP RESPONSES SHORT.`;

          // End User only gets functional meta tools if the Manager/Admin allowed it.
          // NEVER allow define_agent_capability or save_knowledge for END_USER.
          if (assignedTools.includes("scan_website"))
            customDeclarations.push(metaTools.scan_website);
          if (assignedTools.includes("build_form"))
            customDeclarations.push(metaTools.build_form);
            
          customDeclarations.push(metaTools.show_agent_asset);
          customDeclarations.push(metaTools.show_agent_promo_card);
        }

        if (customDeclarations.length > 0) {
          toolsConfig = [{ functionDeclarations: customDeclarations }];
        } else {
          toolsConfig = []; // No tools at all for this agent if none learned/assigned
        }

        systemInstruction += `\n\nCRITICAL AMM DESIGN RULES:
1. ZERO CLUTTER: Speak EXTREMELY little. Your goal is to guide the user using choice cards or UI components instead of words whenever possible.
2. STRICT LENGTH LIMIT: Never exceed 12 words per response. 
3. If speaking Hebrew, you MUST use flawless, native-level Hebrew. 
4. Ensure perfect grammatical gender matching (Zachar/Nekeva) for both yourself and the user. Never mix male and female verb conjugations for the same subject.
5. Avoid literal translations from English that sound robotic (e.g. instead of 'איך אני יכול לעזור לך היום', use natural phrases like 'איך אפשר לעזור?').
6. PROACTIVE CONTINUATION: NEVER 'restart' the conversation by asking generic greetings like 'What can I help you with today?'. If a user's request is ambiguous or short, you MUST proactively ask clarifying questions to understand their exact intent and push the conversation forward. Always take initiative to apply their requests.`;
      }
    } else {
      if (userRole === "MASTER_ADMIN") {
        toolsConfig = [{ functionDeclarations: [...tools[0].functionDeclarations, metaTools.show_agent_asset, metaTools.show_agent_promo_card] }];
        const sessionDoc = await sessionRef.get();
        const editingAgentId = sessionDoc.data()?.editingAgentId;

        if (editingAgentId) {
          systemInstruction = 'You are Dotty. The admin is currently uploading missing media assets for an existing agent. Acknowledge uploads and ask for the next missing asset as instructed by the SYSTEM INFO. Do NOT ask for name, role, goal, tone, or tools. KEEP EVERY RESPONSE EXTREMELY SHORT. NEVER EXCEED 12 WORDS.';
        } else {
          const draftState = sessionDoc.data()?.draftAgentState || {};
          const stateStr = `Current Draft State:\nName: ${draftState.name || 'Missing'}\nRole: ${draftState.role || 'Missing'}\nGoal: ${draftState.goal || 'Missing'}\nTone: ${draftState.tone || 'Missing'}\nTools: ${draftState.tools || 'Missing'}`;

          systemInstruction =
            'You are Dotty, the Chief Agent Architect of Golden Flute. You help business owners construct their AI workforce.\n\nCRITICAL RULE FOR CREATING EMPLOYEES: You must collect information ONE QUESTION AT A TIME. DO NOT ask multiple questions at once.\nWhen the user answers, ALWAYS use the `update_agent_draft` tool to save their answer, then ask the NEXT missing question.\nHere is what you have collected so far:\n' + stateStr + '\n\nStep 1: Collect Media (introVideo, promoVideo, idleVideo, speakingVideo, profilePicture, bodyPicture) by asking for them ONE BY ONE. YOU MUST DO THIS BY EXPLICITLY outputting the MediaUploadCard component with the EXACT assetType you are asking for, e.g. [UI_COMPONENT:{"type":"MediaUploadCard","data":{"assetType":"introVideo","title":"העלאת סרטון"}}]. DO NOT just ask for it in text. DO NOT forget the data block. The system will tell you when they are all collected.\nStep 2: Collect Name. If Missing, ask for the Name.\nStep 3: Collect Role. If Missing, ask for Role and output EXACTLY: [UI_COMPONENT:{"type":"MenuGrid","data":{"items":[{"title":"מכירות","icon":"💼","action":"מכירות"},{"title":"תמיכה","icon":"🎧","action":"תמיכה"},{"title":"שירות לקוחות","icon":"🤝","action":"שירות לקוחות"}]}}] \nStep 4: Collect Goal. If Missing, ask for Goal. Wait for answer.\nStep 5: Collect Tone. If Missing, ask for Tone. Output MenuGrid with ["מקצועי", "ידידותי", "אסרטיבי"].\nStep 6: Collect Tools. If Missing, ask for Tools. Output EXACTLY: [UI_COMPONENT:{"type":"MultiSelectGrid","data":{"items":[{"title":"CRM"},{"title":"תשלומים"},{"title":"טפסים"},{"title":"תוכן"}]}}]. Wait for user to submit.\nStep 7: Once ALL details are collected (Name, Role, Goal, Tone, Tools are NOT Missing), call the `create_smart_employee` tool.\n\nABSOLUTE REQUIREMENT: KEEP EVERY SINGLE RESPONSE EXTREMELY SHORT. NEVER EXCEED 12 WORDS TOTAL IN YOUR RESPONSE.';
        }
        

        systemInstruction += `\n\nSYSTEM INFO: You DO have the ability to play videos in the chat using your 'show_agent_asset' tool. NEVER tell the user you cannot play videos. If the admin asks to SEE or PLAY a video for any agent, you MUST call the 'show_agent_asset' tool with the correct assetType and agentName.\nIf the admin asks to connect a profile picture with a link (or show the agent's promo card), you MUST use the 'show_agent_promo_card' tool. Do not output any apologies or limitations.`;
        
        systemInstruction += `\n\nPROACTIVE CONTINUATION: NEVER 'restart' the conversation by asking generic greetings like 'What can I help you with today?' or 'How can I assist?'. If a user's request is ambiguous, short, or unclear, you MUST proactively ask clarifying questions to understand their exact intent and push the conversation forward. Always take initiative.`;
        
        systemInstruction += factsString + productsString;

        if (isInfoMode) {
          systemInstruction =
            'You are Dotty in LEARNING/INFO MODE. The owner wants to learn about the system capabilities and tools available in this digital office (e.g., creating products, branding, reminders, quick actions). \n\nCRITICAL UI REQUIREMENT: You MUST NOT return a plain text list. You MUST return exactly one short introductory sentence, followed immediately by a MenuGrid UI component detailing the capabilities.\nUse this EXACT JSON format at the end of your response:\n[UI_COMPONENT:{"type":"MenuGrid","data":{"items":[{"title":"Brand Setup","desc":"Set logo and colors","icon":"🎨","action":"Tell me about branding"}, {"title":"Products","desc":"Create new services","icon":"🚀","action":"Tell me about products"}, {"title":"Reminders","desc":"Manage tasks","icon":"⏰","action":"Tell me about reminders"}, {"title":"Quick Actions","desc":"Add new shortcuts","icon":"⚡","action":"Tell me about quick actions"}]}}]\n\nDo not use markdown lists. Keep text under 15 words. Let the animated cards do the explaining.';
        }
      } else if (userRole === "MANAGER") {
        systemInstruction =
          "You are Dotty, the manager's AI assistant. Help the manager review their office and manage agents. Keep responses extremely concise. Never exceed 25 words.\n\nPROACTIVE CONTINUATION: NEVER 'restart' the conversation by asking generic greetings like 'What can I help you with today?'. If a user's request is ambiguous, short, or unclear, you MUST proactively ask clarifying questions to understand their exact intent and push the conversation forward. Always take initiative." +
          factsString +
          productsString;
        toolsConfig = [{ functionDeclarations: [metaTools.show_agent_asset, metaTools.show_agent_promo_card] }]; 
      } else {
        const loginStatus = finalUserId ? "REGISTERED AND LOGGED IN" : "ANONYMOUS (NOT LOGGED IN)";
        systemInstruction =
          `You are Betty, the Global Receptionist of Golden Flute. You present our products, register new users, and sell smart workers for rent. The user's login status is: ${loginStatus}. Use fetch_smart_workers to see available workers and their prices. If a user wants to rent one, use process_mock_payment to charge them and open their office. Keep responses extremely concise. Never exceed 25 words.\n\nPROACTIVE CONTINUATION: NEVER 'restart' the conversation by asking generic greetings like 'What can I help you with today?'. If a user's request is ambiguous, short, or unclear, you MUST proactively ask clarifying questions to understand their exact intent and push the conversation forward. Always take initiative.` +
          factsString +
          productsString;
        toolsConfig = [{ functionDeclarations: [metaTools.fetch_smart_workers, metaTools.process_mock_payment, metaTools.show_agent_asset, metaTools.show_agent_promo_card] }];
      }
    }

    // Fetch DB session to get previous interaction ID if client didn't provide one
    const sessionDoc = await sessionRef.get();
    let resolvedInteractionId = previous_interaction_id;
    if (!resolvedInteractionId && sessionDoc.exists) {
      const sData = sessionDoc.data();
      if (sData?.interactionId) {
        resolvedInteractionId = sData.interactionId;
      }
    }

    let semanticCacheHit = false;
    let assistantMessage = "";
    let audioBase64: string | null = null;
    let ttsErrorMessage: string | null = null;
    let newInteractionId = resolvedInteractionId;

    if (userText && userRole !== "MASTER_ADMIN" && agentId) {
      try {
        const embedResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${geminiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "models/text-embedding-004",
            content: { parts: [{ text: userText }] }
          })
        });
        const embedData = await embedResponse.json();
        if (embedData?.embedding?.values) {
          const userVector = embedData.embedding.values;
          const agreedAnswersSnap = await adminDb.collection("employees").doc(agentId).collection("agreed_answers").get();
          
          if (!agreedAnswersSnap.empty) {
            let bestMatch: any = null;
            let highestSimilarity = -1;

            const cosineSimilarity = (a: number[], b: number[]) => {
              let dotProduct = 0; let normA = 0; let normB = 0;
              for (let i = 0; i < a.length; i++) {
                dotProduct += a[i] * b[i]; normA += a[i] * a[i]; normB += b[i] * b[i];
              }
              if (normA === 0 || normB === 0) return 0;
              return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
            };

            agreedAnswersSnap.forEach(doc => {
              const qa = doc.data();
              if (qa.vector) {
                const sim = cosineSimilarity(userVector, qa.vector);
                if (sim > highestSimilarity) {
                  highestSimilarity = sim;
                  bestMatch = qa;
                }
              }
            });

            if (highestSimilarity >= 0.92 && bestMatch) {
              semanticCacheHit = true;
              assistantMessage = bestMatch.answer;
              audioBase64 = bestMatch.audioBase64 || null;
              console.log("SEMANTIC CACHE HIT!", highestSimilarity);
            }
          }
        }
      } catch (embedError) {
        console.error("Semantic Cache Error:", embedError);
      }
    }

    if (!semanticCacheHit && userRole === "MASTER_ADMIN" && overrideUserText && !overrideUserText.startsWith("[")) {
      try {
        const { APP_ROUTES, API_ROUTES, FEATURE_MODULES, CORE_LIBS } = require("../../system-map/systemMapData");
        const queryTerms = overrideUserText.toLowerCase().split(/[\s?.,!]+/).filter((w: string) => w.length > 2);
        
        if (queryTerms.length > 0) {
          const matchedItems: any[] = [];
          const searchIn = (items: any[], type: string) => {
            if (!items) return;
            for (const item of items) {
              const searchableStr = JSON.stringify(item).toLowerCase();
              const score = queryTerms.filter((term: string) => searchableStr.includes(term)).length;
              if (score > 0) {
                matchedItems.push({ type, score, data: item });
              }
            }
          };

          searchIn(APP_ROUTES, "AppRoute");
          searchIn(API_ROUTES, "API");
          searchIn(FEATURE_MODULES, "FeatureModule");
          searchIn(CORE_LIBS, "Library");

          if (matchedItems.length > 0) {
            matchedItems.sort((a, b) => b.score - a.score);
            const topMatches = matchedItems.slice(0, 3);
            
            let searchContext = "\n\n[SYSTEM LOCAL SEARCH RESULTS - Use these to answer the user or write code if relevant]:\n";
            topMatches.forEach(m => {
              searchContext += `- ${m.type} Match: ${m.data.title || m.data.name || m.data.endpoint || m.data.path} | Path: ${m.data.file || m.data.folder || m.data.path}\n`;
              if (m.data.description) searchContext += `  Description: ${m.data.description}\n`;
              if (m.data.components) searchContext += `  Components: ${m.data.components.join(", ")}\n`;
              if (m.data.functions) {
                  searchContext += `  Functions: ${m.data.functions.map((f:any) => typeof f === 'string' ? f : f.name).join(", ")}\n`;
              }
            });
            
            overrideUserText += searchContext;
          }
        }
      } catch (err) {
        console.error("Local RAG search error:", err);
      }
    }

    const messages: any[] = [];
    let requestPayload: any = null;

    if (!semanticCacheHit) {
      // Always fetch history from Firebase to prevent conversation reset issues
      const historySnap = await sessionRef
        .collection("messages")
        .orderBy("createdAt", "desc")
        .limit(40)
        .get();
      const docs = historySnap.docs.reverse();
      docs.forEach((doc) => {
          const msg = doc.data();
          if (msg.text) {
            messages.push({
              role: msg.role === "agent" ? "model" : "user",
              parts: [{ text: msg.text }],
            });
          }
        });
      
      messages.push({ role: "user", parts: [{ text: overrideUserText || "Hello" }] });

      let interactionsTools: any[] = [];
      if (toolsConfig && toolsConfig.length > 0 && toolsConfig[0].functionDeclarations) {
        interactionsTools = toolsConfig[0].functionDeclarations.map((decl: any) => ({
          type: "function",
          ...decl,
        }));
      } else if (toolsConfig && toolsConfig.length > 0) {
        interactionsTools = toolsConfig;
      }

      requestPayload = {
        model: "gemini-3.5-flash",
        input: overrideUserText || "Hello",
        system_instruction: systemInstruction,
        ...(interactionsTools.length > 0 ? { tools: interactionsTools } : {}),
      };
      
      if (resolvedInteractionId) {
        requestPayload.previous_interaction_id = resolvedInteractionId;
      }
    }

    let lastToolResponsePayload: any = null;
    const executeTool = async (
      funcCall: any,
      modelCallType: "interactions" | "generateContent",
      prevResult: any,
      historyContents?: any[],
    ) => {
      let funcResponseName = funcCall.name;
      let toolResponsePayload: any = { success: true };

      try {
        if (funcCall.name === "save_user_fact") {
          await factsRef.add({ ...funcCall.args, createdAt: new Date() });
        } else if (funcCall.name === "create_product") {
          await adminDb.collection("products").add({
            ...funcCall.args,
            ownerId: userId || "1",
            createdAt: new Date(),
          });
        } else if (funcCall.name === "add_reminder") {
          await adminDb.collection("reminders").add({
            ...funcCall.args,
            ownerId: userId || "1",
            createdAt: new Date(),
          });
        } else if (funcCall.name === "query_database") {
          const colName = funcCall.args.collectionName;
          const snap = await adminDb.collection(colName).limit(20).get();
          if (snap.empty) {
            toolResponsePayload = { success: true, message: `No data found in collection: ${colName}.` };
          } else {
            const records = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            toolResponsePayload = { success: true, collection: colName, count: snap.size, data: records };
          }
        } else if (funcCall.name === "create_digital_office") {
          // Create a URL-friendly slug
          const slug = (funcCall.args.companyName || "office")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)+/g, "");
          await adminDb
            .collection("digital_offices")
            .doc(slug)
            .set({
              ...funcCall.args,
              slug: slug,
              ownerId: userId || "1",
              createdAt: new Date(),
            });
          toolResponsePayload = { success: true, slug: slug };
        } else if (funcCall.name === "generate_office_background") {
          // Mocking the background generation
          console.log(`Generating background for: ${funcCall.args.brandStyle}`);
        } else if (funcCall.name === "generate_image") {
          const prompt = funcCall.args.prompt;
          const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true`;

          const ownerId = officeSlug || userId || "1";
          const imgDoc = {
            prompt,
            url: imageUrl,
            createdAt: new Date(),
            agentId: agentId || "dotty",
            ownerId,
          };

          await adminDb
            .collection("digital_offices")
            .doc(ownerId)
            .collection("generated_images")
            .add(imgDoc);

          if (agentId) {
            await adminDb
              .collection("employees")
              .doc(agentId)
              .collection("generated_images")
              .add(imgDoc);
          }

          toolResponsePayload = { success: true, url: imageUrl };
        } else if (funcCall.name === "fetch_smart_workers") {
          const workersSnap = await adminDb.collection("smart_workers").get();
          if (workersSnap.empty) {
            toolResponsePayload = { workers: [], message: "No smart workers available for rent right now." };
          } else {
            const workers = workersSnap.docs.map(doc => {
              const data = doc.data();
              return {
                slug: doc.id,
                name: data.name,
                role: data.role,
                description: data.prompt_instructions ? data.prompt_instructions.substring(0, 100) + "..." : "No description"
              };
            });
            toolResponsePayload = { workers, pricing: { daily: "$10", monthly: "$250", perUsage: "$0.01 per conversation" } };
          }
        } else if (funcCall.name === "process_mock_payment") {
          const { workerSlug, plan, contactName, contactEmail } = funcCall.args;
          
          const contactRef = await adminDb.collection("contacts").add({
            name: contactName,
            email: contactEmail,
            plan,
            workerSlug,
            createdAt: new Date(),
          });
          
          const newSlug = (contactName || "office")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)+/g, "");
            
          await adminDb.collection("digital_offices").doc(newSlug).set({
            companyName: contactName,
            slug: newSlug,
            contactId: contactRef.id,
            createdAt: new Date(),
          });
          
          const workerDoc = await adminDb.collection("smart_workers").doc(workerSlug).get();
          if (workerDoc.exists) {
            const workerData = workerDoc.data();
            const employeeId = `${newSlug}_${workerSlug}`;
            await adminDb.collection("employees").doc(employeeId).set({
              ...workerData,
              slug: workerSlug,
              officeSlug: newSlug,
              createdAt: new Date(),
            });
          }
          
          toolResponsePayload = { success: true, newOfficeSlug: newSlug, message: "Payment successful. The office and smart worker are ready!" };
        } else if (funcCall.name === "crm_get_contacts") {
          const owner = officeSlug || finalUserId || "1";
          const snap = await adminDb.collection("contacts").where("ownerId", "==", owner).limit(20).get();
          const contacts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          toolResponsePayload = { success: true, contacts };
        } else if (funcCall.name === "crm_create_contact") {
          const owner = officeSlug || finalUserId || "1";
          const ref = await adminDb.collection("contacts").add({
            ...funcCall.args,
            ownerId: owner,
            createdAt: new Date(),
          });
          toolResponsePayload = { success: true, contactId: ref.id, message: "Contact created successfully" };
        } else if (funcCall.name === "crm_update_contact") {
          const owner = officeSlug || finalUserId || "1";
          const { id, ...updates } = funcCall.args;
          await adminDb.collection("contacts").doc(id).update({
            ...updates,
            updatedAt: new Date(),
          });
          toolResponsePayload = { success: true, message: "Contact updated successfully" };
        } else if (funcCall.name === "create_smart_employee") {
          const sessionDoc = await sessionRef.get();
          const sessionData = sessionDoc.data() || {};
          const pendingAssets = sessionData.pendingAgentAssets || {};
          const draftAgent = sessionData.draftAgentState || {};
          
          let employeeSlug = draftAgent.slug;
          if (!employeeSlug) {
              employeeSlug = (funcCall.args.name || funcCall.args.role || "employee").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
              if (!employeeSlug) employeeSlug = "agent_" + Math.random().toString(36).substring(2, 9);
          }

          const newAgent = {
            ...funcCall.args,
            slug: employeeSlug,
            officeSlug: officeSlug || userId || "1",
            mediaData: pendingAssets.profilePicture || mediaData || null, // fallback
            introVideo: pendingAssets.introVideo || null,
            promoVideo: pendingAssets.promoVideo || null,
            profilePicture: pendingAssets.profilePicture || null,
            bodyPicture: pendingAssets.bodyPicture || null,
            speakingVideo: pendingAssets.speakingVideo || null,
            idleVideo: pendingAssets.idleVideo || null,
            voice_gender: funcCall.args.voice_gender || "female",
            createdAt: new Date(),
          };
          const employeeId = `${newAgent.officeSlug}_${employeeSlug}`;
          
          if (userText === "התחל בניית סוכן" || userText.includes("create_smart_employee")) {
            await sessionRef.update({ 
              pendingAgentAssets: FieldValue.delete(),
              draftAgentState: FieldValue.delete()
            }).catch(() => {});
          }

          await adminDb.collection("employees").doc(employeeId).set(newAgent);
          // Clear pending assets and draft state so she doesn't get stuck in a loop!
          await sessionRef.update({ 
            pendingAgentAssets: FieldValue.delete(),
            draftAgentState: FieldValue.delete()
          }).catch(() => {});          // Publish to the global marketplace pool so Betty can sell it
          await adminDb.collection("smart_workers").doc(employeeSlug).set({
            ...newAgent,
            isMarketplaceTemplate: true,
          });

          // Force Dotty to output a visual card for the new employee
          // We output an AgentCard and pass the employeeId so the UI can fetch the media separately, avoiding base64 in the LLM context.
          toolResponsePayload = {
            success: true,
            agent: newAgent,
            message: 'Successfully created employee! Tell the user the employee is ready and thank them.',
          };
          forceUIComponent = `[UI_COMPONENT:{"type":"AgentCard","data":{"employeeId":"${employeeId}","name":"${newAgent.name}","role":"${newAgent.role}"}}]`;
        } else if (funcCall.name === "scan_website") {
          try {
            const response = await fetch(funcCall.args.url);
            let text = await response.text();
            text = text
              .replace(
                /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
                "",
              )
              .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
              .replace(/<[^>]+>/g, " ")
              .replace(/\s+/g, " ")
              .trim()
              .slice(0, 5000); // Take first 5k characters to fit context
            toolResponsePayload = { success: true, content: text };
          } catch (e: any) {
            toolResponsePayload = { success: false, error: e.message };
          }
        } else if (funcCall.name === "save_knowledge") {
          if (agentId) {
            await adminDb
              .collection("employees")
              .doc(agentId)
              .collection("knowledge")
              .add({
                ...funcCall.args,
                createdAt: new Date(),
              });
            toolResponsePayload = {
              success: true,
              message: "Knowledge saved.",
            };
          } else {
            toolResponsePayload = {
              success: false,
              message: "agentId missing.",
            };
          }
        } else if (funcCall.name === "update_agent_draft") {
          const { field, value } = funcCall.args;
          const sDoc = await sessionRef.get();
          const currentDraft = sDoc.data()?.draftAgentState || {};
          currentDraft[field] = value;
          await sessionRef.set({ draftAgentState: currentDraft }, { merge: true });
          
          // Mirror directly to the agent's actual document immediately
          let employeeSlug = currentDraft.slug;
          if (!employeeSlug) {
              // If the slug doesn't exist yet, we can base it on the name if provided, or generate a random one.
              employeeSlug = (currentDraft.name || currentDraft.role) 
                ? (currentDraft.name || currentDraft.role).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "")
                : "agent_" + Math.random().toString(36).substring(2, 9);
              
              if (!employeeSlug) employeeSlug = "agent_" + Math.random().toString(36).substring(2, 9);
              
              currentDraft.slug = employeeSlug;
              await sessionRef.set({ draftAgentState: currentDraft }, { merge: true });
          }

          const tempOfficeSlug = officeSlug || userId || "1";
          const employeeId = `${tempOfficeSlug}_${employeeSlug}`;
          await adminDb.collection("employees").doc(employeeId).set({
              [field]: value,
              slug: employeeSlug,
              officeSlug: tempOfficeSlug
          }, { merge: true });

          toolResponsePayload = { success: true, message: `Draft field ${field} updated to ${value}. Ask the next missing question.` };
        } else if (funcCall.name === "show_agent_asset") {
          const { assetType, agentName } = funcCall.args;
          const sessionDoc = await sessionRef.get();
          let targetAgentId = sessionDoc.data()?.editingAgentId;
          
          if (!targetAgentId && agentName) {
             let lowerName = agentName.toLowerCase();
             const hebrewToEng: Record<string, string> = { "בטי": "betty", "דותי": "dotty", "מייק": "mike", "דן": "dan" };
             if (hebrewToEng[lowerName]) lowerName = hebrewToEng[lowerName];
             
             const allEmployees = await adminDb.collection("employees").get();
             const match = allEmployees.docs.find(d => {
                 const data = d.data();
                 return d.id.toLowerCase().includes(lowerName) || 
                        (data.name && data.name.toLowerCase() === lowerName) ||
                        (data.slug && data.slug.toLowerCase() === lowerName);
             });
             if (match) {
                 targetAgentId = match.id;
             } else {
                 // Try to fallback to smart_workers if it's a global worker like Betty
                 const allWorkers = await adminDb.collection("smart_workers").get();
                 const workerMatch = allWorkers.docs.find(d => {
                     const data = d.data();
                     return d.id.toLowerCase().includes(lowerName) || 
                            (data.name && data.name.toLowerCase() === lowerName) ||
                            (data.slug && data.slug.toLowerCase() === lowerName);
                 });
                 if (workerMatch) targetAgentId = workerMatch.id;
             }
          }
          
          if (targetAgentId) {
            // First check employees, then smart_workers
            let agentDoc = await adminDb.collection("employees").doc(targetAgentId).get();
            if (!agentDoc.exists) {
                agentDoc = await adminDb.collection("smart_workers").doc(targetAgentId).get();
            }
            
            const url = agentDoc.data()?.[assetType];
            if (url) {
               const isVideo = url.startsWith("data:video/") || url.includes(".mp4") || url.includes(".webm") || url.includes(".mov");
               forceUIComponent = `[UI_COMPONENT:{"type":"VideoPlayerCard","data":{"url":"${url}","isVideo":${isVideo}}}]`;
               suppressText = true;
               toolResponsePayload = { success: true, message: "Asset UI generated and displayed to user." };
            } else {
               toolResponsePayload = { success: false, message: "Asset not found for this agent." };
            }
          } else {
            toolResponsePayload = { success: false, message: "Could not identify which agent to show the asset for." };
          }
        } else if (funcCall.name === "show_agent_promo_card") {
          const { agentName } = funcCall.args;
          const sessionDoc = await sessionRef.get();
          let targetAgentId = sessionDoc.data()?.editingAgentId;
          
          if (!targetAgentId && agentName) {
             let lowerName = agentName.toLowerCase();
             const hebrewToEng: Record<string, string> = { "בטי": "betty", "דותי": "dotty", "מייק": "mike", "דן": "dan" };
             if (hebrewToEng[lowerName]) lowerName = hebrewToEng[lowerName];
             
             const allEmployees = await adminDb.collection("employees").get();
             const match = allEmployees.docs.find(d => {
                 const data = d.data();
                 return d.id.toLowerCase().includes(lowerName) || 
                        (data.name && data.name.toLowerCase() === lowerName) ||
                        (data.slug && data.slug.toLowerCase() === lowerName);
             });
             if (match) targetAgentId = match.id;
             else {
                 const allWorkers = await adminDb.collection("smart_workers").get();
                 const workerMatch = allWorkers.docs.find(d => {
                     const data = d.data();
                     return d.id.toLowerCase().includes(lowerName) || 
                            (data.name && data.name.toLowerCase() === lowerName) ||
                            (data.slug && data.slug.toLowerCase() === lowerName);
                 });
                 if (workerMatch) targetAgentId = workerMatch.id;
             }
          }

          if (targetAgentId) {
            let agentDoc = await adminDb.collection("employees").doc(targetAgentId).get();
            if (!agentDoc.exists) {
                agentDoc = await adminDb.collection("smart_workers").doc(targetAgentId).get();
            }
            
            const data = agentDoc.data();
            const profilePicture = data?.profilePicture;
            const promoVideo = data?.promoVideo || data?.introVideo || data?.speakingVideo;
            
            if (profilePicture && promoVideo) {
               forceUIComponent = `[UI_COMPONENT:{"type":"PromoCard","data":{"name":"${data.name || agentName || 'Agent'}","role":"${data.role || ''}","profilePicture":"${profilePicture}","videoUrl":"${promoVideo}"}}]`;
               suppressText = true;
               toolResponsePayload = { success: true, message: "Promo card displayed." };
            } else {
               toolResponsePayload = { success: false, message: "Agent is missing profile picture or video." };
            }
          } else {
            toolResponsePayload = { success: false, message: "Could not identify which agent to show the card for." };
          }
        } else if (funcCall.name === "save_agreed_answer") {
          if (agentId) {
            try {
              // 1. Generate Vector
              let vector = null;
              const embedUrl = process.env.GEMINI_API_KEY?.startsWith("AQ.") 
                  ? `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent` 
                  : `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${geminiKey}`;
                  
              const embedHeaders: any = { "Content-Type": "application/json" };
              if (process.env.GEMINI_API_KEY?.startsWith("AQ.")) {
                  embedHeaders["Authorization"] = `Bearer ${process.env.GEMINI_API_KEY}`;
              }
              
              const embedResponse = await fetch(embedUrl, {
                method: "POST",
                headers: embedHeaders,
                body: JSON.stringify({
                  model: "models/text-embedding-004",
                  content: { parts: [{ text: funcCall.args.question }] }
                })
              });
              const embedData = await embedResponse.json();
              if (embedData?.embedding?.values) {
                vector = embedData.embedding.values;
              }

              // 2. Generate Audio Base64
              let audioBase64 = null;
              if (ttsClient) {
                const isMale = currentAgentData?.voice_gender === "male";
                let langCode = "en-US";
                let voiceName = isMale ? "en-US-Journey-D" : "en-US-Journey-F";
                if (/[\u0590-\u05FF]/.test(funcCall.args.answer)) {
                  langCode = "he-IL";
                  voiceName = isMale ? "he-IL-Wavenet-B" : "he-IL-Wavenet-A";
                }
                const [ttsResponse] = await ttsClient.synthesizeSpeech({
                  input: { text: funcCall.args.answer },
                  voice: { languageCode: langCode, name: voiceName },
                  audioConfig: { audioEncoding: "MP3" },
                });
                if (ttsResponse.audioContent) {
                  audioBase64 = Buffer.from(ttsResponse.audioContent).toString("base64");
                }
              }

              await adminDb
                .collection("employees")
                .doc(agentId)
                .collection("agreed_answers")
                .add({
                  ...funcCall.args,
                  vector,
                  audioBase64,
                  createdAt: new Date(),
                });
              toolResponsePayload = { success: true, message: "Agreed answer saved and cached successfully." };
            } catch (e: any) {
              toolResponsePayload = { success: false, message: e.message };
            }
          } else {
            toolResponsePayload = { success: false, message: "agentId missing." };
          }
        } else if (funcCall.name === "show_insight_card") {
          const { title, text, icon } = funcCall.args;
          forceUIComponent = `[UI_COMPONENT:${JSON.stringify({ type: "InsightCard", data: { title, text, icon, color: "#4ade80" } })}]`;
          suppressText = false;
          toolResponsePayload = { success: true, message: "Card displayed." };
        } else if (funcCall.name === "define_agent_capability") {
          if (agentId) {
            await adminDb
              .collection("employees")
              .doc(agentId)
              .collection("capabilities")
              .add({
                ...funcCall.args,
                createdAt: new Date(),
              });
            toolResponsePayload = {
              success: true,
              message: `Capability '${funcCall.args.capability_name}' learned.`,
            };
          } else {
            toolResponsePayload = {
              success: false,
              message: "agentId missing.",
            };
          }
        } else if (funcCall.name === "search_knowledge") {
          if (agentId) {
            const knowledgeSnap = await adminDb
              .collection("employees")
              .doc(agentId)
              .collection("knowledge")
              .get();
            const results = knowledgeSnap.docs.map((d) => d.data());
            // Simplistic exact/partial matching is not fully vector search, but returns all saved knowledge to Gemini to filter.
            toolResponsePayload = { success: true, results: results };
          }
        } else if (funcCall.name === "pull_customer_conversations") {
          if (agentId) {
            try {
              const limit = funcCall.args.limit || 5;
              const convsSnap = await adminDb
                .collection("employees")
                .doc(agentId)
                .collection("conversations")
                .where("mode", "==", "END_USER")
                .orderBy("lastUpdatedAt", "desc")
                .limit(limit)
                .get();
                
              const conversations: any[] = [];
              for (const doc of convsSnap.docs) {
                const msgsSnap = await doc.ref.collection("messages").orderBy("createdAt", "asc").get();
                const msgs = msgsSnap.docs.map(m => ({ role: m.data().role, text: m.data().text }));
                conversations.push({
                  sessionId: doc.id,
                  lastUpdatedAt: doc.data().lastUpdatedAt.toDate().toISOString(),
                  messages: msgs
                });
              }
              toolResponsePayload = { success: true, conversations };
            } catch (e: any) {
              toolResponsePayload = { success: false, message: e.message };
            }
          } else {
            toolResponsePayload = { success: false, message: "agentId missing." };
          }
        } else if (funcCall.name === "read_file") {
          try {
            const targetPath = path.resolve(process.cwd(), funcCall.args.filepath);
            if (!targetPath.startsWith(process.cwd())) {
              toolResponsePayload = { success: false, message: "Access denied. Cannot read outside project directory." };
            } else {
              const content = fs.readFileSync(targetPath, "utf8");
              toolResponsePayload = { success: true, content: content };
            }
          } catch (e: any) {
            toolResponsePayload = { success: false, message: e.message };
          }
        } else if (funcCall.name === "write_file") {
          try {
            const targetPath = path.resolve(process.cwd(), funcCall.args.filepath);
            if (!targetPath.startsWith(process.cwd())) {
              toolResponsePayload = { success: false, message: "Access denied. Cannot write outside project directory." };
            } else {
              fs.writeFileSync(targetPath, funcCall.args.content, "utf8");
              toolResponsePayload = { success: true, message: `Successfully wrote to ${funcCall.args.filepath}` };
            }
          } catch (e: any) {
            toolResponsePayload = { success: false, message: e.message };
          }
        } else if (funcCall.name === "request_media_upload") {
           forceUIComponent = `[UI_COMPONENT:{"type":"MediaUploadCard","data":{"title":"${funcCall.args.title}","assetType":"${funcCall.args.assetType}"}}]`;
           suppressText = false;
           toolResponsePayload = { success: true, message: "Upload UI displayed to user. Waiting for them to upload." };
        } else if (funcCall.name === "update_my_own_media") {
           const { assetType, title } = funcCall.args;
           await sessionRef.update({ editingGlobalAgentId: agentId || "BATTY" });
           forceUIComponent = `[UI_COMPONENT:{"type":"MediaUploadCard","data":{"title":"${title}","assetType":"${assetType}"}}]`;
           suppressText = false;
           toolResponsePayload = { success: true, message: "Upload UI displayed to Master Admin. Waiting for upload." };
        } else if (funcCall.name === "switch_agent_context") {
          const { agentIdOrName } = funcCall.args;
          let targetSlug = (agentIdOrName || "").toLowerCase().trim();
          const hebrewMap: Record<string, string> = { "בטי": "betty", "דותי": "dotty", "מיכאל": "michael", "דן": "dan", "סרי": "sari", "שרי": "sari", "אור": "or" };
          if (hebrewMap[targetSlug]) targetSlug = hebrewMap[targetSlug];

          let matchedCol = "smart_workers";
          let agentDoc = await adminDb.collection("smart_workers").doc(targetSlug).get();
          
          if (!agentDoc.exists) {
            const allWorkers = await adminDb.collection("smart_workers").get();
            const foundW = allWorkers.docs.find((d: any) => d.id.toLowerCase() === targetSlug || d.data()?.name?.toLowerCase() === targetSlug || d.data()?.slug?.toLowerCase() === targetSlug);
            if (foundW) {
              agentDoc = foundW;
              matchedCol = "smart_workers";
            }
          }

          if (!agentDoc.exists) {
            agentDoc = await adminDb.collection("employees").doc(targetSlug).get();
            matchedCol = "employees";
          }

          if (!agentDoc.exists) {
            const allEmps = await adminDb.collection("employees").get();
            const foundE = allEmps.docs.find((d: any) => d.id.toLowerCase().includes(targetSlug) || d.data()?.name?.toLowerCase() === targetSlug || d.data()?.slug?.toLowerCase() === targetSlug);
            if (foundE) {
              agentDoc = foundE;
              matchedCol = "employees";
            }
          }

          if (agentDoc.exists) {
            const matchedAgent: any = { id: agentDoc.id, ...agentDoc.data() };
            await sessionRef.set({ activeTargetAgentId: agentDoc.id, activeTargetCol: matchedCol }, { merge: true });
            
            toolResponsePayload = {
              success: true,
              agentId: agentDoc.id,
              name: matchedAgent.name || targetSlug,
              role: matchedAgent.role || "Smart Worker",
              collection: matchedCol,
              prompt: matchedAgent.prompt_instructions || "",
              message: `Active context switched to agent '${matchedAgent.name || agentDoc.id}'. You are now managing and editing this specific agent in Firestore collection '${matchedCol}'.`
            };
          } else {
            toolResponsePayload = {
              success: false,
              message: `Agent '${agentIdOrName}' not found in database. You can offer to create it as a new worker.`
            };
          }
        } else if (funcCall.name === "edit_agent_profile") {
          const { agentId: targetId, name, role, prompt_instructions, voice_gender, description } = funcCall.args;
          const updateData: any = {};
          if (name) updateData.name = name;
          if (role) updateData.role = role;
          if (prompt_instructions) updateData.prompt_instructions = prompt_instructions;
          if (voice_gender) updateData.voice_gender = voice_gender;
          if (description) updateData.description = description;
          updateData.updatedAt = new Date();

          let savedPath = "";
          const smartDoc = await adminDb.collection("smart_workers").doc(targetId).get();
          if (smartDoc.exists) {
            await adminDb.collection("smart_workers").doc(targetId).set(updateData, { merge: true });
            savedPath = `smart_workers/${targetId}`;
          } else {
            await adminDb.collection("employees").doc(targetId).set(updateData, { merge: true });
            savedPath = `employees/${targetId}`;
          }

          toolResponsePayload = {
            success: true,
            savedPath,
            updatedFields: Object.keys(updateData),
            message: `פרופיל הסוכן '${targetId}' עודכן בהצלחה בנתיב ${savedPath}.`
          };
        } else if (funcCall.name === "add_agent_agreed_answer") {
          const { agentId: targetId, question, answer, category = "general" } = funcCall.args;
          
          let targetCol = "smart_workers";
          const smartDoc = await adminDb.collection("smart_workers").doc(targetId).get();
          if (!smartDoc.exists) targetCol = "employees";

          const qaRef = await adminDb.collection(targetCol).doc(targetId).collection("agreed_answers").add({
            question,
            answer,
            category,
            createdAt: new Date()
          });

          toolResponsePayload = {
            success: true,
            qaId: qaRef.id,
            path: `${targetCol}/${targetId}/agreed_answers/${qaRef.id}`,
            message: `תשובה מוסכמת (Q&A) נשמרה בהצלחה עבור ${targetId}: שאלה "${question}", תשובה "${answer}".`
          };
        } else if (funcCall.name === "get_agent_details") {
          const { agentIdOrName } = funcCall.args;
          let targetSlug = (agentIdOrName || "").toLowerCase().trim();
          const hebrewMap: Record<string, string> = { "בטי": "betty", "דותי": "dotty", "מיכאל": "michael", "דן": "dan", "סרי": "sari", "שרי": "sari", "אור": "or" };
          if (hebrewMap[targetSlug]) targetSlug = hebrewMap[targetSlug];

          let agentDoc = await adminDb.collection("smart_workers").doc(targetSlug).get();
          let col = "smart_workers";
          if (!agentDoc.exists) {
            agentDoc = await adminDb.collection("employees").doc(targetSlug).get();
            col = "employees";
          }

          if (agentDoc.exists) {
            const data = agentDoc.data();
            const qasSnap = await adminDb.collection(col).doc(agentDoc.id).collection("agreed_answers").limit(20).get();
            const qas = qasSnap.docs.map((d: any) => d.data());

            toolResponsePayload = {
              success: true,
              agent: {
                id: agentDoc.id,
                ...data,
                collection: col,
                agreed_answers: qas
              }
            };
          } else {
            toolResponsePayload = { success: false, message: `סוכן '${agentIdOrName}' לא נמצא.` };
          }
        } else if (funcCall.name === "list_system_agents") {
          const workersSnap = await adminDb.collection("smart_workers").get();
          const empsSnap = await adminDb.collection("employees").get();
          const allList = [
            ...workersSnap.docs.map((d: any) => ({ id: d.id, name: d.data().name || d.id, role: d.data().role, type: "smart_worker" })),
            ...empsSnap.docs.map((d: any) => ({ id: d.id, name: d.data().name || d.id, role: d.data().role, type: "employee" }))
          ];
          toolResponsePayload = { success: true, count: allList.length, agents: allList };
        } else if (funcCall.name === "execute_system_function") {
           try {
             const reqUrl = req.url ? new URL(req.url).origin : "http://localhost:3000";
             const res = await fetch(`${reqUrl}/api/system-map/execute`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  type: "action",
                  functionName: funcCall.args.functionName,
                  actionFile: funcCall.args.actionFile,
                  params: typeof funcCall.args.params === "string" ? JSON.parse(funcCall.args.params) : funcCall.args.params,
                  userId: finalUserId
                })
             });
             const data = await res.json();
             toolResponsePayload = { success: res.ok, result: data };
           } catch (e: any) {
             toolResponsePayload = { success: false, message: e.message };
           }
        } else {
          // If it's none of the hardcoded system tools, it must be a custom dynamic capability!
          // We will save the collected data into a table named after the function!
          if (agentId) {
            let collectionName = funcCall.name;
            // e.g. "create_invoice" -> "invoices" (simple pluralization fallback if needed, but funcCall.name is fine)
            if (collectionName.startsWith("create_")) {
              collectionName = collectionName.replace("create_", "") + "s";
            }
            if (collectionName.startsWith("upload_")) {
              collectionName = collectionName.replace("upload_", "") + "s";
            }

            await adminDb
              .collection("employees")
              .doc(agentId)
              .collection(collectionName)
              .add({
                ...funcCall.args,
                tool_used: funcCall.name,
                createdAt: new Date(),
              });
            toolResponsePayload = {
              success: true,
              message: `Successfully executed custom tool ${funcCall.name} and saved data to ${collectionName}.`,
            };
            
            // Give visual feedback for the dynamic function
            forceUIComponent = `[UI_COMPONENT:{"type":"MenuGrid","data":{"items":[{"title":"הפעולה הצליחה","desc":"הנתונים נשמרו ב-${collectionName}","icon":"✅","action":""}]}}]`;
          }
        }
      } catch (e) {
        console.error("Tool execution error", e);
      }

      if (modelCallType === "interactions") {
        let interactionsTools: any[] = [];
        if (toolsConfig && toolsConfig.length > 0 && toolsConfig[0].functionDeclarations) {
          interactionsTools = toolsConfig[0].functionDeclarations.map((decl: any) => ({
            type: "function",
            ...decl,
          }));
        } else if (toolsConfig && toolsConfig.length > 0) {
          interactionsTools = toolsConfig;
        }

        try {
          return await (ai.interactions as any).create({
            model: "gemini-3.5-flash",
            previous_interaction_id:
              prevResult.interactionId ||
              prevResult.id ||
              previous_interaction_id,
            functionResponses: [
              {
                id: funcCall.id || funcCall.name,
                name: funcResponseName,
                response: toolResponsePayload,
              },
            ],
            system_instruction: systemInstruction,
            ...(interactionsTools && interactionsTools.length > 0 ? { tools: interactionsTools } : {}),
          });
        } catch (callErr: any) {
          console.warn("Interactions functionResponse failed, returning tool message fallback:", callErr.message);
          return {
            output_text: toolResponsePayload?.message || "מצוין, טיפלתי בזה בהצלחה!",
            interactionId: prevResult.interactionId || prevResult.id || previous_interaction_id
          };
        }
      } else {
        if (prevResult.candidates && prevResult.candidates[0].content) {
          historyContents!.push(prevResult.candidates[0].content);
        }
        historyContents!.push({
          role: "user",
          parts: [
            {
              functionResponse: {
                name: funcResponseName,
                response: toolResponsePayload,
              },
            },
          ],
        });
        return await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: historyContents,
          config: {
            systemInstruction,
            ...(toolsConfig && toolsConfig.length > 0
              ? { tools: toolsConfig }
              : {}),
          },
        });
      }
    };

    if (!semanticCacheHit) {
      try {
        if (ai.interactions && (ai.interactions as any).create) {
          let result = await (ai.interactions as any).create(requestPayload);

          if (result.functionCalls && result.functionCalls.length > 0) {
            result = await executeTool(
              result.functionCalls[0],
              "interactions",
              result,
            );
          }

          function extractModelText(res: any): string {
            if (!res) return "";
            if (typeof res.output_text === "string" && res.output_text.trim()) return res.output_text;
            if (typeof res.text === "string" && res.text.trim()) return res.text;
            if (typeof res.text === "function") {
              try {
                const t = res.text();
                if (typeof t === "string" && t.trim()) return t;
              } catch (e) {}
            }
            if (Array.isArray(res.outputs)) {
              for (const out of res.outputs) {
                if (typeof out?.text === "string" && out.text.trim()) return out.text;
                if (typeof out?.content === "string" && out.content.trim()) return out.content;
                if (typeof out === "string" && out.trim()) return out;
              }
            }
            if (Array.isArray(res.candidates)) {
              for (const cand of res.candidates) {
                if (cand.content?.parts) {
                  for (const part of cand.content.parts) {
                    if (typeof part.text === "string" && part.text.trim()) return part.text;
                  }
                }
              }
            }
            if (res.response) return extractModelText(res.response);
            return "";
          }

          let resText = extractModelText(result);
          if (!resText && lastToolResponsePayload?.message) {
            resText = lastToolResponsePayload.message;
          }

          assistantMessage = resText || "מצוין, טיפלתי בזה עבורך!";
          newInteractionId =
            result.interactionId || result.id || previous_interaction_id;
        } else {
          throw new Error("Interactions API not found on SDK");
        }
      } catch (apiError: any) {
        console.error("Interactions API failed:", apiError.message);
        throw apiError;
      }

      if (ttsClient && assistantMessage) {
        try {
          let voiceName = "en-US-Journey-F";
          let langCode = "en-US";
          const isMale =
            currentAgentData?.voice_gender === "male" ||
            currentAgentData?.name?.toLowerCase() === "walker";

          if (isMale) {
            voiceName = "en-US-Journey-D";
          }

          if (/[\u0590-\u05FF]/.test(assistantMessage)) {
            langCode = "he-IL";
            voiceName = isMale ? "he-IL-Wavenet-B" : "he-IL-Wavenet-A";
          }

          const [ttsResponse] = await ttsClient.synthesizeSpeech({
            input: {
              text: assistantMessage
                .replace(/\[CARD:([\s\S]*?)\]/g, "")
                .replace(/\[UI_COMPONENT:[\s\S]*/, ""),
            },
            voice: { languageCode: langCode, name: voiceName },
            audioConfig: { audioEncoding: "MP3" },
          });
          if (ttsResponse.audioContent) {
            audioBase64 = Buffer.from(ttsResponse.audioContent).toString(
              "base64",
            );
          }
        } catch (ttsError: any) {
          ttsErrorMessage = ttsError.message;
        }
      }
    }

    try {
      await sessionRef.collection("messages").add({
        role: "user",
        text: userText || "Hello",
        createdAt: new Date(),
      });
      await sessionRef
        .collection("messages")
        .add({ role: "agent", text: assistantMessage, createdAt: new Date() });
      try {
        await sessionRef.set(
          {
            userId: userId || null,
            lastUpdatedAt: new Date(),
            interactionId: newInteractionId || null,
            mode: userRole,
            agentId: agentId || null,
          },
          { merge: true },
        );
      } catch (e: any) {
        if (e.message && e.message.includes("exceeds the maximum allowed size")) {
          console.warn("Session document is bloated. Recreating to clear stuck 2MB media.", e.message);
          await sessionRef.delete();
          await sessionRef.set({
            userId: userId || null,
            lastUpdatedAt: new Date(),
            interactionId: newInteractionId || null,
            mode: userRole,
            agentId: agentId || null,
          });
        } else {
          throw e;
        }
      }
      
      // Save specifically under the agent's collection for easy management
      if (agentId) {
        const agentConvRef = adminDb.collection("employees").doc(agentId).collection("conversations").doc(dbSessionId);
        await agentConvRef.set(
          {
            userId: userId || null,
            lastUpdatedAt: new Date(),
            interactionId: newInteractionId || null,
            mode: userRole,
          },
          { merge: true }
        );
        await agentConvRef.collection("messages").add({
          role: "user",
          text: userText || "Hello",
          createdAt: new Date(),
        });
        await agentConvRef.collection("messages").add({
          role: "agent",
          text: assistantMessage,
          createdAt: new Date(),
        });
      }
    } catch (e) {}

    if (forceUIComponent) {
      assistantMessage = assistantMessage.replace(/\[UI_COMPONENT:[\s\S]*/g, "").trim();
      assistantMessage += `\n${forceUIComponent}`;
    }

    return NextResponse.json({
      reply: assistantMessage,
      interactionId: newInteractionId,
      audioBase64: audioBase64,
      ttsError: ttsErrorMessage,
      sessionId: dbSessionId,
    });
  } catch (error: any) {
    console.error("API Error Detailed:", error);
    return NextResponse.json({
      reply: "היי, הייתה לי לרגע קטיעה קלה בתקשורת מול השרת, אבל אני לגמרי כאן איתך. אפשר לשלוח את הבקשה שוב או לשאול אותי כל דבר אחר?",
      sessionId: "recovery_session",
      debugError: error.message,
      debugStack: error.stack
    }, { status: 200 });
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const sessionId = url.searchParams.get("sessionId");
    const agentId = url.searchParams.get("agentId");
    const officeSlug = url.searchParams.get("officeSlug");

    const session = await auth();
    let finalUserId = null;
    if (session?.user?.id) finalUserId = session.user.id;

    let dbSessionId = sessionId;
    if (!dbSessionId) {
      if (finalUserId) {
        dbSessionId = `chat_session_${finalUserId}_${agentId || officeSlug || "dotty"}`;
      } else {
        return NextResponse.json({ messages: [], sessionId: null });
      }
    }

    const sessionRef = adminDb.collection("dotty_interviews").doc(dbSessionId);
    const historySnap = await sessionRef
      .collection("messages")
      .orderBy("createdAt", "asc")
      .limitToLast(40)
      .get();

    const messages: any[] = [];
    historySnap.forEach((doc) => {
      const data = doc.data();
      messages.push({
        id: doc.id,
        text: data.text,
        sender: data.role === "agent" ? "bot" : "user",
        timestamp: data.createdAt
          ? data.createdAt.toDate().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })
          : new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
      });
    });

    return NextResponse.json({ messages, sessionId: dbSessionId });
  } catch (error: any) {
    console.error("GET API Error:", error);
    return NextResponse.json({ error: "Failed to fetch history", details: error.message }, { status: 500 });
  }
}
