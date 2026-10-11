import raw from "../../data/analyzed.json";

export type Sentiment = "positive" | "neutral" | "negative";
export type Review = { id: string; text: string; category: string; count: number; issue: string; sentiment: Sentiment; weekly: number[] };
export type Issue = {
  id: string; category: string; name: string; polarity: "positive" | "negative";
  severity: number; rows: number; uniqueReviews: number; negative: number; positive: number; neutral: number;
  share: number; weekly: number[]; inputs: { volume: number; negativeShare: number; severity: number };
  score: number | null; quotes: { id: string; text: string; count: number }[];
  recommendation: { why: string; actions: string[] } | null;
};
export type Filters = { category: string; sentiment: string; from: number; to: number; q: string };

export const DATA = raw as unknown as {
  timeline: { simulated: boolean; weeks: number; note: string };
  totals: { rows: number; uniqueReviews: number };
  issues: Issue[]; reviews: Review[];
};
export const WEEKS = DATA.timeline.weeks;
export const CATEGORIES = [...new Set(DATA.reviews.map((r) => r.category))];
export const issueById = (id: string) => DATA.issues.find((i) => i.id === id)!;
export const DEFAULT_FILTERS: Filters = { category: "all", sentiment: "all", from: 0, to: WEEKS - 1, q: "" };

/** Rows of a review that fall in the selected week range (original duplicate counts). */
export const weight = (r: Review, f: Filters) => r.weekly.slice(f.from, f.to + 1).reduce((a, b) => a + b, 0);

export function filterReviews(f: Filters) {
  const q = f.q.trim().toLowerCase();
  return DATA.reviews
    .filter((r) => (f.category === "all" || r.category === f.category) && (f.sentiment === "all" || r.sentiment === f.sentiment) && (!q || r.text.toLowerCase().includes(q) || issueById(r.issue).name.toLowerCase().includes(q)))
    .map((r) => ({ r, w: weight(r, f) }))
    .filter((x) => x.w > 0);
}

export function summarize(f: Filters) {
  const rows = filterReviews(f);
  const sentiment = { positive: 0, neutral: 0, negative: 0 };
  const categories: Record<string, number> = {};
  const issueNeg: Record<string, number> = {};
  const weekly = Array(WEEKS).fill(0);
  const weeklyNeg = Array(WEEKS).fill(0);
  let total = 0;
  for (const { r, w } of rows) {
    total += w;
    sentiment[r.sentiment] += w;
    categories[r.category] = (categories[r.category] ?? 0) + w;
    if (r.sentiment === "negative") issueNeg[r.issue] = (issueNeg[r.issue] ?? 0) + w;
    for (let i = f.from; i <= f.to; i++) {
      weekly[i] += r.weekly[i];
      if (r.sentiment === "negative") weeklyNeg[i] += r.weekly[i];
    }
  }
  return { total, unique: rows.length, sentiment, categories, issueNeg, weekly, weeklyNeg, rows };
}

export const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);
export const fmt = (n: number) => n.toLocaleString("en-US");

export const MIN_NEGATIVE = 5;

/** Priority ranking recomputed under category + period filters (sentiment filter ignored: ranking is about problems). */
export function rankIssues(f: Filters) {
  const rows = filterReviews({ ...f, sentiment: "all" });
  const agg: Record<string, { rows: number; neg: number }> = {};
  for (const { r, w } of rows) {
    const a = (agg[r.issue] ??= { rows: 0, neg: 0 });
    a.rows += w;
    if (r.sentiment === "negative") a.neg += w;
  }
  const maxNeg = Math.max(1, ...DATA.issues.filter((i) => i.polarity === "negative").map((i) => agg[i.id]?.neg ?? 0));
  return DATA.issues
    .filter((i) => i.polarity === "negative" && (agg[i.id]?.neg ?? 0) >= MIN_NEGATIVE)
    .map((i) => {
      const a = agg[i.id];
      const volume = a.neg / maxNeg, negativeShare = a.neg / a.rows, severity = i.severity;
      const score = Math.round(100 * (0.4 * volume + 0.35 * negativeShare + 0.25 * severity));
      return { ...i, negative: a.neg, rows: a.rows, inputs: { volume, negativeShare, severity }, score };
    })
    .sort((a, b) => b.score - a.score);
}
