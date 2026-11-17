/**
 * lib/resend.ts
 * Lazily-created Resend client.
 *
 * Do NOT call `new Resend(...)` at module scope: `next build` imports every
 * route while collecting page data, and the constructor throws when
 * RESEND_API_KEY is absent (e.g. preview builds without that env var),
 * which fails the whole build. Creating it on first use avoids that.
 */
import { Resend } from 'resend';

let client: Resend | null = null;

export function getResend(): Resend {
  if (!client) {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error('Email service is not configured (RESEND_API_KEY is missing).');
    client = new Resend(key);
  }
  return client;
}
