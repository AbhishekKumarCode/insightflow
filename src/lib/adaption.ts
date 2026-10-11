/**
 * Results of the real Adaption run on data/sample.csv (web app, Instruction dataset,
 * review = prompt, category = context, recipes: Prompt Deduplication + Checklist verification).
 * `after` stays null until the finished job's results arrive; the UI shows "pending" for it.
 */
export const ADAPTION = {
  datasetName: "customer_issue_categories",
  rowsSubmitted: 7223,
  creditsUsed: 73,
  before: { score: 2, grade: "E", percentile: 0.6, domain: "Corporate-business (48%)", tone: "Professional (66%)", language: "English (100%)" },
  after: null as null | { score: number; grade: string; percentile: number; rows: number },
  recipes: ["Prompt Deduplication", "Checklist verification"],
};
