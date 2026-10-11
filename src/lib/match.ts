/**
 * Key-free matcher: TF-IDF cosine similarity over unigrams + bigrams against the labeled reviews.
 * Bigrams keep negation intact ("no fraudulent activity" is not "fraudulent activity").
 * Used for live feedback when no LLM is available, and as the fallback when an LLM call fails.
 */
export type Labeled = { text: string; issue: string; sentiment: "positive" | "neutral" | "negative" };
export type Match = { issue: string | null; sentiment: Labeled["sentiment"]; similarity: number; neighbor: string; matched: boolean };
/** Below this similarity we do not claim a known issue. */
export const MIN_SIMILARITY = 0.2;

const NEG = /\b(never|not|no|crash\w*|broken|terrible|awful|worst|scam\w*|fraud\w*|wrong|late|delay\w*|refund|useless|disappoint\w*|poor|bad|unresponsive|ignored|rude|stopped|failed|fail\w*|missing|damaged|overcharged|charged twice)\b/i;
const POS = /\b(love|great|excellent|amazing|perfect|fast|helpful|friendly|recommend|good|awesome|happy|smooth|easy|quick|best)\b/i;
function cueSentiment(text: string): Labeled["sentiment"] {
  const n = NEG.test(text), p = POS.test(text);
  return n && !p ? "negative" : p && !n ? "positive" : "neutral";
}

const STOP = new Set(["the", "a", "an", "and", "of", "to", "my", "i", "it", "is", "was", "were", "for", "this", "that", "in", "on", "at", "me", "be", "as", "with"]);

/** Light stemming plus a small synonym map so "replied", "response" and "responding" meet. */
const SYN: Record<string, string> = {
  scam: "fraud", scammed: "fraud", fraudulent: "fraud", fraud: "fraud", cheated: "fraud", counterfeit: "fake", fake: "fake",
  crash: "crash", crashes: "crash", crashed: "crash", crashing: "crash", freeze: "crash", froze: "crash", glitch: "crash", glitches: "crash", bug: "crash", bugs: "crash", error: "crash", errors: "crash",
  late: "delay", delayed: "delay", delays: "delay", slow: "delay", waiting: "wait", waited: "wait",
  replied: "respons", reply: "respons", response: "respons", responded: "respons", respond: "respons", responsive: "respons", unresponsive: "unrespons", ignored: "unrespons", ignoring: "unrespons",
  support: "service", agent: "service", staff: "service", team: "service",
  broke: "broken", broken: "broken", defective: "broken", faulty: "broken", damaged: "damage", damage: "damage",
  charged: "charge", charges: "charge", billed: "charge", refund: "refund", refunded: "refund",
  parcel: "order", package: "order", delivery: "deliver", delivered: "deliver", shipped: "deliver", shipping: "deliver",
};
const stem = (w: string) => SYN[w] ?? (w.length > 4 ? w.replace(/(ing|ed|es|ly|s)$/, "") : w);

export function tokens(text: string): string[] {
  const w = text.toLowerCase().replace(/[^a-z0-9'\s-]/g, " ").split(/\s+/).filter(Boolean).map(stem);
  const uni = w.filter((x) => !STOP.has(x));
  const bi: string[] = [];
  for (let i = 0; i < w.length - 1; i++) bi.push(`${w[i]}_${w[i + 1]}`);
  return [...uni, ...bi];
}

export function buildIndex(corpus: Labeled[]) {
  const docs = corpus.map((c) => tokens(c.text));
  const df = new Map<string, number>();
  docs.forEach((d) => new Set(d).forEach((t) => df.set(t, (df.get(t) ?? 0) + 1)));
  const N = corpus.length;
  const idf = (t: string) => Math.log((N + 1) / ((df.get(t) ?? 0) + 1)) + 1;
  const vec = (toks: string[]) => {
    const tf = new Map<string, number>();
    toks.forEach((t) => tf.set(t, (tf.get(t) ?? 0) + 1));
    const v = new Map<string, number>();
    let norm = 0;
    tf.forEach((n, t) => { const x = n * idf(t); v.set(t, x); norm += x * x; });
    norm = Math.sqrt(norm) || 1;
    v.forEach((x, t) => v.set(t, x / norm));
    return v;
  };
  const vecs = docs.map(vec);
  return { corpus, vecs, vec };
}
export type Index = ReturnType<typeof buildIndex>;

/** k nearest labeled reviews vote on the issue (similarity-weighted). `skip` excludes one corpus row for leave-one-out tests. */
export function classify(index: Index, text: string, k = 5, skip = -1): Match {
  const q = index.vec(tokens(text));
  const scored: { i: number; s: number }[] = [];
  index.vecs.forEach((v, i) => {
    if (i === skip) return;
    let s = 0;
    q.forEach((x, t) => { const y = v.get(t); if (y) s += x * y; });
    scored.push({ i, s });
  });
  scored.sort((a, b) => b.s - a.s);
  const top = scored.slice(0, k);
  const votes = new Map<string, number>();
  top.forEach(({ i, s }) => { const key = index.corpus[i].issue; votes.set(key, (votes.get(key) ?? 0) + s); });
  const issue = [...votes.entries()].sort((a, b) => b[1] - a[1])[0][0];
  const best = top.find(({ i }) => index.corpus[i].issue === issue)!;
  if (best.s < MIN_SIMILARITY) return { issue: null, sentiment: cueSentiment(text), similarity: best.s, neighbor: index.corpus[best.i].text, matched: false };
  return { issue, sentiment: index.corpus[best.i].sentiment, similarity: best.s, neighbor: index.corpus[best.i].text, matched: true };
}
