// Summarizes the output file Adaption emailed for the sample dataset.
// Run: node scripts/adaption-summary.mjs /path/to/customer_issue_categories.csv
// Writes data/adaption/summary.json and a trimmed CSV (the full file is ~10 MB of checklist text).
import fs from "node:fs";
import Papa from "papaparse";

const src = process.argv[2];
if (!src) { console.error("Usage: node scripts/adaption-summary.mjs <adapted.csv>"); process.exit(1); }
const { data } = Papa.parse(fs.readFileSync(src, "utf8"), { header: true, skipEmptyLines: true });

const ratios = data.map((r) => Number(r.checklist_total_score) / Number(r.checklist_max_score)).filter(Number.isFinite);
const reviewCounts = new Map();
data.forEach((r) => reviewCounts.set(r.review, (reviewCounts.get(r.review) ?? 0) + 1));
const repeated = [...reviewCounts.values()].filter((n) => n > 1);
const labelChanged = data.filter((r) => r.enhanced_completion !== r.category).length;

const summary = {
  source: "Adaption web app: Instruction dataset, review = prompt, category = context, recipes Prompt Deduplication + Checklist verification",
  rowsSubmitted: 7223,
  rowsAfter: data.length,
  distinctReviewsKept: reviewCounts.size,
  reviewsStillRepeated: repeated.length,
  extraRowsFromRepeats: repeated.reduce((a, n) => a + n - 1, 0),
  maxRepeat: Math.max(...reviewCounts.values()),
  checklistMeanPct: Math.round((ratios.reduce((a, b) => a + b, 0) / ratios.length) * 1000) / 10,
  fullMarksRows: ratios.filter((x) => x === 1).length,
  labelChangedRows: labelChanged,
  promptsRewritten: data.filter((r) => r.enhanced_prompt?.trim()).length,
};
fs.writeFileSync("data/adaption/summary.json", JSON.stringify(summary, null, 2) + "\n");
fs.writeFileSync("data/adaption/adapted_trimmed.csv", Papa.unparse(data.map((r) => ({ review: r.review, category: r.category, enhanced_completion: r.enhanced_completion, checklist_total_score: r.checklist_total_score, checklist_max_score: r.checklist_max_score }))) + "\n");
console.log(summary);
