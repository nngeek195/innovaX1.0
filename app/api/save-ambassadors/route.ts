import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(request: Request) {
  try {
    const { ambassadors } = await request.json();

    if (!ambassadors || !Array.isArray(ambassadors) || ambassadors.length === 0) {
      return NextResponse.json({ error: 'No ambassadors provided' }, { status: 400 });
    }

    // Use a Firestore batch for atomic, efficient bulk writes (max 500 per batch).
    // We chunk into groups of 500 to stay within Firestore limits.
    const BATCH_SIZE = 500;
    const chunks: any[][] = [];
    for (let i = 0; i < ambassadors.length; i += BATCH_SIZE) {
      chunks.push(ambassadors.slice(i, i + BATCH_SIZE));
    }

    for (const chunk of chunks) {
      const batch = adminDb.batch();
      for (const amb of chunk) {
        if (!amb.ambassadorId) continue;
        const ref = adminDb.collection('ambassadors').doc(amb.ambassadorId);
        // merge: true so re-uploads preserve existing delegateCount
        batch.set(ref, {
          email:            amb.email            || '',
          nameWithInitials: amb.nameWithInitials  || '',
          firstName:        amb.firstName         || '',
          lastName:         amb.lastName          || '',
          whatsapp:         amb.whatsapp          || '',
          university:       amb.university        || '',
          faculty:          amb.faculty           || '',
          yearOfStudy:      amb.yearOfStudy       || '',
          ambassadorId:     amb.ambassadorId,
          delegateCount:    0,
          registeredAt:     new Date().toISOString(),
        }, { merge: true });
      }
      await batch.commit();
    }

    return NextResponse.json({ success: true, count: ambassadors.length });
  } catch (error: any) {
    console.error('Save ambassadors error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save ambassadors' },
      { status: 500 }
    );
  }
}
