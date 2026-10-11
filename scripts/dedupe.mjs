import fs from "node:fs";
import Papa from "papaparse";

const csv = fs.readFileSync("data/sample.csv", "utf8");
const { data } = Papa.parse(csv, { header: true, skipEmptyLines: true });
const norm = (s) => s.trim().replace(/\s+/g, " ");
const map = new Map();
for (const r of data) {
  const text = norm(r.review ?? "");
  if (!text) continue;
  const key = `${r.category}||${text.toLowerCase()}`;
  const e = map.get(key) ?? { text, category: r.category, count: 0 };
  e.count++;
  map.set(key, e);
}
const unique = [...map.values()]
  .sort((a, b) => a.category.localeCompare(b.category) || b.count - a.count)
  .map((e, i) => ({ id: `r${String(i + 1).padStart(3, "0")}`, ...e }));
fs.writeFileSync("data/unique.json", JSON.stringify(unique, null, 1));
console.log({ rows: data.length, unique: unique.length });
