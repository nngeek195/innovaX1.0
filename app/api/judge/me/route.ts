/**
 * GET /api/judge/me
 *
 * Returns the signed-in judge's profile and — once approved and proposals
 * have been distributed — the proposals assigned to them.
 * Only judging-relevant fields are exposed (no NIC / phone / email of teams).
 */
import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { errorResponse, HttpError, requireUser } from '@/lib/server-auth';

export async function GET(request: Request) {
  try {
    const { uid } = await requireUser(request);

    const snap = await adminDb.collection('judges').doc(uid).get();
    if (!snap.exists) throw new HttpError(404, 'No Judge Board profile found for this account.');
    const judge = { id: snap.id, ...snap.data() } as Record<string, unknown> & { status?: string; assignedUserIds?: string[] };

    let proposals: Record<string, unknown>[] = [];
    const ids = judge.status === 'approved' ? judge.assignedUserIds || [] : [];
    if (ids.length > 0) {
      const refs = ids.map(id => adminDb.collection('registrations').doc(id));
      const docs = await adminDb.getAll(...refs);
      proposals = docs
        .filter(d => d.exists)
        .map(d => {
          const u = d.data() || {};
          return {
            id: d.id,
            type: u.type || 'individual',
            name: u.type === 'team'
              ? u.teamName || 'Unnamed Team'
              : `${u.leader?.firstName || ''} ${u.leader?.lastName || ''}`.trim() || 'Unnamed',
            university: u.university || '',
            proposalLink: u.proposalUploaded && u.proposalLink ? u.proposalLink : null,
            judgeScore: u.judgeScore || null,
          };
        });
    }

    return NextResponse.json({ judge, proposals });
  } catch (err) {
    return errorResponse(err, 'judge/me');
  }
}
