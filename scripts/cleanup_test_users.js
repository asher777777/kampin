const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const processEnv = {};
env.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) processEnv[match[1]] = match[2].replace(/["'\r]/g, "");
});

const privateKeyB64 = processEnv['FIREBASE_ADMIN_PRIVATE_KEY_B64'];
const clientEmail = processEnv['FIREBASE_ADMIN_CLIENT_EMAIL'];
const projectId = processEnv['FIREBASE_ADMIN_PROJECT_ID'];

const privateKey = Buffer.from(privateKeyB64, 'base64').toString('utf8');

initializeApp({
  credential: cert({ projectId, clientEmail, privateKey }),
  projectId
});

const db = getFirestore();

const GLOBAL_COLLECTIONS = [
  "contacts",
  "landing_pages",
  "form_templates",
  "communities",
  "automations",
  "emails",
  "expenses",
  "services",
  "posts"
];

async function run() {
  console.log("Starting cleanup...");
  const usersSnap = await db.collection("users").get();
  
  const usersToDelete = [];
  usersSnap.forEach(doc => {
    const data = doc.data();
    // Keep 'ovt5771', 'admin', and user ID '1'
    if (doc.id !== "1" && data.username !== "ovt5771" && data.username !== "admin" && data.username !== "ovt5771@gmail.com") {
      usersToDelete.push(doc.id);
      console.log(`Will delete user: ${doc.id} (${data.username})`);
    }
  });

  if (usersToDelete.length === 0) {
    console.log("No test users found to delete.");
    return;
  }

  for (const uid of usersToDelete) {
    console.log(`Cleaning up data for user ${uid}...`);
    
    for (const col of GLOBAL_COLLECTIONS) {
      const snap = await db.collection(col).where("ownerId", "==", uid).get();
      if (!snap.empty) {
        const batch = db.batch();
        snap.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        console.log(`  Deleted ${snap.size} documents from ${col}`);
      }
    }
    
    // Also cleanup if they accidentally saved with ownerId "1" BUT created yesterday?
    // This is riskier. We will only delete what is strictly owned by them for now.
    
    await db.collection("users").doc(uid).delete();
    console.log(`  Deleted user record ${uid}`);
  }
  
  console.log("Cleanup complete!");
}

run().catch(console.error);
