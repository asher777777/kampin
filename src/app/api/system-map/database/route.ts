import { NextRequest, NextResponse } from 'next/server';
import { adminDb, getUserDb } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

export const KNOWN_COLLECTIONS = [
  // 1. AI Agents, Workers & Conversations
  {
    id: 'employees',
    name: 'עובדים וסוכני AI (Employees)',
    type: 'root',
    description: 'סוכני ה-AI והעובדים החכמים במערכת, כולל תת-קולקציות conversations ו-messages.',
    icon: 'Bot',
    category: 'ai_agents',
    knownSubCollections: ['conversations', 'agreed_answers', 'knowledge', 'capabilities']
  },
  {
    id: 'dotty_interviews',
    name: 'ראיונות ושיחות דותי (Dotty Interviews)',
    type: 'root',
    description: 'שיחות וראיונות של סוכנת ה-AI דותי, מצב שיחה (State) והיסטוריה.',
    icon: 'Sparkles',
    category: 'ai_agents',
    knownSubCollections: ['messages']
  },
  {
    id: 'smart_workers',
    name: 'עובדים חכמים (Smart Workers)',
    type: 'root',
    description: 'סוכנים אוטונומיים והגדרות תפקידים.',
    icon: 'Cpu',
    category: 'ai_agents',
    knownSubCollections: ['tasks', 'conversations']
  },
  {
    id: 'digital_offices',
    name: 'משרדים דיגיטליים (Digital Offices)',
    type: 'root',
    description: 'מתחמי משרד של חברות ועסקים במערכת.',
    icon: 'Building',
    category: 'ai_agents',
    knownSubCollections: ['employees', 'generated_images']
  },

  // 2. Core Users & System
  {
    id: 'users',
    name: 'משתמשים וחשבונות (Users)',
    type: 'root',
    description: 'קולקציית השורש של כלל המשתמשים, הגדרות חשבון, פרופילים ומטבעות.',
    icon: 'Users',
    category: 'core',
    knownSubCollections: ['contacts', 'services', 'posts', 'expenses', 'incomes', 'automations', 'campaigns', 'settings', 'forms']
  },
  {
    id: 'pages',
    name: 'עמודים ודפי נחיתה (Pages / Landing)',
    type: 'root',
    description: 'דפי נחיתה ועמודי תוכן שנשמרו במערכת.',
    icon: 'Globe',
    category: 'content'
  },
  {
    id: 'landing',
    name: 'דפי נחיתה (Landing Pages)',
    type: 'root',
    description: 'דפי נחיתה ייעודיים לשיווק והמרות.',
    icon: 'Layout',
    category: 'content'
  },
  {
    id: 'services',
    name: 'שירותים גלובליים (Global Services)',
    type: 'root',
    description: 'שירותי העסקים השמורים ברמת שורש.',
    icon: 'FileText',
    category: 'content'
  },
  {
    id: 'posts',
    name: 'פוסטים ומאמרים (Posts)',
    type: 'root',
    description: 'פוסטים ובלוגים שפורסמו במערכת.',
    icon: 'BookOpen',
    category: 'content'
  },
  {
    id: 'products',
    name: 'מוצרים וקטלוג (Products)',
    type: 'root',
    description: 'מוצרים ושירותים שנוצרו על ידי דותי וסוכני AI.',
    icon: 'ShoppingBag',
    category: 'content'
  },
  {
    id: 'configs',
    name: 'הגדרות מערכת גלובליות (Configs)',
    type: 'root',
    description: 'הגדרות שבת, קשר, מיתוג גלובלי ופרמטרים מערכתיים.',
    icon: 'Settings',
    category: 'system'
  },
  {
    id: 'system_logs',
    name: 'לוגים ואירועי מערכת (System Logs)',
    type: 'root',
    description: 'תיעוד שגיאות, אירועי אבטחה, וקריאות API חיצוניות.',
    icon: 'Activity',
    category: 'system'
  },
  {
    id: 'reminders',
    name: 'תזכורות ומשימות (Reminders)',
    type: 'root',
    description: 'תזכורות שנקבעו מול סוכני ה-AI.',
    icon: 'Calendar',
    category: 'automation'
  },

  // 3. Sub-collections under users/{userId}
  {
    id: 'contacts',
    name: 'אנשי קשר ולידים (CRM Contacts)',
    type: 'sub',
    description: 'אנשי קשר, לידים, תגיות, ציר זמן וסטטוסי מכירה של המשתמש.',
    icon: 'Users',
    category: 'crm',
    knownSubCollections: ['timeline']
  },
  {
    id: 'expenses',
    name: 'מעקב הוצאות (Expenses)',
    type: 'sub',
    description: 'הוצאות שוטפות, צילומי קבלות, וסיווגי מס של העסק.',
    icon: 'CreditCard',
    category: 'finance'
  },
  {
    id: 'incomes',
    name: 'מעקב הכנסות (Incomes)',
    type: 'sub',
    description: 'הכנסות, עסקאות סליקה מקשר וחשבוניות.',
    icon: 'Coins',
    category: 'finance'
  },
  {
    id: 'automations',
    name: 'חוקי אוטומציה (Automations)',
    type: 'sub',
    description: 'תהליכים אוטומטיים, טריגרים, שלבים ותבניות הודעות.',
    icon: 'Zap',
    category: 'automation'
  },
  {
    id: 'campaigns',
    name: 'קמפיינים ודיוור (Campaigns)',
    type: 'sub',
    description: 'קמפיינים בוואטסאפ ובאימייל, רשימות תפוצה ומסירות.',
    icon: 'MessageSquare',
    category: 'marketing'
  },
  {
    id: 'settings',
    name: 'הגדרות משתמש (Settings)',
    type: 'sub',
    description: 'הגדרות פרופיל אישי, מפתחות קשר, עיצוב מותג וחיבורים.',
    icon: 'Sliders',
    category: 'core'
  },
  {
    id: 'forms',
    name: 'טפסים חכמים (AI Forms)',
    type: 'sub',
    description: 'טפסי הרשמה וטפסי לידים שנבנו במחולל הטפסים של מיכאל.',
    icon: 'Layout',
    category: 'crm'
  }
];

