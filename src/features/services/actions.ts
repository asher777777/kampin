"use server";

import { adminDb, adminStorage } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { revalidatePath } from "next/cache";
import { getAiSettings } from "@/features/ai/actions";
import { auth } from "@/lib/auth";
import { addMediaToLibrary } from "@/features/media/actions";

async function getUserId(): Promise<string> {
  const session = await auth();
  if (session?.user?.id) {
    return session.user.id;
  }
  throw new Error("Unauthorized");
}


export async function getServicePage(slug: string) {
  try {
    const docRef = adminDb.collection("services").doc(slug);
    const docSnap = await docRef.get();
    
    if (docSnap.exists) {
      return { ...docSnap.data(), slug: docSnap.id } as any;
    }
    return null;
  } catch (error) {
    console.warn(`Error fetching service content for ${slug}:`, (error as Error).message);
    return null;
  }
}

export async function getAllServices() {
  try {
    const ownerId = await getUserId();
    const [servicesSnap, landingSnap, postsSnap] = await Promise.all([
      adminDb.collection("services").where("ownerId", "==", ownerId).get(),
      adminDb.collection("landing").where("ownerId", "==", ownerId).get(),
      adminDb.collection("posts").where("ownerId", "==", ownerId).get()
    ]);
    
    const services = servicesSnap.docs.map((doc: any) => ({
      ...doc.data(),
      slug: doc.id,
      type: "service"
    })) as any[];
    
    const landingPages = landingSnap.docs.map((doc: any) => ({
      ...doc.data(),
      slug: doc.id,
      type: "landing"
    })) as any[];

    const posts = postsSnap.docs.map((doc: any) => ({
      ...doc.data(),
      slug: doc.id,
      type: "post"
    })) as any[];
    
    return [...services, ...landingPages, ...posts];
  } catch (error) {
    console.warn("Error fetching all services:", (error as Error).message);
    return [];
  }
}

export async function saveServicePage(slug: string, content: any) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");
    
    const cleanContent = JSON.parse(JSON.stringify(content));
    const docRef = adminDb.collection("services").doc(slug);
    await docRef.set({ ...cleanContent, updatedAt: new Date().toISOString() }, { merge: true });
    revalidatePath(`/service/${slug}`);
    revalidatePath(`/services/${slug}`);
    revalidatePath(`/landing/${slug}`);
    revalidatePath("/dashboard/services");
    return { success: true };
  } catch (error: any) {
    console.error(`Error saving service content for ${slug}:`, error);
    throw new Error(error.message || "Failed to save to Firebase");
  }
}

export async function incrementPageView(slug: string, collectionName: string = "services") {
  try {
    const serviceRef = adminDb.collection(collectionName).doc(slug);
    
    // Increment the total views counter
    await serviceRef.set({
      views: FieldValue.increment(1)
    }, { merge: true });

    // Fetch the document to get the ownerId and title
    const docSnap = await serviceRef.get();
    if (docSnap.exists) {
      const data = docSnap.data();
      const ownerId = data?.ownerId || "1";
      const pageTitle = data?.title || slug;
      
      // Log the event to analytics_events for the timeline/graphs
      await adminDb.collection("analytics_events").add({
        ownerId,
        slug,
        collectionName,
        title: pageTitle,
        type: "landing_page_view",
        timestamp: new Date().toISOString()
      });
    }

    return { success: true };
  } catch (error) {
    console.error(`Error incrementing views for ${slug}:`, error);
    return { success: false };
  }
}

export async function deleteServicePage(slug: string, type: string = 'service') {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");
    
    const collectionName = type === 'landing' ? 'landing' : (type === 'post' ? 'posts' : 'services');
    await adminDb.collection(collectionName).doc(slug).delete();
    revalidatePath(`/dashboard/services`);
    return { success: true };
  } catch (error: any) {
    console.error(`Error deleting content for ${slug}:`, error);
    throw new Error(error.message || "Failed to delete from Firebase");
  }
}

