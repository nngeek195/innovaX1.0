import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { InnovaXEmail } from '@/emails/InnovaXTemplate';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const { phase, recipients } = await request.json();

    if (!recipients || recipients.length === 0) {
      return NextResponse.json({ error: 'No recipients provided' }, { status: 400 });
    }

    // We map over the array to generate customized emails for each team
    const emailBatch = recipients.map((recipient: any) => ({
      from: 'InnovaX Command <events@niranga.tech>', 
      to: [recipient.email],
      subject: phase === 1 ? 'InnovaX: Phase 1 Submission Verified' : 'InnovaX: You are a Finalist!',
      react: InnovaXEmail({ teamName: recipient.teamName, phase }),
    }));

    // Send the batch
    const data = await resend.batch.send(emailBatch);

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}