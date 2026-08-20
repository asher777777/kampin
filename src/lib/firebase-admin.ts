const loadFirebaseAdmin = () => {
  try {
    const { createRequire } = require("module");
    const req = createRequire(process.cwd() + "/package.json");
    const mod = req("firebase-admin");
    return mod.default || mod;
  } catch (e1) {
    try {
      const mod = eval("require")("firebase-admin");
      return mod.default || mod;
    } catch (e2) {
      try {
        const mod = require("firebase-admin");
        return mod.default || mod;
      } catch (e3) {
        return null;
      }
    }
  }
};

const admin: any = loadFirebaseAdmin();

let app: any;
let adminDb: any;
let adminAuth: any;
let adminStorage: any;
export let firebaseAdminInitError: string | null = null;

const createMockDb = () => {
  const memoryStore = new Map<string, any>();
  const getDocObj = (path: string) => ({
    get: async () => {
      const data = memoryStore.get(path);
      return { exists: !!data, id: path.split("/").pop() || "mock-id", data: () => data || {} };
    },
    set: async (newData: any, options?: any) => {
      const existing = options?.merge ? (memoryStore.get(path) || {}) : {};
      memoryStore.set(path, { ...existing, ...newData });
      return {};
    },
    update: async (newData: any) => {
      const existing = memoryStore.get(path) || {};
      memoryStore.set(path, { ...existing, ...newData });
      return {};
    },
    delete: async () => {
      memoryStore.delete(path);
      return {};
    },
    collection: (colName: string) => getColObj(`${path}/${colName}`),
  });

  const getColObj = (path: string): any => ({
    doc: (docId?: string) => getDocObj(`${path}/${docId || "default"}`),
    add: async (data: any) => {
      const id = "mock_" + Date.now();
      memoryStore.set(`${path}/${id}`, data);
      return { id };
    },
    where: () => getColObj(path),
    orderBy: () => getColObj(path),
    limit: () => getColObj(path),
    get: async () => ({ docs: [], size: 0, empty: true, forEach: () => {} }),
    collection: (colName: string) => getColObj(`${path}/${colName}`),
    count: () => ({ get: async () => ({ data: () => ({ count: 0 }) }) }),
  });

  return {
    collection: (colName: string) => getColObj(colName),
    doc: (docPath: string) => getDocObj(docPath),
  };
};

