const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const envLines = env.split('\n');
for (const line of envLines) {
  if (line.includes('=')) {
    const [key, ...val] = line.split('=');
    process.env[key.trim()] = val.join('=').trim();
  }
}

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const privateKeyB64 = process.env.FIREBASE_ADMIN_PRIVATE_KEY_B64;
let privateKey = "";
if (privateKeyB64) {
  privateKey = Buffer.from(privateKeyB64, 'base64').toString('utf8');
}

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;

console.log("Initializing app with project ID:", projectId);
const app = initializeApp({
  credential: cert({
    projectId,
    clientEmail,
    privateKey,
  }),
  projectId
});

const adminDb = getFirestore(app, "(default)");

async function test() {
  try {
    const docRef = adminDb.collection("automations").doc("YlyrBvR1yAut83arqmHl");
    const docSnap = await docRef.get();
    console.log("Doc exists:", docSnap.exists);
    console.log("Doc data:", docSnap.data());
  } catch (err) {
    console.error("Caught error:", err);
  }
}

test();
