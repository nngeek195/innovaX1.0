import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Resend } from 'resend';
import { OTPTemplate } from '@/emails/OTPTemplate';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const { email, name } = await request.json();
    const otpRef = doc(db, 'otp_tracking', email);
    const otpDoc = await getDoc(otpRef);

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
      if (!isBlocked) await setDoc(otpRef, { blocked: true }, { merge: true });
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

    // 4. Send Email via Resend
    await resend.emails.send({
      from: 'InnovaX Security <security@niranga.tech>', 
      to: [email],
      subject: 'InnovaX Registration Code: ' + otp,
      react: OTPTemplate({ otp, name }),
    });

    // 5. Update Firestore with new OTP and attempt count
    await setDoc(otpRef, {
      otp: otp, // In a real prod environment, hash this!
      attempts: attempts + 1,
      lastSent: serverTimestamp(),
      blocked: false
    });

    return NextResponse.json({ success: true, message: 'OTP Sent' });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}