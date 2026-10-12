/**
 * lib/firebase-admin.ts
 *
 * Server-only Firebase Admin SDK singleton.
 * Initialized once using a service-account private key stored in env vars.
 * Never import this file from client components — it will throw.
 */
import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

function getAdminApp(): App {
  // Re-use an existing app if already initialised (important for hot-reload in dev)
  if (getApps().length > 0) return getApps()[0];

  const projectId  = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL!;
  // The private key is stored as a single-line string in .env with \n escaped.
  // We need to restore actual newlines so the PEM is valid.
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n')!;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      'Missing Firebase Admin env vars. ' +
      'Set FIREBASE_ADMIN_CLIENT_EMAIL and FIREBASE_ADMIN_PRIVATE_KEY in .env'
    );
  }

  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
}

/** Server-side Firestore instance that bypasses Security Rules */
export const adminDb = getFirestore(getAdminApp());
