// Compares live model labels with the hand-written rules in data/labels.json.
// Run: node --env-file=.env.local scripts/validate-llm.mjs
import fs from "node:fs";
import { labelReviews } from "../src/lib/analyze.ts";

const { reviews } = JSON.parse(fs.readFileSync("data/labels.json", "utf8"));
const t0 = Date.now();
const llm = await labelReviews(reviews.map(({ id, text, category, count }) => ({ id, text, category, count })), (n) => process.stdout.write(`\r${n}/${reviews.length}`));
console.log(`\nLabeled in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
fs.writeFileSync("data/llm-labels.json", JSON.stringify(llm, null, 1));

const mine = new Map(reviews.map((r) => [r.id, r]));
let agree = 0, agreeRows = 0, total = 0;
const diffs = [];
for (const l of llm) {
  const m = mine.get(l.id);
  total += l.count;
  if (m.sentiment === l.sentiment) { agree++; agreeRows += l.count; } else diffs.push({ id: l.id, n: l.count, mine: m.sentiment, llm: l.sentiment, text: l.text.slice(0, 80) });
}
console.log(`Sentiment agreement: ${agree}/${llm.length} distinct (${((agree / llm.length) * 100).toFixed(0)}%), ${((agreeRows / total) * 100).toFixed(1)}% of all 7,000 rows`);
diffs.sort((a, b) => b.n - a.n).slice(0, 15).forEach((d) => console.log(" ", d.n, d.id, "mine:", d.mine, "llm:", d.llm, "|", d.text));

// Issue grouping: for each model issue, how pure is it against my issue ids (row-weighted)?
const groups = {};
for (const l of llm) { const g = (groups[l.issue] ??= {}); const k = mine.get(l.id).issue; g[k] = (g[k] ?? 0) + l.count; }
let pure = 0;
const rows = Object.entries(groups).map(([name, g]) => { const s = Object.values(g).reduce((a, b) => a + b, 0); const top = Math.max(...Object.values(g)); pure += top; return { name, rows: s, purity: top / s }; }).sort((a, b) => b.rows - a.rows);
console.log(`\nModel found ${rows.length} issues (mine: ${Object.keys(JSON.parse(fs.readFileSync("data/labels.json", "utf8")).issues).length}). Row-weighted purity vs mine: ${((pure / total) * 100).toFixed(1)}%`);
rows.slice(0, 14).forEach((r) => console.log(" ", String(r.rows).padStart(5), (r.purity * 100).toFixed(0).padStart(4) + "%", r.name));
