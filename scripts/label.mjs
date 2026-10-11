// Issue taxonomy + labeling rules, written after reading all 320 unique reviews.
// Severity (0-1) is a judgment: fraud and money loss > broken product > delays > cosmetic.
import fs from "node:fs";

export const ISSUES = {
  "cs-unresolved": { category: "Customer Service", name: "Support left issues unresolved", polarity: "negative", severity: 0.7 },
  "cs-slow": { category: "Customer Service", name: "Slow or no support response", polarity: "negative", severity: 0.6 },
  "cs-good": { category: "Customer Service", name: "Helpful, fast support", polarity: "positive", severity: 0 },
  "fr-charge": { category: "Fraud and Scam", name: "Duplicate or unauthorized charges", polarity: "negative", severity: 0.95 },
  "fr-nodelivery": { category: "Fraud and Scam", name: "Charged but order never arrived", polarity: "negative", severity: 0.95 },
  "fr-extra": { category: "Fraud and Scam", name: "Extra payment demanded after ordering", polarity: "negative", severity: 0.9 },
  "fr-misrep": { category: "Fraud and Scam", name: "Counterfeit or misrepresented product", polarity: "negative", severity: 0.85 },
  "fr-other": { category: "Fraud and Scam", name: "Other suspected fraud", polarity: "negative", severity: 0.9 },
  "fr-clean": { category: "Fraud and Scam", name: "No fraud, genuine seller", polarity: "positive", severity: 0 },
  "op-damage": { category: "Operational Issues", name: "Damaged packaging or missing items", polarity: "negative", severity: 0.7 },
  "op-wrong": { category: "Operational Issues", name: "Wrong items shipped", polarity: "negative", severity: 0.75 },
  "op-web": { category: "Operational Issues", name: "Website crashes and checkout glitches", polarity: "negative", severity: 0.65 },
  "op-delay": { category: "Operational Issues", name: "Delivery delays", polarity: "negative", severity: 0.5 },
  "op-good": { category: "Operational Issues", name: "On-time delivery, smooth ordering", polarity: "positive", severity: 0 },
  "pf-broken": { category: "Product Feedback", name: "Defects or stopped working", polarity: "negative", severity: 0.8 },
  "pf-expect": { category: "Product Feedback", name: "Falls short of expectations", polarity: "negative", severity: 0.55 },
  "pf-quality": { category: "Product Feedback", name: "Quality and durability praised", polarity: "positive", severity: 0 },
  "pf-value": { category: "Product Feedback", name: "Good value for money", polarity: "positive", severity: 0 },
  "pf-features": { category: "Product Feedback", name: "Innovative, useful features", polarity: "positive", severity: 0 },
  "pf-design": { category: "Product Feedback", name: "Design and usability praised", polarity: "positive", severity: 0 },
  "pf-perf": { category: "Product Feedback", name: "Performance and reliability praised", polarity: "positive", severity: 0 },
};

const has = (t, re) => re.test(t.toLowerCase());

function rule(r) {
  const t = r.text;
  switch (r.category) {
    case "Customer Service":
      if (has(t, /unresponsive|wait for a long time|took a long time/)) return ["cs-slow", "negative"];
      if (has(t, /not helpful|unhelpful|unresolved|terrible/)) return ["cs-unresolved", "negative"];
      return ["cs-good", "positive"];
    case "Fraud and Scam":
      if (has(t, /not a victim|no fraudulent activity|no signs of fraud/)) return ["fr-clean", "positive"];
      if (has(t, /charged multiple times/)) return ["fr-charge", "negative"];
      if (has(t, /never received|never sent|not received/)) return ["fr-nodelivery", "negative"];
      if (has(t, /additional payment/)) return ["fr-extra", "negative"];
      if (has(t, /not as advertised|counterfeit|not authentic|not related|did not function|low-quality|not function|did not meet/)) return ["fr-misrep", "negative"];
      return ["fr-other", "negative"];
    case "Operational Issues": {
      if (has(t, /packaging was damaged|items were missing|damaged upon arrival/)) return ["op-damage", "negative"];
      if (has(t, /wrong items/)) return ["op-wrong", "negative"];
      if (has(t, /crash|glitch|unresponsive|technical issues|checkout|issues while placing/)) {
        return has(t, /support team was (helpful|quick)/) ? ["op-web", "neutral"] : ["op-web", "negative"];
      }
      if (has(t, /delay/)) {
        const softened = has(t, /compensation|transparent|informed|updates|satisfactory|replacement|worth it/);
        return ["op-delay", softened ? "neutral" : "negative"];
      }
      if (has(t, /operational issue/)) return ["op-delay", "neutral"];
      return ["op-good", "positive"];
    }
    case "Product Feedback": {
      if (has(t, /stopped working|defects/)) return ["pf-broken", has(t, /replacement/) ? "neutral" : "negative"];
      if (has(t, /did not meet|does not meet|average/)) return ["pf-expect", "negative"];
      if (has(t, /minor issue/)) return ["pf-expect", "neutral"];
      if (has(t, /value for money|worth the price|investment|worth it/)) return ["pf-value", "positive"];
      if (has(t, /durab|well-made|quality|perfect condition/)) return ["pf-quality", "positive"];
      if (has(t, /design|user-friendly|intuitive/) && !has(t, /features/)) return ["pf-design", "positive"];
      if (has(t, /performance|efficient|reliable|stable/) && !has(t, /features/)) return ["pf-perf", "positive"];
      if (has(t, /feature|innovative|game-changer/)) return ["pf-features", "positive"];
      return ["pf-design", "positive"];
    }
  }
}

const unique = JSON.parse(fs.readFileSync("data/unique.json", "utf8"));
const labels = unique.map((r) => {
  const [issue, sentiment] = rule(r);
  return { ...r, issue, sentiment };
});
fs.writeFileSync("data/labels.json", JSON.stringify({ issues: ISSUES, reviews: labels }, null, 1));

const tally = {};
for (const l of labels) {
  const k = `${l.issue}|${l.sentiment}`;
  tally[k] ??= { unique: 0, rows: 0 };
  tally[k].unique++; tally[k].rows += l.count;
}
console.table(tally);
