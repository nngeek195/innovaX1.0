/**
 * GET   /api/admin/judges            → all Judge Board registrations
 * PATCH /api/admin/judges            → { judgeId, status } confirm / reject / reset
 *
 * Admin only (Firebase ID token + admins/{uid}).
 */
import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { errorResponse, HttpError, requireAdmin } from '@/lib/server-auth';
import { isJudgeStatus } from '@/lib/judges';

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const snap = await adminDb.collection('judges').get();
    const judges = snap.docs
      .map(d => ({ id: d.id, ...d.data() }) as Record<string, unknown> & { createdAt?: string })
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    return NextResponse.json({ judges });
  } catch (err) {
    return errorResponse(err, 'admin/judges GET');
  }
}

export async function PATCH(request: Request) {
  try {
    const { uid: adminUid } = await requireAdmin(request);
    const { judgeId, status } = await request.json().catch(() => ({}));

    if (!judgeId || typeof judgeId !== 'string') throw new HttpError(400, 'Missing judgeId.');
    if (!isJudgeStatus(status)) throw new HttpError(400, 'Invalid status.');

    const ref = adminDb.collection('judges').doc(judgeId);
    const snap = await ref.get();
    if (!snap.exists) throw new HttpError(404, 'Judge not found.');

    const update: Record<string, unknown> = {
      status,
      reviewedAt: new Date().toISOString(),
      reviewedBy: adminUid,
    };
    // A judge who is no longer confirmed must lose access to their proposals.
    const releasedCount: number = status !== 'approved' ? (snap.data()?.assignedUserIds || []).length : 0;
    if (status !== 'approved') {
      update.assignedUserIds = [];
      update.distributedAt = null;
    }
    await ref.update(update);

    return NextResponse.json({ success: true, releasedCount });
  } catch (err) {
    return errorResponse(err, 'admin/judges PATCH');
  }
}