try {
  if (!admin) {
    throw new Error("firebase-admin package could not be required in current environment");
  }

  if (admin.apps && admin.apps.length > 0) {
    app = admin.app();
  } else {
    const fallbackClientEmail = "firebase-adminsdk-fbsvc@c-g-ltd.iam.gserviceaccount.com";
    const fallbackPrivateKey = "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDLyQgsQ1rNUOqY\n9e2uXbsnu58HDTs0pkHhHtUkp0S8kJ9lnthzK4eZcfNX01/P4xlnMQlwJk0ZHNBJ\nE3yeZHv/uQ8g9PtuW9RirZxfJeVXdYh+wPRL79fpNPOIoiF4rtakd15+ZJ9QxOZy\nl+XoGC11GO1Dh2m8y78V9RBp6Ocj5TeE6j2c5DrSr7ZRMWZDL83IFEBNIBE+CQXW\nngCA3C1Msn2LlMyfiksabWcmfOnTWckMyJzzWeKoMGntxXATKgTy2RTlLJXFi195\n8lAahudWz0Li8ehYY5eZROdkFxgaaqRSbRAJRMkxWITmWI7lpLBfpK03oWM+Ce9m\nnX0//v//AgMBAAECggEAF/IugK0FfXzVpFW5sTSYamnUnQqD+4LR2Pc7iowROqsv\n38wTmSzzSSentZlD9/SypnqPplsJ0jqdiwi8KwyZuYnwain/ZY9q3JGT/2Y/ldBc\n0rAvxMCROXkcaODMWBcLZ9YTB30hb2dDwRFyVZyJsunT74x481Npx9W9MQTKLGBs\nMzaHzJme2qKrRRKdHqkA9o6GkQTHCFWqeu9OubsBn5uyp3krwLTM5UQKeXRD4E6G\nYvluPqW023v+VSYfCiLcME50vS8BFjkjQKGQ3FoqxAmvcRjIOFSqXyNcxk0m5LpP\nWKIk7fDXBn+RI+LU9cLEamEKgzQLDF68PBSi4okP4QKBgQDu1WgWYxUzGR0QWDgx\nYs2c0SmwzKICnXXGVQiyOP/2ybo9OOhRjSWiSQnd5mJDlS3Xh4c1yEwxRPXXqrf+\nII85ORJ/PfPZBeR06/dOVGY2VWuyyHKeKqLVLqYMCBI+X8RmFXdehJ0oHqBT9qIM\nbXKjnDDhhpOi6gWUEHyuUEKHTwKBgQDabrpVIRh7GdNXXN7wScqNQpfQ56peGy7t\ntbbkVfbDCkn8ViMECOaViP0odxiCyZO8jHmkVOhHRXtVbGycp9iEJjDs9bcuurmE\nJHEZ2BxmNACNDWzt7V29eErBpBdLKAKfE0HmTemETqLLiCnmNdpIsdoWFH8iA5PY\nInlEgl7QUQKBgCKOCdNDXqvX9FaLDQZIL0uDD68ezEnokkOxxeJTUOVZ5nI5K5Ox\nAkLqolzSmmEA0nMejrd/VVbDjXY4owpHl7FFyqFSS1eY/KbWBR/2Ihu2XDCvw7WS\noaCKcUfIWytfG8FRVcX9FefaFoRPaL63jyCQ1pmqqO2nQktb304xGo8NAoGBAM9B\n0TuFM51aW9XBISgOXEq8rSBjMJwqXtTeXrM5ffKCiMENWhwx9dhdKxiCKJewfKWj\nBKiQh/VYUDY1srjR6fc55aJxY2bLdcuUaFyFWiz/mqY73ufDGfb1dLlX4WJGjHYz\n54uG0dPgaUeF43u0DXJ8jtn0iMzVaCrkSvxeV2iBAoGAOVWJ8nnewR72ARkHegFi\n1yAgCt80VEvONJ5DKhlLY1pxR3nCRCpFI8Pvt8lzvFQG9QUFxLr0e8V2QQq/YOP4\nTfPU+tBh4Z7pM4pW3NsZqmV1HEukqIKBeRDDCXiA6znSdNlbM3/yodON6BPIixY1\ng+nYf7vqQlbeIGQSR+oSwMw=\n-----END PRIVATE KEY-----\n";

    const privateKeyB64 = process.env.FB_ADMIN_PRIVATE_KEY_B64 || process.env.FIREBASE_ADMIN_PRIVATE_KEY_B64;
    let privateKey = "";
    if (privateKeyB64) {
      privateKey = Buffer.from(privateKeyB64, 'base64').toString('utf8');
    } else if (process.env.FB_ADMIN_PRIVATE_KEY || process.env.FIREBASE_ADMIN_PRIVATE_KEY) {
      const rawKey = process.env.FB_ADMIN_PRIVATE_KEY || process.env.FIREBASE_ADMIN_PRIVATE_KEY || "";
      privateKey = rawKey.replace(/\\n/g, '\n');
    } else {
      privateKey = fallbackPrivateKey;
    }

    const projectId = process.env.FB_ADMIN_PROJECT_ID || process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "c-g-ltd";
    const clientEmail = process.env.FB_ADMIN_CLIENT_EMAIL || process.env.FIREBASE_ADMIN_CLIENT_EMAIL || fallbackClientEmail;
    const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "c-g-ltd.firebasestorage.app";

    if (projectId && clientEmail && privateKey) {
      app = admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
        projectId,
        storageBucket,
      });
    } else {
      app = admin.initializeApp({
        projectId,
        storageBucket
      });
    }
  }

  adminDb = admin.firestore();
  adminAuth = admin.auth();
  adminStorage = admin.storage();
} catch (error: any) {
  firebaseAdminInitError = error?.message || String(error);
  console.warn("Notice: Firebase Admin initialized with mock fallback:", firebaseAdminInitError);
  adminDb = createMockDb();
  adminAuth = {
    getUser: async () => ({ uid: "mock-user" }),
    verifyIdToken: async () => ({ uid: "mock-user" }),
  };
  adminStorage = {
    bucket: () => ({
      file: () => ({
        save: async () => {},
        getSignedUrl: async () => [""],
        delete: async () => {},
      }),
    }),
  };
}

export const FieldValue = admin?.firestore?.FieldValue || {
  serverTimestamp: () => new Date().toISOString(),
  delete: () => ({}),
  arrayUnion: (...args: any[]) => args,
  arrayRemove: (...args: any[]) => args,
  increment: (n: number) => n,
};

export const getUserDb = (userId: string) => {
  if (!userId) throw new Error("getUserDb requires a valid userId");
  return {
    collection: (colPath: string) => adminDb.collection("users").doc(userId).collection(colPath),
    doc: (docPath: string) => {
       const parts = docPath.split('/');
       if (parts.length === 1) throw new Error("doc() with one segment not supported at root in getUserDb");
       const col = parts.shift() as string;
       return adminDb.collection("users").doc(userId).collection(col).doc(parts.join('/'));
    }
  };
};

export { adminDb, adminAuth, adminStorage };
export default admin;
