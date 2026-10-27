import { NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getApps } from 'firebase-admin/app';

// Ensure Firebase Admin is initialized
import '@/lib/firebase-admin';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const adminAuth = getAuth(getApps()[0]);

    try {
      await adminAuth.getUserByEmail(email);
      return NextResponse.json({ exists: true });
    } catch {
      return NextResponse.json({ exists: false });
    }
  } catch (error: any) {
    console.error('Error checking email:', error);
    return NextResponse.json(
      { error: 'Failed to check email.' },
      { status: 500 }
    );
  }
}
