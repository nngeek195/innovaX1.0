/**
 * POST /api/judge/score
 *
 * Saves a Phase 1 rubric score from a registered (approved) judge.
 * The judge may only score proposals that were assigned to them.
 * Body: { userId, scores: { [criterionKey]: number } }
 */
import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { errorResponse, HttpError, requireUser } from '@/lib/server-auth';
import { PHASE1_CRITERIA } from '@/lib/rubrics';

export async function POST(request: Request) {
  try {
    const { uid } = await requireUser(request);
    const { userId, scores } = await request.json().catch(() => ({}));

    if (!userId || typeof userId !== 'string') throw new HttpError(400, 'Missing proposal id.');
    if (!scores || typeof scores !== 'object' || Array.isArray(scores)) throw new HttpError(400, 'Missing scores.');

    const judgeSnap = await adminDb.collection('judges').doc(uid).get();
    const judge = judgeSnap.data();
    if (!judgeSnap.exists || judge?.status !== 'approved') {
      throw new HttpError(403, 'Only confirmed judges can submit scores.');
    }
    if (!(judge.assignedUserIds || []).includes(userId)) {
      throw new HttpError(403, 'This proposal is not assigned to you.');
    }

    // Only accept known criteria, clamped to their maximum.
    const clean: Record<string, number> = {};
    for (const c of PHASE1_CRITERIA) {
      const v = Math.round(Number((scores as Record<string, unknown>)[c.key]) || 0);
      clean[c.key] = Math.min(c.max, Math.max(0, v));
    }
    const total = Object.values(clean).reduce((a, b) => a + b, 0);

    // Audit fields live beside judgeScore (not inside it): other screens sum
    // every value in judgeScore, so it must only contain numeric criteria.
    await adminDb.collection('registrations').doc(userId).update({
      judgeScore: { ...clean, total },
      judgeScoredBy: uid,
      judgeScoredAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, total });
  } catch (err) {
    return errorResponse(err, 'judge/score');
  }
}
