"use server";

import { adminDb } from "@/lib/firebase-admin";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { revalidatePath } from "next/cache";
import { getAiSettings } from "@/features/ai/actions";

export interface LivePost {
  id: string;
  title: string;
  summary: string;
  content: string;
  category: string;
  tags: string[];
  imageUrl?: string;
  published: boolean;
  createdAt: string;
  updatedAt: string;
  formConfig?: any;
}

export async function getAllPosts(): Promise<LivePost[]> {
  try {
    const snapshot = await adminDb.collection("posts").orderBy("createdAt", "desc").get();
    return snapshot.docs.map((doc: any) => {
      const data = doc.data();
      
      // Safely serialize Firestore Timestamp objects to strings to prevent Server Action serialization errors
      const createdAt = data.createdAt?.toDate 
        ? data.createdAt.toDate().toISOString() 
        : typeof data.createdAt === 'string' 
          ? data.createdAt 
          : new Date().toISOString();
          
      const updatedAt = data.updatedAt?.toDate 
        ? data.updatedAt.toDate().toISOString() 
        : typeof data.updatedAt === 'string' 
          ? data.updatedAt 
          : new Date().toISOString();

      return {
        ...data,
        id: doc.id,
        createdAt,
        updatedAt,
      } as LivePost;
    });
  } catch (error) {
    console.warn("Error fetching all posts:", (error as Error).message);
    return [];
  }
}

export async function savePost(id: string, postData: Partial<LivePost>) {
  try {
    const { auth } = await import("@/lib/auth");
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    const docRef = adminDb.collection("posts").doc(id);
    const now = new Date().toISOString();
    await docRef.set(
      {
        ...postData,
        updatedAt: now,
      },
      { merge: true }
    );
    revalidatePath("/dashboard");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error(`Error saving post ${id}:`, error);
    return { success: false, error: (error as Error).message };
  }
}

export async function deletePost(id: string) {
  try {
    const { auth } = await import("@/lib/auth");
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    const docRef = adminDb.collection("posts").doc(id);
    await docRef.delete();
    revalidatePath("/dashboard");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error(`Error deleting post ${id}:`, error);
    return { success: false, error: (error as Error).message };
  }
}

export async function togglePublishPost(id: string, currentState: boolean) {
  return savePost(id, { published: !currentState });
}

// Helper to generate Imagen 3.0 matching hero banner
async function generatePostImageWithAI(prompt: string, apiKey: string) {
  try {
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
      throw new Error(`Gemini Image response error: ${response.statusText}`);
    }

    const data = await response.json();
    const base64Image = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Image) {
      throw new Error("No image data received from Gemini");
    }

    const { adminStorage } = await import("@/lib/firebase-admin");
    const bucket = adminStorage.bucket();
    console.log("USING BUCKET NAME (POSTS):", bucket.name);
    const fileName = `post_${Date.now()}.jpg`;
    const file = bucket.file(`posts/${fileName}`);
    const buffer = Buffer.from(base64Image, "base64");

    await file.save(buffer, {
      metadata: {
        contentType: "image/jpeg",
      },
    });

    const urls = await file.getSignedUrl({
      action: 'read',
      expires: '03-09-2491',
    });
    
    return { success: true, url: urls[0] };
  } catch (error: any) {
    console.error("Post image generation failed:", error.message);
    return { success: false, error: error.message };
  }
}

export async function generatePostWithAI(prompt: string, formConfig?: any) {
  try {
    const { auth } = await import("@/lib/auth");
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    let apiKey = process.env.GEMINI_API_KEY || "";
    if (!apiKey) {
      const aiSettings = await getAiSettings();
      apiKey = aiSettings?.googleAiKey || "";
    }

    if (!apiKey) {
      throw new Error("אופס עדין לא התחברת לשרות הAI שלנו פנו לשירות לקבל הצעה");
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    // Upgraded model to Gemini 3.1 Pro as used in service pages
    const model = genAI.getGenerativeModel({ model: "gemini-3.1-pro-preview" });

    const systemPrompt = `You are a warm, welcoming community leader.
Your task is to write an engaging, inspiring, and beautiful Hebrew community post or update based on the user's prompt.
The tone must be friendly, supportive, and Jewishly rich (using warm expressions like "בס"ד", "שלום לכולם", "שבת שלום", etc. when appropriate).

The response MUST be a valid JSON object matching exactly this structure:
{
  "title": "A beautiful and catchy title in Hebrew",
  "summary": "A 1-2 sentence inviting summary/teaser of the post in Hebrew",
  "content": "The full detailed post content in Hebrew. You can use multiple paragraphs separated by \\n. Make it inspiring, friendly, and substantial (at least 3-4 paragraphs).",
  "category": "Choose exactly one category from: 'פרשת שבוע', 'חדשות הקהילה', 'הלכה יומית', 'חגים ומועדים', 'אירועים'",
  "tags": ["3-4 relevant Hebrew tags/keywords"],
  "imagePrompt": "A highly detailed, gorgeous, and specific English prompt for an image generator (like Imagen) to create a matching high-quality, photorealistic cover image for this post. Emphasize warm golden lighting and atmospheric details. Do not write text/letters inside the image."
}

Return ONLY the raw JSON. No markdown, no wrap in code blocks.`;

    const result = await model.generateContent([systemPrompt, prompt]);
    const responseText = result.response.text().trim().replace(/^```json/, '').replace(/```$/, '').trim();

    const postData = JSON.parse(responseText);
    const id = "post_" + Date.now();

    // Default category fallback gradient
    const categoryGradients: Record<string, string> = {
      "פרשת שבוע": "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      "חדשות הקהילה": "linear-gradient(135deg, #ff9a9e 0%, #fecfef 99%, #fecfef 100%)",
      "הלכה יומית": "linear-gradient(135deg, #f6d365 0%, #fda085 100%)",
      "חגים ומועדים": "linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)",
      "אירועים": "linear-gradient(135deg, #fa709a 0%, #fee140 100%)"
    };

    let imageUrl = categoryGradients[postData.category] || "linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)";

    // Call AI Image generator if imagePrompt is present
    if (postData.imagePrompt) {
      try {
        const imageResult = await generatePostImageWithAI(postData.imagePrompt, apiKey);
        if (imageResult.success && imageResult.url) {
          imageUrl = imageResult.url;
        }
      } catch (err) {
        console.warn("Failed to generate custom image for post, falling back to gradient.", err);
      }
    }

    const dataToSave: LivePost = {
      id,
      title: postData.title,
      summary: postData.summary,
      content: postData.content,
      category: postData.category || "חדשות הקהילה",
      tags: postData.tags || ["חב\"ד", "קהילה"],
      published: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      imageUrl,
      ...(formConfig ? { formConfig } : {})
    };

    await savePost(id, dataToSave);

    return { success: true, post: dataToSave };
  } catch (error: any) {
    console.warn("AI Post Generation failed:", error.message);
    return { success: false, error: error.message };
  }
}
