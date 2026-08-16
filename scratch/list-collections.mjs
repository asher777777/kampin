import fs from 'fs';
import path from 'path';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const envPath = path.resolve('.env.local');
const envConfig = {};
if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, 'utf8');
  envFile.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      envConfig[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, '');
    }
  });
}

const privateKeyBase64 = envConfig.FIREBASE_ADMIN_PRIVATE_KEY_B64;
if (!privateKeyBase64) {
  console.error("No FIREBASE_ADMIN_PRIVATE_KEY_B64 found in .env.local");
  process.exit(1);
}

const privateKey = Buffer.from(privateKeyBase64, 'base64').toString('utf8');

const app = initializeApp({
  credential: cert({
    projectId: envConfig.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    clientEmail: envConfig.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: privateKey,
  }),
});

const db = getFirestore(app, "default");

async function listAll() {
  const collections = ['services', 'landing', 'posts'];
  for (const coll of collections) {
    const snap = await db.collection(coll).get();
    console.log(`\nCollection: ${coll} (${snap.size} documents)`);
    snap.docs.forEach(doc => {
      const data = doc.data();
      console.log(` - ID: ${doc.id}, Type: ${data.type || 'N/A'}, Title: ${data.hero?.title || data.title || 'N/A'}`);
    });
  }
}

listAll().catch(console.error);
