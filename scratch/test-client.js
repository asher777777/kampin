const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const envLines = env.split('\n');
for (const line of envLines) {
  if (line.includes('=')) {
    const [key, ...val] = line.split('=');
    process.env[key.trim()] = val.join('=').trim();
  }
}

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, getDoc } = require('firebase/firestore');

const firebaseConfig = {
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function test() {
  try {
    const docRef = doc(db, "settings", "ai");
    const docSnap = await getDoc(docRef);
    console.log("Client SDK Doc exists:", docSnap.exists());
  } catch (err) {
    console.error("Client SDK error:", err);
  }
}

test();
