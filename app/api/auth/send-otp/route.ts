import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getResend } from '@/lib/resend';
import { OTPTemplate } from '@/emails/OTPTemplate';
import { EMAIL_FROM_SECURITY } from '@/lib/config';
import { withTimeout, TimeoutError } from '@/lib/timeout';

const DB_TIMEOUT_MS = 15_000;
const EMAIL_TIMEOUT_MS = 20_000;


export async function POST(request: Request) {
  try {
    const { email, name, audience } = await request.json();
    const isJudge = audience === 'judge';
    const otpRef = doc(db, 'otp_tracking', email);
    const otpDoc = await withTimeout(getDoc(otpRef), DB_TIMEOUT_MS, 'Database read');

    const now = new Date();
    let attempts = 0;
    let lastSent = new Date(0);
    let isBlocked = false;

    if (otpDoc.exists()) {
      const data = otpDoc.data();
      attempts = data.attempts || 0;
      lastSent = data.lastSent?.toDate() || new Date(0);
      isBlocked = data.blocked || false;
    }

    // 1. Check if permanently blocked (3 attempts)
    if (isBlocked || attempts >= 3) {
      if (!isBlocked) await withTimeout(setDoc(otpRef, { blocked: true }, { merge: true }), DB_TIMEOUT_MS, 'Database write');
      return NextResponse.json({ error: 'Maximum attempts reached. This email is blocked from registration.' }, { status: 403 });
    }

    // 2. Check 5-minute cooldown
    const timeDiffMinutes = (now.getTime() - lastSent.getTime()) / 1000 / 60;
    if (attempts > 0 && timeDiffMinutes < 5) {
      return NextResponse.json({ 
        error: `Please wait ${Math.ceil(5 - timeDiffMinutes)} minutes before requesting another code.` 
      }, { status: 429 });
    }

    // 3. Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // 4. Send Email via Resend.
    //    The SDK does NOT throw on failure — it returns { error }. If we don't
    //    check it, a failed send still burns an attempt + starts the cooldown
    //    while the user never receives a code. Retry once for transient
    //    network errors, and only record the attempt if the email went out.
    const message = {
      from: EMAIL_FROM_SECURITY,
      to: [email],
      subject: (isJudge ? 'InnovaX Judge Board Verification Code: ' : 'InnovaX Registration Code: ') + otp,
      react: OTPTemplate({ otp, name, audience: isJudge ? 'judge' : 'participant' }),
    };
    let sendResult = await withTimeout(getResend().emails.send(message), EMAIL_TIMEOUT_MS, 'Email service');
    if (sendResult.error && sendResult.error.statusCode == null) {
      // statusCode null ⇒ network-level failure (request never reached Resend)
      await new Promise(r => setTimeout(r, 1000));
      sendResult = await withTimeout(getResend().emails.send(message), EMAIL_TIMEOUT_MS, 'Email service');
    }
    if (sendResult.error) {
      console.error('[send-otp] Resend error:', sendResult.error);
      return NextResponse.json(
        { error: 'We could not send the verification email right now. Please try again in a moment.' },
        { status: 502 },
      );
    }

    // 5. Update Firestore with new OTP and attempt count (only after a successful send)
    await withTimeout(setDoc(otpRef, {
      otp: otp, // In a real prod environment, hash this!
      attempts: attempts + 1,
      lastSent: serverTimestamp(),
      blocked: false
    }), DB_TIMEOUT_MS, 'Database write');

    return NextResponse.json({ success: true, message: 'OTP Sent' });

  } catch (error: unknown) {
    if (error instanceof TimeoutError) {
      console.error('[send-otp]', error.message);
      return NextResponse.json(
        { error: 'The server could not reach our services (network timeout). Please check your connection and try again.' },
        { status: 504 },
      );
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unexpected error' }, { status: 500 });
  }
}