/**
 * POST /api/judge-score
 *
 * Saves a judge's score for a registration document.
 * Uses the Firebase Admin SDK so it bypasses Firestore Security Rules —
 * judges authenticate via passkey, not Firebase Auth, so client-side writes
 * are blocked by the rules.
 *
 * Body: { userId, phase, scores }
 *   userId  — Firestore document ID in /registrations
 *   phase   — 1 | 2
 *   scores  — { [criterionKey]: number, ... }   (total is computed here)
 */
import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, phase, scores } = body;

    // ── Validation ────────────────────────────────────────────────────────────
    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid userId' }, { status: 400 });
    }
    if (phase !== 1 && phase !== 2) {
      return NextResponse.json({ error: 'phase must be 1 or 2' }, { status: 400 });
    }
    if (!scores || typeof scores !== 'object' || Array.isArray(scores)) {
      return NextResponse.json({ error: 'Missing or invalid scores' }, { status: 400 });
    }

    // ── Compute total ────────────────────────────────────────────────────────
    const total: number = Object.values(scores as Record<string, number>)
      .reduce((sum, v) => sum + (Number(v) || 0), 0);

    const field = phase === 1 ? 'judgeScore' : 'judgeScore2';

    // ── Write via Admin SDK (bypasses Security Rules) ────────────────────────
    await adminDb
      .collection('registrations')
      .doc(userId)
      .update({ [field]: { ...scores, total } });

    return NextResponse.json({ success: true, total });
  } catch (error: any) {
    console.error('[judge-score] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save scores' },
      { status: 500 },
    );
  }
}
