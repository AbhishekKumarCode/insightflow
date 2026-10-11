export type RawRow = { review: string; category?: string };

const EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/g;
const CARD = /\b(?:\d[ -]?){13,16}\b/g;
const PHONE = /(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}\b/g;

/** Mask personal data before anything is stored or analyzed. */
export function maskPII(text: string) {
  let emails = 0, cards = 0, phones = 0;
  const out = text
    .replace(EMAIL, () => (emails++, "[email]"))
    .replace(CARD, () => (cards++, "[card]"))
    .replace(PHONE, () => (phones++, "[phone]"));
  return { text: out, emails, cards, phones };
}

export type Distinct = { text: string; category?: string; count: number };

export function scan(rows: RawRow[]) {
  const map = new Map<string, Distinct>();
  let emails = 0, cards = 0, phones = 0, piiRows = 0, short = 0, nonAscii = 0, withCat = 0;
  for (const r of rows) {
    const m = maskPII(r.review.trim().replace(/\s+/g, " "));
    emails += m.emails; cards += m.cards; phones += m.phones;
    if (m.emails + m.cards + m.phones > 0) piiRows++;
    if (m.text.split(" ").length < 3) short++;
    if (/[^\x00-\x7F]/.test(m.text)) nonAscii++;
    if (r.category?.trim()) withCat++;
    const key = `${(r.category ?? "").toLowerCase()}||${m.text.toLowerCase()}`;
    const e = map.get(key) ?? { text: m.text, category: r.category?.trim() || undefined, count: 0 };
    e.count++; map.set(key, e);
  }
  const distinct = [...map.values()];
  const n = rows.length;
  return {
    rows: n, distinct, duplicateShare: n ? (n - distinct.length) / n : 0,
    pii: { emails, cards, phones, rows: piiRows }, short, nonAsciiShare: n ? nonAscii / n : 0, categoryShare: n ? withCat / n : 0,
  };
}
export type Scan = ReturnType<typeof scan>;
