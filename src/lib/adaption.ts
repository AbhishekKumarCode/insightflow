import summary from "../../data/adaption/summary.json";

/**
 * Results of the real Adaption run on data/sample.csv (web app, Instruction dataset,
 * review = prompt, category = context, recipes: Prompt Deduplication + Checklist verification).
 * `result` is computed from the file Adaption emailed: node scripts/adaption-summary.mjs <file>.
 * `overall` is Adaption's own 0-10 score for the cleaned data, read from its results page (Measure tab).
 */
export const ADAPTION = {
  datasetName: "customer_issue_categories",
  creditsUsed: 73,
  before: { score: 2.0, grade: "E", percentile: 0.6, domain: "Corporate-business (48%)", tone: "Professional (66%)", language: "English (100%)" },
  result: summary,
  overall: { score: 9.6, grade: "A", percentile: 57.7, relativeImprovementPct: 380 },
  recipes: ["Prompt Deduplication", "Checklist verification"],
};
