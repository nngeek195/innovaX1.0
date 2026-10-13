/**
 * lib/config.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * SINGLE SOURCE OF TRUTH for all site-level constants.
 *
 * ► To switch environments, edit ONE variable in your .env file:
 *
 *     NEXT_PUBLIC_SITE_URL=https://your-production-domain.com
 *
 *   • In local dev it falls back to http://localhost:3000
 *   • Every URL, email address, and sender name below is derived from here
 *     — nothing else in the codebase should hardcode these values.
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ---------------------------------------------------------------------------
// Base site URL
// ---------------------------------------------------------------------------
// process.env.NEXT_PUBLIC_SITE_URL  → set this in .env / hosting dashboard
// Fallback is localhost so local dev works out of the box.
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ||
  'https://innovax.cschaptersusl.org:3000';

// ---------------------------------------------------------------------------
// Derived URLs
// ---------------------------------------------------------------------------
export const DASHBOARD_URL = `${SITE_URL}/dashboard`;
export const REGISTER_URL  = `${SITE_URL}/register`;
export const LOGIN_URL     = `${SITE_URL}/login`;

// ---------------------------------------------------------------------------
// Email "from" addresses
// Change the domain part here once — all API routes pick it up automatically.
// ---------------------------------------------------------------------------
export const EMAIL_FROM_EVENTS   = 'InnovaX Command <events@niranga.tech>';
export const EMAIL_FROM_SECURITY = 'InnovaX Security <security@niranga.tech>';

// ---------------------------------------------------------------------------
// Contact / support addresses (shown in email footers & UI)
// ---------------------------------------------------------------------------
export const CONTACT_EMAIL_GENERAL  = 'ieeecschaptersusl@gmail.com';
export const CONTACT_EMAIL_ADVISOR  = 'ssomaweera@foc.sab.ac.lk';
