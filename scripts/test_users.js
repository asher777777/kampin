const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const lines = env.split('\n');
const processEnv = {};
lines.forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) processEnv[match[1]] = match[2].trim();
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
db.collection('users').get().then(snap => {
  snap.forEach(doc => {
    const d = doc.data();
    console.log(`ID: ${doc.id} | USER: ${d.username} | ROLE: ${d.role} | CREATED: ${d.createdAt}`);
  });
}).catch(console.error);
