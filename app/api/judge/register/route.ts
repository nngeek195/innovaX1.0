/**
 * POST /api/judge/register
 *
 * Creates a Judge Board account after verifying the emailed OTP.
 * Everything runs through the Admin SDK so it does not depend on Firestore
 * Security Rules for the `judges` collection. The judge starts as `pending`
 * until an administrator confirms them.
 */
import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { errorResponse, HttpError } from '@/lib/server-auth';
import { EMAIL_RE, isJudgeCategory, isJudgeTitle } from '@/lib/judges';
import { UNIVERSITIES } from '@/lib/universities';

const OTP_VALID_MINUTES = 10;

const str = (v: unknown, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));

    const title = body.title;
    const fullName = str(body.fullName, 120);
    const category = body.category;
    const email = str(body.email, 254).toLowerCase();
    const password = typeof body.password === 'string' ? body.password : '';
    const otp = str(body.otp, 6);
    const designation = str(body.designation, 120);
    const phone = str(body.phone, 30);

    // ── Validation ──────────────────────────────────────────────────────────
    if (!isJudgeTitle(title)) throw new HttpError(400, 'Please select a valid title.');
    if (fullName.length < 2) throw new HttpError(400, 'Please enter your full name.');
    if (!isJudgeCategory(category)) throw new HttpError(400, 'Please select Lecturer or Industry Expert.');
    if (!EMAIL_RE.test(email)) throw new HttpError(400, 'Please enter a valid email address.');
    if (password.length < 6) throw new HttpError(400, 'Password must be at least 6 characters.');
    if (!/^\d{6}$/.test(otp)) throw new HttpError(400, 'Please enter the 6-digit verification code.');

    let university: string | null = null;
    let company: string | null = null;
    if (category === 'lecturer') {
      const selected = str(body.university);
      if (!UNIVERSITIES.includes(selected)) throw new HttpError(400, 'Please select your university.');
      university = selected === 'Other' ? str(body.otherUniversity) : selected;
      if (!university) throw new HttpError(400, 'Please enter your university name.');
    } else {
      company = str(body.company, 150);
      if (!company) throw new HttpError(400, 'Please enter your company / organization.');
    }

    // ── OTP verification ───────────────────────────────────────────────────
    const otpRef = adminDb.collection('otp_tracking').doc(email);
    const otpSnap = await otpRef.get();
    const otpData = otpSnap.data();
    if (!otpSnap.exists || !otpData?.otp || otpData.otp !== otp) {
      throw new HttpError(400, 'Invalid verification code.');
    }
    const sentAt: Date | null = otpData.lastSent?.toDate?.() ?? null;
    if (!sentAt || Date.now() - sentAt.getTime() > OTP_VALID_MINUTES * 60_000) {
      throw new HttpError(400, 'This verification code has expired. Please request a new one.');
    }

    // ── Create the auth account ──────────────────────────────────────────────
    let uid: string;
    try {
      const user = await adminAuth.createUser({
        email,
        password,
        displayName: `${title} ${fullName}`,
        emailVerified: true,
      });
      uid = user.uid;
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === 'auth/email-already-exists') {
        throw new HttpError(409, 'This email is already registered. Please sign in instead.');
      }
      if (code === 'auth/invalid-password') {
        throw new HttpError(400, 'Password must be at least 6 characters.');
      }
      throw err;
    }

    // ── Create the judge profile (roll back the account on failure) ───────────
    try {
      await adminDb.collection('judges').doc(uid).set({
        uid,
        title,
        fullName,
        category,
        university,
        company,
        designation,
        phone,
        email,
        status: 'pending',
        assignedUserIds: [],
        createdAt: new Date().toISOString(),
        reviewedAt: null,
        distributedAt: null,
      });
    } catch (err) {
      await adminAuth.deleteUser(uid).catch(() => {});
      throw err;
    }

    // One-time use: burn the OTP so it can't be replayed.
    await otpRef.set({ otp: null }, { merge: true }).catch(() => {});

    return NextResponse.json({ success: true });
  } catch (err) {
    return errorResponse(err, 'judge/register');
  }
}
