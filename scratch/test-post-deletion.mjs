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

async function testDeletion() {
  const testId = "temp-test-post-slug";
  
  // 1. Create a test post in 'posts' collection
  console.log("Creating test post...");
  await db.collection("posts").doc(testId).set({
    title: "פוסט בדיקה זמני",
    summary: "זהו פוסט זמני לבדיקת המחיקה",
    type: "post",
    createdAt: new Date().toISOString()
  });
  
  // Verify it exists
  let doc = await db.collection("posts").doc(testId).get();
  if (doc.exists) {
    console.log("Test post created successfully in 'posts' collection!");
  } else {
    throw new Error("Failed to create test post");
  }

  // 2. Perform deletion simulating deleteServicePage
  const type = 'post';
  const collectionName = type === 'landing' ? 'landing' : (type === 'post' ? 'posts' : 'services');
  console.log(`Deleting post using mapped collection name: '${collectionName}'...`);
  
  await db.collection(collectionName).doc(testId).delete();
  
  // 3. Verify it is deleted
  doc = await db.collection("posts").doc(testId).get();
  if (!doc.exists) {
    console.log("SUCCESS: Test post deleted successfully from Firestore!");
  } else {
    throw new Error("FAILURE: Test post still exists in Firestore!");
  }
}

testDeletion().catch(console.error);
