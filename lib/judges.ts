/**
 * lib/judges.ts
 * Shared (client + server safe) types and logic for the registered Judge Board.
 *
 * Firestore layout:  judges/{uid}
 *   title, fullName, category, university | null, company | null,
 *   designation, phone, email, status, assignedUserIds[], createdAt,
 *   reviewedAt?, distributedAt?
 */

export const JUDGE_TITLES = ['Mr.', 'Ms.', 'Mrs.', 'Miss', 'Dr.', 'Prof.'] as const;
export type JudgeTitle = (typeof JUDGE_TITLES)[number];

export const JUDGE_CATEGORIES = ['lecturer', 'industry'] as const;
export type JudgeCategory = (typeof JUDGE_CATEGORIES)[number];

export const JUDGE_STATUSES = ['pending', 'approved', 'rejected'] as const;
export type JudgeStatus = (typeof JUDGE_STATUSES)[number];

export interface JudgeProfile {
  id: string;
  title: JudgeTitle;
  fullName: string;
  category: JudgeCategory;
  university: string | null;
  company: string | null;
  designation: string;
  phone: string;
  email: string;
  status: JudgeStatus;
  assignedUserIds: string[];
  createdAt: string;
  reviewedAt?: string | null;
  distributedAt?: string | null;
}

export function judgeDisplayName(j: Pick<JudgeProfile, 'title' | 'fullName'>): string {
  return `${j.title} ${j.fullName}`.trim();
}

export function judgeCategoryLabel(c: JudgeCategory): string {
  return c === 'lecturer' ? 'Lecturer' : 'Industry Expert';
}

/** University for lecturers, company for industry experts. */
export function judgeInstitution(j: Pick<JudgeProfile, 'category' | 'university' | 'company'>): string {
  return (j.category === 'lecturer' ? j.university : j.company) || '—';
}

// ─── Proposal distribution ────────────────────────────────────────────────────

export interface DistributableProposal { id: string; university?: string | null }
export interface DistributableJudge {
  id: string;
  category: JudgeCategory;
  university: string | null;
}

export interface DistributionResult {
  /** judgeId → assigned registration ids */
  assignments: Record<string, string[]>;
  /** proposals that could only go to a lecturer from the same university */
  conflicts: number;
}

const normalise = (s?: string | null) => (s || '').trim().toLowerCase();

/** A lecturer must not judge a proposal from their own university. */
export function hasConflict(judge: DistributableJudge, proposal: DistributableProposal): boolean {
  if (judge.category !== 'lecturer') return false;
  const ju = normalise(judge.university);
  if (!ju || ju === 'other') return false;
  return ju === normalise(proposal.university);
}

/**
 * Split proposals across judges as evenly as possible while avoiding
 * conflicts of interest (lecturer + same university).
 *
 * Most-constrained proposals are placed first; each proposal goes to the
 * least-loaded eligible judge. If every judge is conflicted for a proposal it
 * goes to the least-loaded judge overall and is counted as a conflict.
 */
export function distributeProposals(
  proposals: DistributableProposal[],
  judges: DistributableJudge[],
): DistributionResult {
  const assignments: Record<string, string[]> = Object.fromEntries(judges.map(j => [j.id, []]));
  if (judges.length === 0) return { assignments, conflicts: 0 };

  const eligibleCount = (p: DistributableProposal) => judges.filter(j => !hasConflict(j, p)).length;
  const ordered = proposals
    .map((p, idx) => ({ p, idx, eligible: eligibleCount(p) }))
    .sort((a, b) => a.eligible - b.eligible || a.idx - b.idx);

  const leastLoaded = (pool: DistributableJudge[]) =>
    pool.reduce((best, j) => (assignments[j.id].length < assignments[best.id].length ? j : best), pool[0]);

  let conflicts = 0;
  for (const { p } of ordered) {
    const eligible = judges.filter(j => !hasConflict(j, p));
    const target = eligible.length > 0 ? leastLoaded(eligible) : leastLoaded(judges);
    if (eligible.length === 0) conflicts++;
    assignments[target.id].push(p.id);
  }
  return { assignments, conflicts };
}

// ─── Validation (used by the register API) ───────────────────────────────────

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isJudgeTitle(v: unknown): v is JudgeTitle {
  return typeof v === 'string' && (JUDGE_TITLES as readonly string[]).includes(v);
}
export function isJudgeCategory(v: unknown): v is JudgeCategory {
  return typeof v === 'string' && (JUDGE_CATEGORIES as readonly string[]).includes(v);
}
export function isJudgeStatus(v: unknown): v is JudgeStatus {
  return typeof v === 'string' && (JUDGE_STATUSES as readonly string[]).includes(v);
}
