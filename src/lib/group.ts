import { tokens, type Index } from "./match";
import type { IssueDef } from "./data";

export type Unmatched = { text: string; count: number; category?: string; sentiment: "positive" | "neutral" | "negative" };

const MONEY = /refund|charg|payment|paid|scam|fraud|stolen|billing|overcharg|money|card/i;
const BROKEN = /broken|defect|crash|stopped|not work|doesn't work|fail|error|bug|damag|missing|wrong/i;
const SUPPORT = /unresolved|ignor|no response|never repl|no reply|rude|unhelpful|not helpful/i;
const DELAY = /late|delay|slow|wait|weeks|days/i;
/** Severity from keywords: money and fraud first, broken things next, then unanswered support, then delays. */
export const severityOf = (text: string) => (MONEY.test(text) ? 0.9 : BROKEN.test(text) ? 0.7 : SUPPORT.test(text) ? 0.65 : DELAY.test(text) ? 0.5 : 0.5);

const title = (t: string) => {
  const w = t.replace(/\s+/g, " ").trim().replace(/[.!?]+$/, "").split(" ");
  const cut = w.slice(0, 8).join(" ");
  return w.length > 8 ? `${cut}…` : cut;
};
const dot = (a: Map<string, number>, b: Map<string, number>) => { let s = 0; a.forEach((x, k) => { const y = b.get(k); if (y) s += x * y; }); return s; };

/**
 * Reviews that match no known issue are grouped by similarity into new issues, so any dataset gets a ranking
 * without a model. Groups are named after their most-repeated review, and severity comes from keywords.
 */
export function groupUnmatched(index: Index, items: Unmatched[], idPrefix: string, threshold = 0.45) {
  const clusters: { seed: Map<string, number>; sentiment: "positive" | "negative"; members: Unmatched[] }[] = [];
  const sorted = items.filter((x) => x.sentiment !== "neutral").sort((a, b) => b.count - a.count);
  for (const it of sorted) {
    const v = index.vec(tokens(it.text));
    const hit = clusters.find((c) => c.sentiment === it.sentiment && dot(c.seed, v) >= threshold);
    if (hit) hit.members.push(it);
    else clusters.push({ seed: v, sentiment: it.sentiment as "positive" | "negative", members: [it] });
  }
  const assign = new Map<string, string>();
  const issues: IssueDef[] = clusters.map((c, n) => {
    const id = `${idPrefix}-${n + 1}`;
    c.members.forEach((m) => assign.set(m.text, id));
    const cats = new Map<string, number>();
    c.members.forEach((m) => m.category && cats.set(m.category, (cats.get(m.category) ?? 0) + m.count));
    const category = [...cats.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Uncategorized";
    const text = c.members.map((m) => m.text).join(" ");
    return { id, name: title(c.members[0].text), category, polarity: c.sentiment, severity: c.sentiment === "negative" ? severityOf(text) : 0, auto: true };
  });
  return { assign, issues };
}