export async function generatePageWithAI(
  prompt: string,
  slug: string,
  type: 'service' | 'landing' | 'post',
  tone: string = 'רגיל',
  audience: string = 'כולם',
  selectedSections: string[] = ['hero', 'services', 'contact'],
  painPoint: string = '',
  solution: string = ''
) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    const { checkFeatureLimit } = await import("@/features/users/actions");
    const limitCheck = await checkFeatureLimit(session.user.id!, "ai");
    if (!limitCheck.allowed) {
      return { success: false, error: "LIMIT_REACHED:" + ('message' in limitCheck ? limitCheck.message : "") };
    }

    // Try to get API key from env, then from Firebase settings
    let apiKey = process.env.GEMINI_API_KEY || "";
    if (!apiKey) {
      const aiSettings = await getAiSettings();
      apiKey = aiSettings?.googleAiKey || "";
    }
    
    if (!apiKey) {
      throw new Error("אופס עדין לא התחברת לשרות הAI שלנו פנו לשירות לקבל הצעה");
    }
    
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-3.1-pro-preview" });

    const selectedSectionsList = selectedSections.join(", ");

    let systemPrompt = `You are an expert copywriter and web designer for the number one digital systems and software company. Your goal is to produce extremely high-quality, engaging, professional, and convincing Hebrew content.
Task: Generate the JSON content for a new page based on the user's prompt.
Target Audience: ${audience}
Tone of Voice: ${tone}
${painPoint ? `Target Audience Pain Point / Problem: ${painPoint}` : ''}
${solution ? `Core Solution Offered: ${solution}` : ''}
Page Type: ${type}
User Selected Sections: ${selectedSectionsList}

CRITICAL RULES FOR CONTENT QUALITY & PLACEHOLDERS:
1. Write compelling, human-like Hebrew text. Avoid robotic phrasing. Use rich vocabulary suited for the requested Tone of Voice.
2. If the user's prompt lacks specific details for a certain field, DO NOT leave it blank. Instead, use a generic placeholder sentence in Hebrew (e.g., "כאן יופיע תיאור קצר ומושך על הפעילות שלנו...", "טקסט מורחב על החוויה...", "כותרת ראשית מרשימה").
3. Ensure every section has enough text to look good visually. A paragraph should be at least 2-3 sentences.

CRITICAL RULES FOR REGIONS (SECTIONS) VISIBILITY:
1. ONLY the sections listed in "User Selected Sections" (${selectedSectionsList}) should have \`visible: true\`.
2. ALL other sections MUST have \`visible: false\`.
3. You must completely ignore the default layout rules if they contradict the user's selected sections. The user explicitly chose what to show!

SECTION ORDER RULE (CRITICAL):
You MUST provide a "sectionOrder" array containing exactly these section keys: "hero", "mainContent", "services", "community", "livePosts", "contact", "landingSection", "richContent", "pricing", "timer".
You MUST order this array so that ALL sections with visible=true appear first, and ALL sections with visible=false appear AT THE VERY BOTTOM of the array.

FORM CONFIG RULE:
For sections with forms (contact or landingSection) that are visible, provide a custom "form" object. Set submit_button_text, submit_button_bg_color, and fields (label, type, map_to, required).

JSON Structure Example:
{
  "slug": "short-english-slug",
  "seo": { "title": "כותרת SEO מדויקת ומושכת בעברית", "description": "תיאור SEO עשיר וחכם בעברית המכיל מילות מפתח רלוונטיות" },
  "hero": { "title": "...", "subtitle": "...", "description": "...", "layout": "spatial", "buttonsVisible": true, "primaryButton": { "text": "...", "link": "..." } },
  "mainContent": { "visible": true, "title": "...", "description": "...", "layout": "bento" },
  "services": { "visible": true, "title": "...", "layout": "grid", "items": [{"id":"1", "title":"...", "description":"...", "icon":"Star", "url":"#", "isVisible":true}] },
  "community": { "visible": true, "title": "...", "description": "...", "quote": "...", "layout": "centered", "badgeVisible": false, "buttonVisible": false },
  "livePosts": { "visible": true, "layout": "grid" },
  "contact": { "visible": true, "title": "...", "form": { "enabled": true, "submit_button_text": "שלח", "fields": [] } },
  "landingSection": { "visible": true, "title": "...", "description": "...", "layout": "split-left", "formMode": "visible", "form": { "enabled": true, "submit_button_text": "הירשם", "fields": [] } },
  "richContent": { "visible": true, "heading": "...", "body": "<p>...</p>", "layout": "center" },
  "pricing": { "visible": false, "title": "...", "layout": "grid" },
  "timer": { "visible": false, "title": "...", "date": "2024-12-31" },
  "sectionOrder": ["hero", "richContent", "services", "contact", "mainContent", "community", "landingSection", "livePosts", "pricing", "timer"],
  "imagePrompt": "English prompt for cover image."
}
Return ONLY the JSON. No markdown, no comments.
CRITICAL: You MUST include a "slug" field in the JSON with a short, highly focused English URL slug translated from the page's main topic. You MUST ALSO fill the "seo" object intelligently in Hebrew.`;

    let fullPrompt = prompt;
    if (painPoint) {
      fullPrompt += `\n\nקהל היעד סובל מנקודת החולשה / בעיה הבאה: ${painPoint}`;
    }
    if (solution) {
      fullPrompt += `\n\nהפתרון הגדול שפותר את הבעיה ומענה שצריך להציג: ${solution}`;
    }

    let result;
    let retries = 3;
    let delay = 1000;
    for (let i = 0; i < retries; i++) {
      try {
        result = await model.generateContent({
          contents: [{ role: "user", parts: [{ text: systemPrompt + "\n\n" + fullPrompt }] }],
          safetySettings: [
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
          ],
        });
        break;
      } catch (err: any) {
        if ((err.message?.includes("503") || err.status === 503) && i < retries - 1) {
          console.warn(`Gemini API 503 error, retrying in ${delay}ms... (Attempt ${i + 1}/${retries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2;
        } else {
          throw err;
        }
      }
    }
    let responseText = "";
    try {
      responseText = result.response.text().trim().replace(/^```json/, '').replace(/```$/, '').trim();
    } catch (err: any) {
      if (err.message?.includes("PROHIBITED_CONTENT") || err.message?.includes("Text not available")) {
        throw new Error("מערכת ה-AI של גוגל חסמה את יצירת התוכן בשל מדיניות בטיחות (מילים רגישות בטקסט). אנא נסח מחדש ונסה שנית.");
      }
      throw err;
    }
    
    const generatedData = JSON.parse(responseText);
    
    let imageUrl = "/placeholder.png";
    let imagePrompt = generatedData.imagePrompt || `Professional high quality modern tech photograph of ${generatedData.hero?.title || slug} for a top digital systems company website, innovative atmosphere, sleek lighting, photorealistic, 16:9 aspect ratio`;

    if (imagePrompt) {
      try {
        const imageResult = await generateHeroImageWithAI(imagePrompt);
        if (imageResult.success && imageResult.url) {
          imageUrl = imageResult.url;
        }
      } catch (err) {
        console.warn("Failed to generate custom image, falling back to placeholder.", err);
      }
    }

    if (generatedData.hero) {
      generatedData.hero.imageSrc = imageUrl;
    }

    const collectionMap = {
      'service': 'services',
      'landing': 'landing',
      'post': 'posts'
    };
    
    const collectionName = collectionMap[type] || 'pages';
    
    const finalSlug = slug || generatedData.slug || `page-${Date.now()}`;

    const { savePageConfig } = await import("@/features/home/actions");
    await savePageConfig(collectionName, finalSlug, generatedData);
    
    return { success: true, type, slug: finalSlug };
  } catch (error: any) {
    console.warn("AI Page Generation failed:", error.message);
    return { success: false, error: error.message };
  }
}

export async function generateServiceWithAI(prompt: string, slug: string) {
  return generatePageWithAI(prompt, slug, 'service');
}

export async function generateHeroImageWithAI(prompt: string) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    const { checkFeatureLimit } = await import("@/features/users/actions");
    const limitCheck = await checkFeatureLimit(session.user.id!, "ai");
    if (!limitCheck.allowed) {
      return { success: false, error: "LIMIT_REACHED:" + ('message' in limitCheck ? limitCheck.message : "") };
    }

    let apiKey = process.env.GEMINI_API_KEY || "";
    if (!apiKey) {
      const aiSettings = await getAiSettings();
      apiKey = aiSettings?.googleAiKey || "";
    }
    
    if (!apiKey) {
      throw new Error("אופס עדין לא התחברת לשרות הAI שלנו פנו לשירות לקבל הצעה");
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-3.1-flash-image:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }]
            }
          ]
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMsg = errorData.error?.message || response.statusText;
      
      if (response.status === 429 || String(errorMsg).includes("Resource exhausted") || String(errorMsg).includes("quota")) {
        throw new Error("הגענו למגבלת השימוש (מכסה) של מחולל התמונות של גוגל. אנא נסה שוב מאוחר יותר או הגדל את מכסת ה-API (Quota) במסוף של גוגל קלאוד.");
      }

      throw new Error(`שגיאה ממחולל התמונות של גוגל: ${errorMsg}`);
    }

    const data = await response.json();
    const base64Image = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Image) {
      throw new Error("לא התקבלה תמונה תקינה מהשרת.");
    }

    const { adminStorage } = await import("@/lib/firebase-admin");

    // Save to firebase admin storage
    const bucket = adminStorage.bucket();
    console.log("USING BUCKET NAME:", bucket.name);
    const fileName = `generated_${Date.now()}.jpg`;
    const file = bucket.file(`media/${fileName}`);
    const buffer = Buffer.from(base64Image, "base64");

    await file.save(buffer, {
      metadata: {
        contentType: "image/jpeg",
      },
    });

    // Get signed URL with long expiration (essentially a permanent public download link)
    const urls = await file.getSignedUrl({
      action: 'read',
      expires: '03-09-2491', // far-future date
    });
    const imageUrl = urls[0];

    // Add to the media library so it is visible in the gallery
    await addMediaToLibrary(imageUrl, `AI Hero: ${prompt.slice(0, 30)}`);

    return { success: true, url: imageUrl };
  } catch (error: any) {
    console.error("Image generation action failed:", error);
    return { success: false, error: error.message || "שגיאה לא ידועה" };
  }
}

export async function generateMiniSiteWithAI(
  slug: string,
  companyName: string,
  companyVision: string,
  companyServices: any[],
  globalSettings: any
) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    const { checkFeatureLimit } = await import("@/features/users/actions");
    const limitCheck = await checkFeatureLimit(session.user.id!, "ai");
    if (!limitCheck.allowed) {
      return { success: false, error: "LIMIT_REACHED:" + ('message' in limitCheck ? limitCheck.message : "") };
    }

    let apiKey = process.env.GEMINI_API_KEY || "";
    if (!apiKey) {
      const aiSettings = await getAiSettings();
      apiKey = aiSettings?.googleAiKey || "";
    }
    
    if (!apiKey) {
      throw new Error("אופס עדין לא התחברת לשרות הAI שלנו פנו לשירות לקבל הצעה");
    }
    
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-3.1-pro-preview" });

    // Collect all target audiences from services or general
    const allAudiences = [...new Set(companyServices.flatMap((s: any) => s.targetAudiences || []))].join(", ");

    let systemPrompt = `You are an expert copywriter and web designer for the number one digital systems and software company. Your goal is to produce an extremely high-quality, engaging, professional, and convincing full Hebrew Mini-Site (landing page).
Task: Generate the JSON content for a new full Mini-Site based on the user's business details.
Company Name: ${companyName}
Company Vision: ${companyVision}
Target Audiences: ${allAudiences}

CRITICAL RULES FOR CONTENT QUALITY & PLACEHOLDERS:
1. Write compelling, human-like Hebrew text. Avoid robotic phrasing.
2. The language and tone should perfectly match the company vision and target audience. 
3. ALL PLACEHOLDERS must be relevant to the company and the vision. NEVER use generic "lorem ipsum" or "insert text here".
4. Ensure every section has enough text to look good visually.

CRITICAL RULES FOR REGIONS (SECTIONS) VISIBILITY:
1. You MUST set \`visible: true\` for ALL these sections: "hero", "mainContent", "services", "community", "livePosts", "contact", "landingSection", "richContent".
2. The "services" section should be mapped from the user's actual services. Create 3 service items based on the provided company vision and target audience.

SECTION ORDER RULE (CRITICAL):
You MUST provide a "sectionOrder" array containing exactly these section keys: "hero", "mainContent", "services", "community", "livePosts", "contact", "landingSection", "richContent", "pricing", "timer".

FORM CONFIG RULE:
For sections with forms ("contact" and "landingSection"), provide a custom "form" object mapped to CRM fields 'conta_name', 'conta_phone', 'email':
"form": {
  "enabled": true,
  "submit_button_text": "שלח פרטים",
  "fields": [
    { "label": "שם מלא", "type": "text", "map_to": "conta_name", "required": true },
    { "label": "טלפון", "type": "tel", "map_to": "conta_phone", "required": true },
    { "label": "אימייל", "type": "email", "map_to": "email", "required": false }
  ]
}

JSON Structure Example:
{
  "seo": { "title": "כותרת SEO מדויקת", "description": "תיאור SEO עשיר" },
  "hero": { "title": "...", "subtitle": "...", "description": "...", "layout": "spatial", "buttonsVisible": true, "primaryButton": { "text": "...", "link": "#services" } },
  "mainContent": { "visible": true, "title": "...", "description": "...", "layout": "bento" },
  "services": { "visible": true, "title": "השירותים שלנו", "layout": "grid", "items": [{"id":"1", "title":"...", "description":"...", "icon":"Star", "url":"#", "isVisible":true}] },
  "community": { "visible": true, "title": "...", "description": "...", "quote": "...", "layout": "centered", "badgeVisible": false, "buttonVisible": true, "buttonText": "דברו איתנו בוואטסאפ" },
  "livePosts": { "visible": true, "layout": "grid" },
  "contact": { "visible": true, "title": "צור קשר", "form": { /* see FORM CONFIG RULE */ } },
  "landingSection": { "visible": true, "title": "השאירו פרטים ונחזור אליכם", "layout": "split-left", "formMode": "visible", "form": { /* see FORM CONFIG RULE */ } },
  "richContent": { "visible": true, "heading": "...", "body": "<p>...</p>", "layout": "center" },
  "pricing": { "visible": false },
  "timer": { "visible": false },
  "sectionOrder": ["hero", "richContent", "services", "mainContent", "landingSection", "community", "livePosts", "contact", "pricing", "timer"],
  "imagePrompt": "English prompt for cover image."
}
Return ONLY the JSON. No markdown, no comments.`;

    const userPrompt = `Generate a mini-site for my business. Company Name: ${companyName}. Vision: ${companyVision}. Focus heavily on creating a stunning Hebrew copy and layout.`;

    let result;
    let retries = 3;
    let delay = 1000;
    for (let i = 0; i < retries; i++) {
      try {
        result = await model.generateContent({
          contents: [{ role: "user", parts: [{ text: systemPrompt + "\n\n" + userPrompt }] }],
          safetySettings: [
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
          ],
        });
        break;
      } catch (err: any) {
        if ((err.message?.includes("503") || err.status === 503) && i < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2;
        } else {
          throw err;
        }
      }
    }
    
    if (!result) throw new Error("Failed to generate content.");

    let responseText = "";
    try {
      responseText = result.response.text().trim().replace(/^```json/, '').replace(/```$/, '').trim();
    } catch (err: any) {
      if (err.message?.includes("PROHIBITED_CONTENT") || err.message?.includes("Text not available")) {
        throw new Error("מערכת ה-AI של גוגל חסמה את יצירת התוכן בשל מדיניות בטיחות (מילים רגישות בחזון או בשם העסק). אנא נסח מחדש ונסה שנית.");
      }
      throw err;
    }
    const generatedData = JSON.parse(responseText);
    
    let imageUrl = "/placeholder.png";
    let imagePrompt = generatedData.imagePrompt || `Professional high quality modern tech photograph for ${companyName} website, innovative atmosphere, sleek lighting, photorealistic, 16:9 aspect ratio`;

    if (imagePrompt) {
      try {
        const imageResult = await generateHeroImageWithAI(imagePrompt);
        if (imageResult.success && imageResult.url) {
          imageUrl = imageResult.url;
        }
      } catch (err) {
        console.warn("Failed to generate custom image, falling back to placeholder.", err);
      }
    }

    if (generatedData.hero) {
      generatedData.hero.imageSrc = imageUrl;
    }

    // Set phone number for WhatsApp and Contact sections globally
    if (generatedData.community && globalSettings?.contactWhatsApp) {
      generatedData.community.whatsappNumber = globalSettings.contactWhatsApp;
    }
    if (generatedData.contact) {
      if (globalSettings?.contactPhone) generatedData.contact.phoneVal = globalSettings.contactPhone;
      if (globalSettings?.contactAddress) generatedData.contact.addressVal = globalSettings.contactAddress;
    }

    // Force "form" owner settings if needed, though they map directly to author.
    // By default, the frontend doesn't need to specify `ownerId` in form configuration 
    // since the server Action will use the page's owner.

    const finalSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, "");

    const { savePageConfig } = await import("@/features/home/actions");
    await savePageConfig("landing", finalSlug, generatedData);
    
    return { success: true, slug: finalSlug };
  } catch (error: any) {
    console.error("generateMiniSiteWithAI failed:", error);
    return { success: false, error: error.message };
  }
}