function serializeFirestoreData(obj: any): any {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj?.toDate === 'function') {
    return obj.toDate().toISOString();
  }

  if (typeof obj?._seconds === 'number') {
    return new Date(obj._seconds * 1000).toISOString();
  }

  if (Array.isArray(obj)) {
    return obj.map(serializeFirestoreData);
  }

  if (typeof obj === 'object') {
    const res: any = {};
    for (const [key, value] of Object.entries(obj)) {
      res[key] = serializeFirestoreData(value);
    }
    return res;
  }

  return obj;
}

// Safely delete any document or collection recursively (including nested subcollections)
async function safelyDeletePath(rawPath: string): Promise<{ success: boolean; path: string; error?: string }> {
  const path = rawPath.replace(/^\/+|\/+$/g, '');
  const segments = path.split('/').filter(Boolean);
  if (segments.length === 0) return { success: false, path, error: 'נתיב ריק' };

  try {
    const isDoc = segments.length % 2 === 0;

    // 1. Try Firebase Admin native recursiveDelete
    if (typeof adminDb.recursiveDelete === 'function') {
      const ref = isDoc ? adminDb.doc(path) : adminDb.collection(path);
      await adminDb.recursiveDelete(ref);
      return { success: true, path };
    }

    // 2. Fallback recursive deletion
    if (isDoc) {
      const docRef = adminDb.doc(path);
      try {
        if (typeof docRef.listCollections === 'function') {
          const subCols = await docRef.listCollections();
          for (const subCol of subCols) {
            const subDocs = await subCol.get();
            for (const subDoc of subDocs.docs) {
              await safelyDeletePath(subDoc.ref.path);
            }
          }
        }
      } catch (e) {}
      await docRef.delete();
    } else {
      const colRef = adminDb.collection(path);
      const snapshot = await colRef.get();
      for (const doc of snapshot.docs) {
        await safelyDeletePath(doc.ref.path);
      }
    }
    return { success: true, path };
  } catch (err: any) {
    return { success: false, path, error: err?.message || 'שגיאה במחיקת הנתיב' };
  }
}

