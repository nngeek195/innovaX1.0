import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { AmbassadorEmail } from '@/emails/AmbassadorTemplate';
import { SITE_URL } from '@/lib/config';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const { recipients, siteUrl: customSiteUrl } = await request.json();

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return NextResponse.json({ error: 'No recipients provided' }, { status: 400 });
    }

    // Use the central SITE_URL from lib/config.ts (controlled by NEXT_PUBLIC_SITE_URL env var).
    // An optional siteUrl in the request body can still override it (e.g. for testing).
    const origin = customSiteUrl || SITE_URL;

    const emailBatch = recipients.map((r: {
      email: string;
      name?: string;
      nameWithInitials?: string;
      firstName?: string;
      lastName?: string;
      ambassadorId: string;
      university?: string;
      referralLink?: string;
    }) => {
      const displayName = r.name || r.nameWithInitials || `${r.firstName || ''} ${r.lastName || ''}`.trim() || 'Ambassador';
      const referralLink = r.referralLink || `${origin}/register?ref=${encodeURIComponent(r.ambassadorId)}`;

      return {
        from: 'InnovaX Command <events@innovax.cschaptersusl.org>',
        to: [r.email],
        subject: `InnovaX 2026: Campus Ambassador Appointment [${r.ambassadorId}]`,
        react: AmbassadorEmail({
          name: displayName,
          ambassadorId: r.ambassadorId,
          university: r.university,
          siteUrl: origin,
          referralLink,
        }),
      };
    });

    // Resend batch endpoint accepts up to 100 emails per request
    const batchSize = 100;
    const results: any[] = [];

    for (let i = 0; i < emailBatch.length; i += batchSize) {
      const slice = emailBatch.slice(i, i + batchSize);
      const res = await resend.batch.send(slice);
      results.push(res);
    }

    return NextResponse.json({
      success: true,
      count: emailBatch.length,
      data: results,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to send ambassador emails' }, { status: 500 });
  }
}
