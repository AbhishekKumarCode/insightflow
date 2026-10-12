import raw from "../../data/analyzed.json";

export type Sentiment = "positive" | "neutral" | "negative";
export type Review = { id: string; text: string; category: string; count: number; issue: string; sentiment: Sentiment; weekly: number[]; source?: "user"; similarity?: number };
export type Issue = {
  id: string; category: string; name: string; polarity: "positive" | "negative" | "unknown";
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
export const UNMATCHED = "unmatched";
const UNMATCHED_ISSUE: Issue = { id: UNMATCHED, category: "Uncategorized", name: "Not matched to a known issue", polarity: "unknown", severity: 0, rows: 0, uniqueReviews: 0, negative: 0, positive: 0, neutral: 0, share: 0, weekly: [], inputs: { volume: 0, negativeShare: 0, severity: 0 }, score: null, quotes: [], recommendation: null };

/** The active session's data, set by the store: sample sessions include the 320 built-in reviews; imported sessions hold only their own. */
/** An issue created automatically from reviews that matched none of the built-in issues. */
export type IssueDef = { id: string; name: string; category: string; polarity: "positive" | "negative"; severity: number; auto?: boolean };
let INCLUDE_SAMPLE = true;
let EXTRA: Review[] = [];
let EXTRA_ISSUES: IssueDef[] = [];
export const setSessionData = (includeSample: boolean, extra: Review[], issues: IssueDef[] = []) => { INCLUDE_SAMPLE = includeSample; EXTRA = extra; EXTRA_ISSUES = issues; };
const toIssue = (d: IssueDef): Issue => ({ ...UNMATCHED_ISSUE, id: d.id, name: d.name, category: d.category, polarity: d.polarity, severity: d.severity });
export const allReviews = () => (INCLUDE_SAMPLE ? (EXTRA.length ? [...DATA.reviews, ...EXTRA] : DATA.reviews) : EXTRA);
export const categories = () => [...new Set(allReviews().map((r) => r.category))];
export const issueById = (id: string): Issue => DATA.issues.find((i) => i.id === id) ?? (() => { const d = EXTRA_ISSUES.find((x) => x.id === id); return d ? toIssue(d) : UNMATCHED_ISSUE; })();
export const DEFAULT_FILTERS: Filters = { category: "all", sentiment: "all", from: 0, to: WEEKS - 1, q: "" };

/** Rows of a review that fall in the selected week range (original duplicate counts). */
export const weight = (r: Review, f: Filters) => r.weekly.slice(f.from, f.to + 1).reduce((a, b) => a + b, 0);

export function filterReviews(f: Filters) {
  const q = f.q.trim().toLowerCase();
  return allReviews()
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
  const agg: Record<string, { rows: number; neg: number; quotes: { id: string; text: string; count: number }[] }> = {};
  for (const { r, w } of rows) {
    const a = (agg[r.issue] ??= { rows: 0, neg: 0, quotes: [] });
    a.rows += w;
    if (r.sentiment === "negative") { a.neg += w; a.quotes.push({ id: r.id, text: r.text, count: w }); }
  }
  const pool = [...DATA.issues, ...EXTRA_ISSUES.map(toIssue)];
  const maxNeg = Math.max(1, ...pool.filter((i) => i.polarity === "negative").map((i) => agg[i.id]?.neg ?? 0));
  // Big datasets ignore issues with a handful of reports; small imports would otherwise rank nothing.
  const minNeg = rows.reduce((t, x) => t + x.w, 0) >= 500 ? MIN_NEGATIVE : 1;
  return pool
    .filter((i) => i.polarity === "negative" && (agg[i.id]?.neg ?? 0) >= minNeg)
    .map((i) => {
      const a = agg[i.id];
      const volume = a.neg / maxNeg, negativeShare = a.neg / a.rows, severity = i.severity;
      const score = Math.round(100 * (0.4 * volume + 0.35 * negativeShare + 0.25 * severity));
      const quotes = a.quotes.sort((x, y) => y.count - x.count).slice(0, 3);
      const recommendation = i.recommendation ?? autoRecommendation(i.severity, a.neg, a.rows, quotes[0]?.text);
      return { ...i, negative: a.neg, rows: a.rows, inputs: { volume, negativeShare, severity }, score, quotes, recommendation };
    })
    .sort((a, b) => b.score - a.score);
}

/** Plain advice for an issue that was grouped automatically, with no invented numbers. */
function autoRecommendation(severity: number, neg: number, rows: number, quote?: string) {
  return {
    why: `${fmt(neg)} negative ${neg === 1 ? "review" : "reviews"} (${pct(neg, rows)}% of this group) describe a similar problem${quote ? `, for example “${quote}”` : ""}. These reviews matched none of the known issues, so they were grouped automatically by similarity. Read them before acting.`,
    actions: severity >= 0.85
      ? ["Open each case in Feedback and make the affected customers whole.", "Find the cause (payments, orders or the seller) and fix it.", "Reply to every affected customer."]
      : ["Read the original reviews in Feedback.", "Give the issue an owner and track it.", "Confirm the pattern is real before changing anything."],
  };
}
