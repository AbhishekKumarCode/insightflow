// Builds data/analyzed.json from data/labels.json.
// Priority score (heuristic): 100 * (0.40*volume + 0.35*negativeShare + 0.25*severity)
//   volume        = issue's negative reviews / largest issue's negative reviews (original duplicate counts)
//   negativeShare = negative reviews / all reviews in the issue
//   severity      = hand-assigned 0..1 (money loss and fraud > broken product > delays)
import fs from "node:fs";

const { issues: ISSUES, reviews } = JSON.parse(fs.readFileSync("data/labels.json", "utf8"));
const WEEKS = 13;

// Deterministic PRNG so the simulated timeline never changes between builds.
function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const seedOf = (s) => [...s].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) | 0, 7);

const withWeeks = reviews.map((r) => {
  const rnd = mulberry32(seedOf(r.id));
  const weekly = Array(WEEKS).fill(0);
  for (let i = 0; i < r.count; i++) weekly[Math.floor(rnd() * WEEKS)]++;
  return { ...r, weekly };
});

const RECS = {
  "fr-nodelivery": { why: "Customers say they were charged and never received the order. This is direct money loss and the most damaging trust signal in the data.", actions: ["Auto-flag orders that are paid but not shipped within 48 hours and refund them without a customer request.", "Add a seller-payout hold until delivery is confirmed.", "Publish a visible 'paid but not received' escalation path."] },
  "fr-charge": { why: "Repeated charges for one purchase point to a checkout or payment-retry fault, and every case is a chargeback risk.", actions: ["Make payment submission idempotent so a retry cannot charge twice.", "Run a duplicate-charge audit and refund affected orders proactively.", "Alert on two identical charges inside 10 minutes."] },
  "fr-extra": { why: "Sellers asking for more money after the order is placed is a classic scam pattern and breaks the platform's payment promise.", actions: ["Block off-platform payment requests in seller messaging.", "Warn buyers in-chat that no extra payment is ever required.", "Review and suspend sellers who triggered these reports."] },
  "fr-misrep": { why: "Counterfeit or not-as-advertised products are the largest group of fraud complaints and show weak seller verification.", actions: ["Require proof of authenticity for high-risk categories.", "Add a one-click 'not as described' return flow.", "Score sellers on mismatch reports and delist repeat offenders."] },
  "fr-other": { why: "A small set of unspecified fraud reports. Low volume, but each one needs a human look.", actions: ["Route these reports to a manual fraud review queue."] },
  "op-web": { why: "Website crashes and checkout glitches stop customers from buying at all, so every report is lost revenue.", actions: ["Add error and crash monitoring on the order and checkout flow.", "Load-test checkout before the next peak.", "Add a saved-cart recovery so a crash does not lose the order."] },
  "op-wrong": { why: "Wrong items shipped means a failed fulfilment step. It drives returns, refunds and repeat contacts.", actions: ["Add barcode scan verification at packing.", "Audit the order-processing step that maps items to shipments.", "Offer a free swap without a return shipment."] },
  "op-damage": { why: "Damaged packaging and missing items hit customers at first contact and cause refunds.", actions: ["Review packaging standards for fragile and multi-item orders.", "Add a pack-weight check to catch missing items.", "Pick the carrier or lane behind the worst claims and renegotiate."] },
  "op-delay": { why: "Delivery delays are frequent but customers who were informed or compensated were far more forgiving.", actions: ["Send proactive delay notifications with a new date.", "Offer automatic compensation after a set delay.", "Review the slowest carrier lanes."] },
  "cs-unresolved": { why: "Customers say support did not fix their problem. Unresolved cases turn one issue into churn.", actions: ["Track resolution rate, not just first reply time.", "Escalate any ticket still open after 3 days.", "Give agents a clear refund and replacement authority."] },
  "cs-slow": { why: "Long waits for a first response are the main support complaint and make every other problem feel worse.", actions: ["Set a first-response target and staff to it.", "Add auto-acknowledgement with an expected wait.", "Route fraud and payment tickets to the front of the queue."] },
  "pf-broken": { why: "The product stopped working or arrived defective. This is the one product complaint that goes straight to returns.", actions: ["Investigate the failure mode behind 'stopped working after a week'.", "Add a defect-rate check to final quality control.", "Fast-track replacements for early failures."] },
  "pf-expect": { why: "Customers say the product did not match what they expected, which is usually a listing or quality gap.", actions: ["Tighten product descriptions and photos.", "Add real customer photos to listings."] },
};

const total = reviews.reduce((a, r) => a + r.count, 0);
const byIssue = {};
for (const r of withWeeks) {
  const i = (byIssue[r.issue] ??= { rows: 0, neg: 0, pos: 0, neu: 0, uniq: 0, weekly: Array(WEEKS).fill(0), items: [] });
  i.rows += r.count; i.uniq++;
  i[r.sentiment === "negative" ? "neg" : r.sentiment === "positive" ? "pos" : "neu"] += r.count;
  r.weekly.forEach((n, w) => (i.weekly[w] += n));
  i.items.push(r);
}
const maxNeg = Math.max(...Object.values(byIssue).map((i) => i.neg));
const issues = Object.entries(byIssue).map(([id, i]) => {
  const meta = ISSUES[id];
  const volume = i.neg / maxNeg;
  const negativeShare = i.neg / i.rows;
  const severity = meta.severity;
  const score = meta.polarity === "negative" ? Math.round(100 * (0.4 * volume + 0.35 * negativeShare + 0.25 * severity)) : null;
  const quotes = i.items.filter((x) => x.sentiment !== "positive" || meta.polarity === "positive").sort((a, b) => b.count - a.count).slice(0, 3).map((x) => ({ id: x.id, text: x.text, count: x.count }));
  return { id, ...meta, rows: i.rows, uniqueReviews: i.uniq, negative: i.neg, positive: i.pos, neutral: i.neu, share: i.rows / total, weekly: i.weekly, inputs: { volume, negativeShare, severity }, score, quotes, recommendation: RECS[id] ?? null };
}).sort((a, b) => (b.score ?? -1) - (a.score ?? -1));

const sentiment = { positive: 0, neutral: 0, negative: 0 };
const categories = {};
for (const r of reviews) {
  sentiment[r.sentiment] += r.count;
  const c = (categories[r.category] ??= { rows: 0, positive: 0, neutral: 0, negative: 0 });
  c.rows += r.count; c[r.sentiment] += r.count;
}
const out = {
  generatedAt: "build-time",
  timeline: { simulated: true, weeks: WEEKS, note: "Sample data has no dates. Weekly counts are a seeded random spread across 13 weeks." },
  totals: { rows: total, uniqueReviews: reviews.length, sentiment, categories },
  issues,
  reviews: withWeeks.map(({ id, text, category, count, issue, sentiment, weekly }) => ({ id, text, category, count, issue, sentiment, weekly })),
};
fs.writeFileSync("data/analyzed.json", JSON.stringify(out));
console.log(out.totals.sentiment, "\nTop priorities:");
issues.filter((i) => i.score != null).slice(0, 8).forEach((i) => console.log(i.score, i.name, "| neg", i.negative, "share", i.inputs.negativeShare.toFixed(2)));
