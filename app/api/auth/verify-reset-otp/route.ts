import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export async function POST(request: Request) {
  try {
    const { email, otp } = await request.json();

    if (!email || !otp) {
      return NextResponse.json(
        { error: 'Email and OTP are required' },
        { status: 400 }
      );
    }

    // Retrieve OTP from Firestore
    const otpRef = doc(db, 'otp_tracking', `reset_${email}`);
    const otpDoc = await getDoc(otpRef);

    if (!otpDoc.exists()) {
      return NextResponse.json(
        { error: 'No reset code found. Please request a new one.' },
        { status: 400 }
      );
    }

    const data = otpDoc.data();

    // Check if already verified
    if (data.verified) {
      return NextResponse.json(
        { error: 'This code has already been used. Please request a new one.' },
        { status: 400 }
      );
    }

    // Check if OTP matches
    if (data.otp !== otp) {
      return NextResponse.json(
        { error: 'Invalid code. Please check and try again.' },
        { status: 400 }
      );
    }

    // Check if OTP is expired (10 minutes)
    const sentAt = data.lastSent?.toDate();
    if (sentAt) {
      const elapsed = (Date.now() - sentAt.getTime()) / 1000 / 60;
      if (elapsed > 10) {
        return NextResponse.json(
          { error: 'This code has expired. Please request a new one.' },
          { status: 400 }
        );
      }
    }

    // OTP is valid — return success (don't mark as verified yet, that happens on password reset)
    return NextResponse.json({ success: true, message: 'Code verified successfully.' });
  } catch (error: any) {
    console.error('Error verifying reset OTP:', error);
    return NextResponse.json(
      { error: 'Verification failed. Please try again.' },
      { status: 500 }
    );
  }
}