// GET: List collections & discover users
export async function GET() {
  const startTime = performance.now();
  try {
    const usersSnap = await adminDb.collection('users').limit(50).get();
    const usersList: any[] = [];
    usersSnap.forEach((doc: any) => {
      const data = doc.data() || {};
      usersList.push({
        id: doc.id,
        name: data.name || data.companyName || data.displayName || `משתמש ${doc.id}`,
        email: data.email || '',
        role: data.role || 'user',
        siteSlug: data.siteSlug || ''
      });
    });

    if (usersList.length === 0) {
      usersList.push({ id: '1', name: 'משתמש ראשי (ברירת מחדל)', role: 'admin' });
    }

    let dynamicRootCollections: string[] = KNOWN_COLLECTIONS.filter(c => c.type === 'root').map(c => c.id);
    try {
      if (typeof adminDb.listCollections === 'function') {
        const liveCols = await adminDb.listCollections();
        dynamicRootCollections = Array.from(new Set([...dynamicRootCollections, ...liveCols.map((c: any) => c.id)]));
      }
    } catch (e) {}

    const executionTimeMs = Math.round(performance.now() - startTime);

    return NextResponse.json({
      success: true,
      executionTimeMs,
      knownCollections: KNOWN_COLLECTIONS,
      dynamicRootCollections,
      users: usersList,
      timestamp: new Date().toISOString()
    });

  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err?.message || 'שגיאה בשליפת קולקציות בסיס הנתונים',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// POST: Query documents in ANY path
export async function POST(req: NextRequest) {
  const startTime = performance.now();
  try {
    const body = await req.json();
    const {
      path: rawPath,
      collectionName,
      type = 'root',
      userId = '1',
      limit = 50,
      docId
    } = body;

    let fullPath = rawPath;
    if (!fullPath) {
      if (type === 'sub' && !collectionName.startsWith('users/')) {
        fullPath = `users/${userId}/${collectionName}`;
      } else {
        fullPath = collectionName;
      }
    }

    if (!fullPath) {
      return NextResponse.json({ success: false, error: 'יש לציין נתיב קולקציה' }, { status: 400 });
    }

    const pathSegments = fullPath.split('/').filter(Boolean);
    const isDocPath = pathSegments.length % 2 === 0;

    // 1. Document fetch
    if (docId || isDocPath) {
      const docPath = docId ? `${fullPath}/${docId}` : fullPath;
      const docRef = adminDb.doc(docPath);
      const docSnap = await docRef.get();

      if (!docSnap.exists) {
        return NextResponse.json({
          success: true,
          document: null,
          exists: false,
          path: docPath,
          executionTimeMs: Math.round(performance.now() - startTime)
        });
      }

      let subCollections: string[] = [];
      try {
        if (typeof docRef.listCollections === 'function') {
          const liveSubCols = await docRef.listCollections();
          subCollections = liveSubCols.map((c: any) => c.id);
        }
      } catch (e) {}

      if (pathSegments[0] === 'employees') {
        subCollections = Array.from(new Set([...subCollections, 'conversations', 'agreed_answers', 'knowledge', 'capabilities']));
      } else if (pathSegments[pathSegments.length - 2] === 'conversations') {
        subCollections = Array.from(new Set([...subCollections, 'messages']));
      } else if (pathSegments[0] === 'dotty_interviews') {
        subCollections = Array.from(new Set([...subCollections, 'messages']));
      } else if (pathSegments[0] === 'users') {
        subCollections = Array.from(new Set([...subCollections, 'contacts', 'services', 'posts', 'expenses', 'incomes', 'automations', 'campaigns', 'settings', 'forms']));
      }

      return NextResponse.json({
        success: true,
        document: {
          id: docSnap.id,
          data: serializeFirestoreData(docSnap.data()),
          path: docSnap.ref.path,
          subCollections
        },
        executionTimeMs: Math.round(performance.now() - startTime)
      });
    }

    // 2. Collection Query Fetch
    const colRef = adminDb.collection(fullPath);
    const snapshot = await colRef.limit(Math.min(limit, 100)).get();
    const docs: any[] = [];
    const fieldsSet = new Set<string>();

    for (const doc of snapshot.docs) {
      const data = serializeFirestoreData(doc.data()) || {};
      Object.keys(data).forEach(k => fieldsSet.add(k));

      let docSubCollections: string[] = [];
      try {
        if (typeof doc.ref.listCollections === 'function') {
          const liveSubCols = await doc.ref.listCollections();
          docSubCollections = liveSubCols.map((c: any) => c.id);
        }
      } catch (e) {}

      if (pathSegments[0] === 'employees' && pathSegments.length === 1) {
        docSubCollections = Array.from(new Set([...docSubCollections, 'conversations', 'agreed_answers', 'knowledge']));
      } else if (pathSegments[pathSegments.length - 1] === 'conversations') {
        docSubCollections = Array.from(new Set([...docSubCollections, 'messages']));
      } else if (pathSegments[0] === 'dotty_interviews' && pathSegments.length === 1) {
        docSubCollections = Array.from(new Set([...docSubCollections, 'messages']));
      }

      docs.push({
        id: doc.id,
        data,
        path: doc.ref.path,
        subCollections: docSubCollections
      });
    }

    const executionTimeMs = Math.round(performance.now() - startTime);

    return NextResponse.json({
      success: true,
      executionTimeMs,
      path: fullPath,
      collectionName: pathSegments[pathSegments.length - 1],
      totalCount: docs.length,
      fields: Array.from(fieldsSet),
      documents: docs,
      timestamp: new Date().toISOString()
    });

  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err?.message || 'שגיאה בשליפת נתוני הקולקציה',
      executionTimeMs: Math.round(performance.now() - startTime)
    }, { status: 500 });
  }
}

