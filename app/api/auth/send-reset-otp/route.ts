import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Resend } from 'resend';
import { PasswordResetOTPTemplate } from '@/emails/PasswordResetOTPTemplate';
import { getAuth } from 'firebase-admin/auth';
import { getApps } from 'firebase-admin/app';

// Ensure Firebase Admin is initialized
import '@/lib/firebase-admin';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Check if email exists in Firebase Auth using Admin SDK
    const adminAuth = getAuth(getApps()[0]);
    try {
      await adminAuth.getUserByEmail(email);
    } catch {
      // User not found in Firebase Auth
      return NextResponse.json(
        { error: 'No account found with this email address.' },
        { status: 404 }
      );
    }

    // Rate limiting via Firestore
    const otpRef = doc(db, 'otp_tracking', `reset_${email}`);
    const otpDoc = await getDoc(otpRef);

    const now = new Date();
    let attempts = 0;
    let lastSent = new Date(0);

    if (otpDoc.exists()) {
      const data = otpDoc.data();
      attempts = data.attempts || 0;
      lastSent = data.lastSent?.toDate() || new Date(0);

      // Reset attempts if more than 1 hour has passed
      const timeSinceFirstAttempt = (now.getTime() - lastSent.getTime()) / 1000 / 60;
      if (timeSinceFirstAttempt > 60) {
        attempts = 0;
      }
    }

    // Check max attempts (5 for password reset)
    if (attempts >= 5) {
      return NextResponse.json(
        { error: 'Too many reset attempts. Please try again later.' },
        { status: 429 }
      );
    }

    // Check 2-minute cooldown
    const timeDiffMinutes = (now.getTime() - lastSent.getTime()) / 1000 / 60;
    if (attempts > 0 && timeDiffMinutes < 2) {
      return NextResponse.json({
        error: `Please wait ${Math.ceil(2 - timeDiffMinutes)} minute(s) before requesting another code.`
      }, { status: 429 });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Send Email via Resend
    await resend.emails.send({
      from: 'InnovaX Security <security@innovax.cschaptersusl.org>',
      to: [email],
      subject: 'InnovaX Password Reset Code: ' + otp,
      react: PasswordResetOTPTemplate({ otp, email }),
    });

    // Store OTP in Firestore
    await setDoc(otpRef, {
      otp,
      attempts: attempts + 1,
      lastSent: serverTimestamp(),
      verified: false,
    });

    return NextResponse.json({ success: true, message: 'Reset code sent to your email.' });
  } catch (error: any) {
    console.error('Error sending password reset OTP:', error);
    return NextResponse.json({ error: 'Failed to send reset code. Please try again.' }, { status: 500 });
  }
}
