const admin = require('firebase-admin');
const fs = require('fs');

function loadEnv() {
  const content = fs.readFileSync('.env.local', 'utf8');
  content.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      process.env[match[1].trim()] = match[2].trim();
    }
  });
}
loadEnv();

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
const privateKeyB64 = process.env.FIREBASE_ADMIN_PRIVATE_KEY_B64;

let app;
if (clientEmail && privateKeyB64) {
  const privateKey = Buffer.from(privateKeyB64, 'base64').toString('utf-8');
  app = admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey
    })
  });
} else {
  app = admin.initializeApp({ projectId });
}

const db = admin.firestore();

function getType(val) {
  if (val === null) return 'null';
  if (Array.isArray(val)) return 'array';
  if (val && typeof val === 'object') {
    if (val.toDate) return 'timestamp';
    if (val._firestore) return 'reference';
    return 'object';
  }
  return typeof val;
}

function extractFields(data) {
  const fields = {};
  for (const key of Object.keys(data)) {
    fields[key] = getType(data[key]);
  }
  return fields;
}

async function getCollectionSchema(collectionRef) {
  const schema = {};
  const snapshot = await collectionRef.limit(10).get();
  
  snapshot.docs.forEach(doc => {
    const fields = extractFields(doc.data());
    for (const [key, type] of Object.entries(fields)) {
      if (!schema[key]) schema[key] = new Set();
      schema[key].add(type);
    }
  });

  const finalSchema = {};
  for (const [key, types] of Object.entries(schema)) {
    finalSchema[key] = Array.from(types).join(' | ');
  }

  // Check subcollections on first doc
  const subcollections = [];
  if (snapshot.docs.length > 0) {
    const subcols = await snapshot.docs[0].ref.listCollections();
    for (const subcol of subcols) {
      subcollections.push({
        id: subcol.id,
        schema: await getCollectionSchema(subcol)
      });
    }
  }

  return { fields: finalSchema, subcollections };
}

async function run() {
  try {
    const collections = await db.listCollections();
    const result = {};
    for (const col of collections) {
      console.log('Processing collection:', col.id);
      result[col.id] = await getCollectionSchema(col);
    }
    fs.writeFileSync('schema_output.json', JSON.stringify(result, null, 2));
    console.log('Done! Wrote schema_output.json');
  } catch (e) {
    console.error('Error:', e);
  } finally {
    process.exit();
  }
}

run();
