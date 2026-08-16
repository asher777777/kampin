const fs = require('fs');
if (fs.existsSync('.env.local')) {
  const envConfig = fs.readFileSync('.env.local');
  for (const line of envConfig.toString().split('\n')) {
    if (line.trim().length === 0 || line.startsWith('#')) continue;
    const splitIndex = line.indexOf('=');
    if (splitIndex !== -1) {
      const key = line.substring(0, splitIndex).trim();
      const value = line.substring(splitIndex + 1).trim();
      process.env[key] = value.replace(/^['"]|['"]$/g, '');
    }
  }
}

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const privateKeyB64 = process.env.FIREBASE_ADMIN_PRIVATE_KEY_B64;

if (!privateKeyB64) {
    console.error("Missing FIREBASE_ADMIN_PRIVATE_KEY_B64");
    process.exit(1);
}

const privateKey = Buffer.from(privateKeyB64, 'base64').toString('utf8');
const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;

const app = initializeApp({
  credential: cert({
    projectId,
    clientEmail,
    privateKey,
  })
});

const db = getFirestore(app, "default");

const collectionsToMigrate = [
    'contacts', 
    'posts', 
    'automations', 
    'settings', 
    'landing', 
    'orders', 
    'webhooks',
    'mail'
];

async function migrate() {
    const adminId = "1";
    console.log(`Migrating root collections to users/${adminId}/...`);
    
    for (const collName of collectionsToMigrate) {
        console.log(`Processing collection: ${collName}`);
        const snapshot = await db.collection(collName).get();
        if (snapshot.empty) {
            console.log(`  - No documents in ${collName}`);
            continue;
        }

        let count = 0;
        const batch = db.batch();
        // Since batch limit is 500, we'll process iteratively if needed, but for small DB this is fine.
        for (const doc of snapshot.docs) {
            const data = doc.data();
            const newRef = db.collection('users').doc(adminId).collection(collName).doc(doc.id);
            batch.set(newRef, data);
            
            const oldRef = db.collection(collName).doc(doc.id);
            batch.delete(oldRef);
            
            count++;
        }
        
        await batch.commit();
        console.log(`  - Migrated ${count} documents for ${collName}`);
    }
    
    // Create admin user document just in case it doesn't exist
    await db.collection('users').doc(adminId).set({
        username: "admin",
        role: "SUPERADMIN",
        name: "thesuperg",
        createdAt: new Date().toISOString()
    }, { merge: true });

    console.log("Migration complete!");
}

migrate().catch(console.error);
