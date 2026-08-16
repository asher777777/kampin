import * as fs from "fs";

// Simple dotenv parser
try {
  const envConfig = fs.readFileSync('.env.local', 'utf8');
  envConfig.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      process.env[match[1]] = match[2].replace(/["'\r]/g, "");
    }
  });
} catch (e) {
  console.log("No .env.local found or error reading it");
}

import { adminDb } from "../src/lib/firebase-admin";

async function run() {
  const snapshot = await adminDb.collection("users").get();
  
  console.log("Total users:", snapshot.size);
  snapshot.docs.forEach((doc: any) => {
    const data = doc.data();
    console.log(`User ID: ${doc.id}, Username: ${data.username}, Role: ${data.role}, CreatedAt: ${data.createdAt}`);
  });
}

run().catch(console.error);