// PUT: Update an existing document
export async function PUT(req: NextRequest) {
  const startTime = performance.now();
  try {
    const body = await req.json();
    const { path, data } = body;

    if (!path || !data) {
      return NextResponse.json({ success: false, error: 'יש לספק נתיב ומידע לעדכון' }, { status: 400 });
    }

    const docRef = adminDb.doc(path);
    // Use .set() with merge: false if we want to replace, or set(data) completely.
    // Assuming full replace since user is editing the full JSON.
    await docRef.set(data);

    const executionTimeMs = Math.round(performance.now() - startTime);
    return NextResponse.json({
      success: true,
      message: 'המסמך עודכן בהצלחה',
      executionTimeMs
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err?.message || 'שגיאה בעדכון המסמך',
      executionTimeMs: Math.round(performance.now() - startTime)
    }, { status: 500 });
  }
}

// DELETE: Robust Recursive Deletion (Single, Multi-Path Batch, and Full Collection Purge)
export async function DELETE(req: NextRequest) {
  const startTime = performance.now();
  try {
    const body = await req.json();
    const { paths, path: rawPath, collectionName, docId, userId, purgeCollection } = body;

    // 1. FULL COLLECTION PURGE
    if (purgeCollection && (rawPath || collectionName)) {
      let targetColPath = rawPath || collectionName;
      if (userId && !targetColPath.startsWith('users/') && !KNOWN_COLLECTIONS.some(c => c.id === targetColPath && c.type === 'root')) {
        targetColPath = `users/${userId}/${targetColPath}`;
      }

      const res = await safelyDeletePath(targetColPath);
      const executionTimeMs = Math.round(performance.now() - startTime);

      if (!res.success) {
        return NextResponse.json({ success: false, error: res.error }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        purgedCollection: targetColPath,
        executionTimeMs,
        message: `כל המסמכים בקולקציה '${targetColPath}' נמחקו לצמיתות בהצלחה`,
        timestamp: new Date().toISOString()
      });
    }

    // 2. BATCH / BULK MULTI-PATH DELETION
    if (Array.isArray(paths) && paths.length > 0) {
      const results = await Promise.all(paths.map(p => safelyDeletePath(p)));
      const deletedPaths = results.filter(r => r.success).map(r => r.path);
      const failedPaths = results.filter(r => !r.success).map(r => r.path);

      const executionTimeMs = Math.round(performance.now() - startTime);

      return NextResponse.json({
        success: deletedPaths.length > 0,
        isBatch: true,
        deletedCount: deletedPaths.length,
        totalRequested: paths.length,
        deletedPaths,
        failedPaths,
        executionTimeMs,
        message: `${deletedPaths.length} מתוך ${paths.length} מסמכים נמחקו לצמיתות ממסד הנתונים`,
        timestamp: new Date().toISOString()
      });
    }

    // 3. SINGLE DOCUMENT DELETION
    let fullPath = rawPath;
    if (!fullPath) {
      if (collectionName && docId) {
        if (userId && !collectionName.startsWith('users/')) {
          fullPath = `users/${userId}/${collectionName}/${docId}`;
        } else {
          fullPath = `${collectionName}/${docId}`;
        }
      }
    }

    if (!fullPath) {
      return NextResponse.json({ success: false, error: 'יש לציין נתיב מלא למחיקה' }, { status: 400 });
    }

    const deleteRes = await safelyDeletePath(fullPath);
    const executionTimeMs = Math.round(performance.now() - startTime);

    if (!deleteRes.success) {
      return NextResponse.json({
        success: false,
        error: deleteRes.error || `שגיאה במחיקת '${fullPath}'`,
        executionTimeMs
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      deletedPath: fullPath,
      executionTimeMs,
      message: `הנתיב '${fullPath}' נמחק בהצלחה ממסד הנתונים`,
      timestamp: new Date().toISOString()
    });

  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err?.message || 'שגיאה במחיקת המסמך',
      executionTimeMs: Math.round(performance.now() - startTime)
    }, { status: 500 });
  }
}
