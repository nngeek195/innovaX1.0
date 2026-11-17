import { NextResponse } from 'next/server';
import { getResend } from '@/lib/resend';
import { InnovaXEmail } from '@/emails/InnovaXTemplate';


export async function POST(request: Request) {
  try {
    const { phase, recipients } = await request.json();

    if (!recipients || recipients.length === 0) {
      return NextResponse.json({ error: 'No recipients provided' }, { status: 400 });
    }

    // We map over the array to generate customized emails for each team
    const emailBatch = recipients.map((recipient: any) => ({
      from: 'InnovaX Command <events@innovax.cschaptersusl.org>', 
      to: [recipient.email],
      subject: phase === 1 ? 'InnovaX: Phase 1 Submission Verified' : 'InnovaX: You are a Finalist!',
      react: InnovaXEmail({ teamName: recipient.teamName, phase }),
    }));

    // Send the batch
    const data = await getResend().batch.send(emailBatch);

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}