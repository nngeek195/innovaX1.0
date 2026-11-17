/**
 * lib/rubrics.ts
 * Judging rubrics — shared by the judge portals (client) and scoring APIs (server).
 */
export interface Criterion { key: string; label: string; max: number }

export const PHASE1_CRITERIA: Criterion[] = [
  { key: 'problemClarity',  label: 'Problem Clarity & Impact',  max: 25 },
  { key: 'agenticDesign',   label: 'Agentic Design',            max: 30 },
  { key: 'innovation',      label: 'Innovation',                max: 20 },
  { key: 'feasibility',     label: 'Feasibility & Scalability', max: 15 },
  { key: 'responsibleAI',   label: 'Responsible AI & Safety',   max: 10 },
];

export const PHASE2_CRITERIA: Criterion[] = [
  { key: 'problemClarity',      label: 'Problem Clarity & Impact',  max: 10 },
  { key: 'agenticDesign',       label: 'Agentic Design',            max: 25 },
  { key: 'innovation',          label: 'Innovation',                max: 10 },
  { key: 'technicalExecution',  label: 'Technical Execution',       max: 30 },
  { key: 'feasibility',         label: 'Feasibility & Scalability', max: 10 },
  { key: 'responsibleAI',       label: 'Responsible AI & Safety',   max: 15 },
];

