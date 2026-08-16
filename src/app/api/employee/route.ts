import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  
  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  try {
    let doc = await adminDb.collection('employees').doc(id).get();
    if (!doc.exists) {
      doc = await adminDb.collection('smart_workers').doc(id).get();
    }
    if (!doc.exists) {
      doc = await adminDb.collection('smart_workers').doc(id.toLowerCase()).get();
    }
    if (!doc.exists) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    
    return NextResponse.json(doc.data());
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
