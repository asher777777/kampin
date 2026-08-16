const admin = require("firebase-admin");
const fs = require("fs");

if (fs.existsSync('.env.local')) {
  const envConfig = fs.readFileSync('.env.local', 'utf8').split('\n');
  for (const line of envConfig) {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      process.env[match[1]] = match[2];
    }
  }
}

let app;
if (!admin.apps.length) {
  const privateKeyB64 = process.env.FIREBASE_ADMIN_PRIVATE_KEY_B64;
  let privateKey = "";
  if (privateKeyB64) {
    privateKey = Buffer.from(privateKeyB64, "base64").toString("utf8");
  } else if (process.env.FIREBASE_ADMIN_PRIVATE_KEY) {
    privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, "\n");
  }
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;

  if (projectId && clientEmail && privateKey) {
    app = admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
  } else {
    app = admin.initializeApp();
  }
} else {
  app = admin.apps[0];
}

const { getFirestore } = require('firebase-admin/firestore');
const db = getFirestore(app, "default");

async function createDavidOffice() {
  try {
    const slug = "david";
    const officeRef = db.collection("digital_offices").doc(slug);
    
    const davidOfficeData = {
      id: slug,
      slug: slug,
      officeName: "David's office.",
      agentName: "David",
      agentTitle: "Check with David.",
      headerBrand: "M.A.M",
      headerSubtitle: "Smart digital offices",
      tabs: [
        {
          id: "tab-1",
          title: "analyze-mode.",
          subtitle: "user and smart worker conversion",
          mediaType: "image",
          mediaUrl: "/edoffice/ed.webp",
          tools: ["analytics", "data_processor", "conversion_tracker"],
          permissions: ["read", "write"],
          loopMedia: true,
          mutedMedia: true,
          systemPrompt: "You are David, a senior smart worker assistant specialized in data analysis and conversion rate optimization."
        },
        {
          id: "tab-2",
          title: "growth-mode.",
          subtitle: "smart strategy & lead intelligence",
          mediaType: "image",
          mediaUrl: "/edoffice/ed.webp",
          tools: ["lead_gen", "crm_sync", "auto_responder"],
          permissions: ["read", "execute"],
          loopMedia: true,
          mutedMedia: true,
          systemPrompt: "You are David, a growth marketing smart agent assisting with business strategy and automation."
        }
      ],
      ownerId: "system",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await officeRef.set(davidOfficeData, { merge: true });
    console.log(`Successfully created/updated David's office at /office/${slug}`);
  } catch (error) {
    console.error("Error creating David's office:", error);
  }
}

createDavidOffice();
