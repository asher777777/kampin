import { adminDb } from "@/lib/firebase-admin";

export const dynamic = 'force-dynamic';

export default async function TestPage() {
  const collections = ["services", "pages", "landing", "posts"];
  const results: any = {};
  for (const c of collections) {
    const snap = await adminDb.collection(c).get();
    results[c] = snap.docs.map((d: any) => d.id);
  }
  return <div>DOCS: {JSON.stringify(results)}</div>;
}
