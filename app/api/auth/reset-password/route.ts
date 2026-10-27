import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getApps } from 'firebase-admin/app';

// Ensure Firebase Admin is initialized
import '@/lib/firebase-admin';

export async function POST(request: Request) {
  try {
    const { email, otp, newPassword } = await request.json();

    if (!email || !otp || !newPassword) {
      return NextResponse.json(
        { error: 'Email, OTP, and new password are required.' },
        { status: 400 }
      );
    }

    // Validate password length
    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters.' },
        { status: 400 }
      );
    }

    // Verify the OTP one more time before resetting
    const otpRef = doc(db, 'otp_tracking', `reset_${email}`);
    const otpDoc = await getDoc(otpRef);

    if (!otpDoc.exists()) {
      return NextResponse.json(
        { error: 'No reset code found. Please restart the process.' },
        { status: 400 }
      );
    }

    const data = otpDoc.data();

    if (data.otp !== otp) {
      return NextResponse.json(
        { error: 'Invalid reset code.' },
        { status: 400 }
      );
    }

    if (data.verified) {
      return NextResponse.json(
        { error: 'This reset code has already been used.' },
        { status: 400 }
      );
    }

    // Check expiry (10 minutes)
    const sentAt = data.lastSent?.toDate();
    if (sentAt) {
      const elapsed = (Date.now() - sentAt.getTime()) / 1000 / 60;
      if (elapsed > 10) {
        return NextResponse.json(
          { error: 'Reset code has expired. Please request a new one.' },
          { status: 400 }
        );
      }
    }

    // Update password in Firebase Auth using Admin SDK
    const adminAuth = getAuth(getApps()[0]);
    const userRecord = await adminAuth.getUserByEmail(email);
    await adminAuth.updateUser(userRecord.uid, {
      password: newPassword,
    });

    // Mark OTP as verified/used
    await updateDoc(otpRef, {
      verified: true,
    });

    return NextResponse.json({
      success: true,
      message: 'Password reset successfully. You can now sign in with your new password.',
    });
  } catch (error: any) {
    console.error('Error resetting password:', error);
    return NextResponse.json(
      { error: 'Failed to reset password. Please try again.' },
      { status: 500 }
    );
  }
}
