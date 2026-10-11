"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import Papa from "papaparse";
import { z } from "zod";
import { UploadCloud, FileText, ArrowRight, AlertCircle, ShieldCheck } from "lucide-react";
import { Card, PageHead, Chip, btn, btnPrimary } from "@/components/ui";
import { ADAPTION } from "@/lib/adaption";
import { DATA, fmt, pct } from "@/lib/data";

const Row = z.object({ review: z.string().min(1) }).passthrough();
type Result = { name: string; rows: number; unique: number; top: { text: string; n: number }[]; isSample: boolean };

function dedupe(rows: Record<string, string>[], name: string, isSample: boolean): Result {
  const m = new Map<string, { text: string; n: number }>();
  for (const r of rows) {
    const text = r.review.trim().replace(/\s+/g, " ");
    const k = text.toLowerCase();
    const e = m.get(k) ?? { text, n: 0 };
    e.n++; m.set(k, e);
  }
  const top = [...m.values()].sort((a, b) => b.n - a.n).slice(0, 5);
  return { name, rows: rows.length, unique: m.size, top, isSample };
}

export default function ImportPage() {
  const [res, setRes] = useState<Result | null>(null);
  const [err, setErr] = useState("");
  const [drag, setDrag] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const useSample = () => {
    setErr("");
    const top = [...DATA.reviews].sort((a, b) => b.count - a.count).slice(0, 5).map((r) => ({ text: r.text, n: r.count }));
    setRes({ name: "BuildBattle sample dataset", rows: DATA.totals.rows, unique: DATA.totals.uniqueReviews, top, isSample: true });
  };

  const onFile = (file: File) => {
    setErr(""); setRes(null);
    if (!file.name.toLowerCase().endsWith(".csv")) return setErr("Please choose a .csv file.");
    if (file.size > 5_000_000) return setErr("This file is over 5 MB. Please upload a smaller CSV.");
    Papa.parse<Record<string, string>>(file, {
      header: true, skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase(),
      complete: ({ data, meta }) => {
        if (!meta.fields?.includes("review")) return setErr(`Couldn't find a "review" column. Columns found: ${meta.fields?.join(", ") || "none"}.`);
        const good = data.filter((r) => Row.safeParse(r).success);
        if (!good.length) return setErr("The file has a review column but no review text.");
        setRes(dedupe(good, file.name, false));
      },
      error: (e) => setErr(`Couldn't read the file: ${e.message}`),
    });
  };

  const a = ADAPTION;
  return (
    <>
      <PageHead title="Import and clean" sub="Bring in a CSV with a review column (and optionally category). We clean it first, then analyze it." />
      <Card
        className={`mb-6 border-dashed text-center ${drag ? "border-brand bg-brand-soft" : ""}`}>
        <div onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) onFile(f); }} className="py-8">
          <UploadCloud className="mx-auto text-brand" size={32} />
          <p className="mt-3 font-medium">Drop a CSV here, or choose a file</p>
          <p className="mt-1 text-sm text-muted">Needs a <code>review</code> column. Max 5 MB.</p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <button className={btn} onClick={() => input.current?.click()}><FileText size={16} />Choose CSV</button>
            <button className={btnPrimary} onClick={useSample}>Use sample data</button>
          </div>
          <input ref={input} type="file" accept=".csv,text/csv" className="hidden" aria-label="CSV file" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
        </div>
      </Card>
      {err && <div role="alert" className="mb-6 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><AlertCircle size={18} className="mt-0.5 shrink-0" />{err}</div>}

      {res && (
        <div className="space-y-6">
          <Card>
            <div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-semibold">Cleaning result</h2><Chip>{res.name}</Chip></div>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <Stat label="Rows imported" value={fmt(res.rows)} />
              <Stat label="Distinct reviews" value={fmt(res.unique)} />
              <Stat label="Repeated text removed" value={`${pct(res.rows - res.unique, res.rows)}%`} />
            </div>
            <h3 className="mt-6 text-sm font-semibold">Most repeated reviews</h3>
            <ul className="mt-2 divide-y divide-line rounded-lg border border-line text-sm">
              {res.top.map((t) => <li key={t.text} className="flex gap-3 px-4 py-2.5"><span className="flex-1">{t.text}</span><span className="shrink-0 text-muted">{fmt(t.n)}×</span></li>)}
            </ul>
            <p className="mt-3 text-xs text-muted">Repeats are not thrown away. Each distinct review keeps its count, so a complaint repeated 295 times still weighs 295 in the priorities.</p>
          </Card>

          {res.isSample && (
            <Card>
              <div className="flex items-center gap-2"><ShieldCheck size={18} className="text-brand" /><h2 className="text-lg font-semibold">Adaption data-quality check</h2></div>
              <p className="mt-1 text-sm text-muted">The sample file was run through Adaption ({a.recipes.join(" + ")}), {a.result.rowsSubmitted.toLocaleString()} rows, {a.creditsUsed} credits.</p>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border border-line p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted">Before cleaning</p>
                  <p className="mt-1 text-3xl font-semibold">{a.before.score.toFixed(1)}<span className="text-lg text-muted">/10</span> <span className="text-lg text-neg">Grade {a.before.grade}</span></p>
                  <p className="mt-1 text-sm text-muted">Percentile {a.before.percentile}%: 99.4% of corporate-business datasets score higher.</p>
                  <dl className="mt-3 space-y-1 text-sm"><Dl k="Domain" v={a.before.domain} /><Dl k="Tone" v={a.before.tone} /><Dl k="Language" v={a.before.language} /></dl>
                </div>
                <div className="rounded-lg border border-line p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted">After cleaning</p>
                  <p className="mt-1 text-3xl font-semibold">{a.overall.score.toFixed(1)}<span className="text-lg text-muted">/10</span> <span className="text-lg text-pos">Grade {a.overall.grade}</span></p>
                  <p className="mt-1 text-sm text-muted">Percentile {a.overall.percentile}%, up {a.overall.relativeImprovementPct}% from the original score.</p>
                  <p className="mt-3 text-sm font-medium tabular-nums">{fmt(a.result.rowsSubmitted)} <span className="text-muted">→</span> {fmt(a.result.rowsAfter)} rows</p>
                  <dl className="mt-3 space-y-1.5 text-sm">
                    <Dl k="Distinct reviews kept" v={`${a.result.distinctReviewsKept} of ${DATA.totals.uniqueReviews}`} />
                    <Dl k="Checklist points earned" v={`${a.result.checklistMeanPct}%`} />
                    <Dl k="Rows with full marks" v={`${a.result.fullMarksRows} of ${a.result.rowsAfter}`} />
                  </dl>
                  <p className="mt-3 text-xs leading-relaxed text-muted">
                    {a.result.reviewsStillRepeated} reviews still repeat (up to {a.result.maxRepeat} times), and repeat counts are lost in the cleaned file, so volume is counted from the original data.
                    Adaption changed the category label in {a.result.labelChangedRows} rows, so its labels are not used as ground truth.
                  </p>
                </div>
              </div>
            </Card>
          )}

          <div className="flex justify-end gap-3">
            {res.isSample ? <Link href="/overview" className={btnPrimary}>Open dashboard <ArrowRight size={16} /></Link>
              : <div className="max-w-md text-right text-sm text-muted">Live analysis of uploaded files needs the server model key, which isn’t configured yet. Use the sample data to explore the full product.</div>}
          </div>
        </div>
      )}
    </>
  );
}
const Stat = ({ label, value }: { label: string; value: string }) => <div className="rounded-lg bg-slate-50 p-4"><p className="text-sm text-muted">{label}</p><p className="mt-1 text-2xl font-semibold">{value}</p></div>;
const Dl = ({ k, v }: { k: string; v: string }) => <div className="flex justify-between"><dt className="text-muted">{k}</dt><dd>{v}</dd></div>;
