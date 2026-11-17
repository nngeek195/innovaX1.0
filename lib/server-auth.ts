/**
 * lib/server-auth.ts
 * Server-only helpers that authenticate API requests using the Firebase ID
 * token sent as `Authorization: Bearer <token>`.
 */
import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function requireUser(request: Request): Promise<{ uid: string; email?: string }> {
  const header = request.headers.get('authorization') || '';
  const match = header.match(/^Bearer (.+)$/i);
  if (!match) throw new HttpError(401, 'Missing authorization token.');
  try {
    const decoded = await adminAuth.verifyIdToken(match[1]);
    return { uid: decoded.uid, email: decoded.email };
  } catch {
    throw new HttpError(401, 'Invalid or expired session. Please sign in again.');
  }
}

export async function requireAdmin(request: Request): Promise<{ uid: string }> {
  const { uid } = await requireUser(request);
  const adminDoc = await adminDb.collection('admins').doc(uid).get();
  if (!adminDoc.exists) throw new HttpError(403, 'Administrator access required.');
  return { uid };
}

/** Convert thrown errors to JSON responses. */
export function errorResponse(err: unknown, tag: string) {
  if (err instanceof HttpError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  console.error(`[${tag}]`, err);
  const message = err instanceof Error ? err.message : 'Unexpected server error.';
  return NextResponse.json({ error: message }, { status: 500 });
}
