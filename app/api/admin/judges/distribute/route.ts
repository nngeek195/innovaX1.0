/**
 * POST /api/admin/judges/distribute
 *
 * Splits every submitted Phase 1 proposal across all CONFIRMED (approved)
 * Judge Board members, saves the assignment on each judge profile, then emails
 * each judge that their proposals are waiting on their dashboard.
 *
 * Re-running replaces the previous assignment (scores already saved on the
 * registrations are kept).
 */
import { NextResponse } from 'next/server';
import { getResend } from '@/lib/resend';
import { adminDb } from '@/lib/firebase-admin';
import { errorResponse, HttpError, requireAdmin } from '@/lib/server-auth';
import { distributeProposals, judgeDisplayName, type JudgeProfile } from '@/lib/judges';
import { JudgeAssignmentEmail } from '@/emails/JudgeAssignmentTemplate';
import { EMAIL_FROM_EVENTS, SITE_URL } from '@/lib/config';

const RESEND_BATCH_LIMIT = 100;

export async function POST(request: Request) {
  try {
    await requireAdmin(request);

    // ── Load confirmed judges & submitted proposals ──────────────────────────
    const judgesSnap = await adminDb.collection('judges').get();
    const allJudges = judgesSnap.docs.map(d => ({ ...(d.data() as JudgeProfile), id: d.id }));
    const approved = allJudges
      .filter(j => j.status === 'approved')
      .sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
    if (approved.length === 0) throw new HttpError(400, 'No confirmed judges yet. Confirm at least one judge first.');

    const regSnap = await adminDb.collection('registrations').where('proposalUploaded', '==', true).get();
    const proposals = regSnap.docs
      .filter(d => !!d.data().proposalLink)
      .map(d => ({ id: d.id, university: (d.data().university as string) || null }));
    if (proposals.length === 0) throw new HttpError(400, 'No submitted proposals found yet.');

    // ── Distribute (balanced, avoids lecturer/same-university conflicts) ──────
    const { assignments, conflicts } = distributeProposals(proposals, approved);
    const distributedAt = new Date().toISOString();

    const batch = adminDb.batch();
    for (const j of approved) {
      batch.update(adminDb.collection('judges').doc(j.id), {
        assignedUserIds: assignments[j.id] || [],
        distributedAt,
      });
    }
    // Defensive: nobody outside the confirmed board keeps old assignments.
    for (const j of allJudges) {
      if (j.status !== 'approved' && (j.assignedUserIds || []).length > 0) {
        batch.update(adminDb.collection('judges').doc(j.id), { assignedUserIds: [], distributedAt: null });
      }
    }
    await batch.commit();

    // ── Notify judges (assignment is already saved even if email fails) ───────
    const dashboardUrl = `${SITE_URL}/judge-dashboard`;
    const emails = approved
      .filter(j => (assignments[j.id] || []).length > 0)
      .map(j => ({
        from: EMAIL_FROM_EVENTS,
        to: [j.email],
        subject: 'InnovaX Judge Board: Your proposals are ready for review',
        react: JudgeAssignmentEmail({
          judgeName: judgeDisplayName(j),
          proposalCount: assignments[j.id].length,
          dashboardUrl,
        }),
      }));

    let emailsSent = 0;
    const emailErrors: string[] = [];
    for (let i = 0; i < emails.length; i += RESEND_BATCH_LIMIT) {
      const slice = emails.slice(i, i + RESEND_BATCH_LIMIT);
      try {
        const { error } = await getResend().batch.send(slice);
        if (error) emailErrors.push(error.message);
        else emailsSent += slice.length;
      } catch (e) {
        emailErrors.push(e instanceof Error ? e.message : 'Email send failed');
      }
    }

    return NextResponse.json({
      success: true,
      judges: approved.length,
      proposals: proposals.length,
      conflicts,
      emailsSent,
      emailErrors,
      assignments: Object.fromEntries(approved.map(j => [j.id, (assignments[j.id] || []).length])),
    });
  } catch (err) {
    return errorResponse(err, 'admin/judges/distribute');
  }
}
