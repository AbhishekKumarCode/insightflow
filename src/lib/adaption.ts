import summary from "../../data/adaption/summary.json";

/**
 * Results of the real Adaption run on data/sample.csv (web app, Instruction dataset,
 * review = prompt, category = context, recipes: Prompt Deduplication + Checklist verification).
 * `result` is computed from the file Adaption emailed: node scripts/adaption-summary.mjs <file>.
 * `overall` is Adaption's own 0-10 score for the cleaned data; it is only in the email, so it stays null until entered.
 */
export const ADAPTION = {
  datasetName: "customer_issue_categories",
  creditsUsed: 73,
  before: { score: 2, grade: "E", percentile: 0.6, domain: "Corporate-business (48%)", tone: "Professional (66%)", language: "English (100%)" },
  result: summary,
  overall: null as null | { score: number; grade: string; percentile: number },
  recipes: ["Prompt Deduplication", "Checklist verification"],
};
