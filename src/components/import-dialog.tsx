"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Papa from "papaparse";
import { X, UploadCloud, ClipboardPaste, PenLine, CheckCircle2, AlertTriangle, ShieldCheck, Sparkles } from "lucide-react";
import { DATA, WEEKS, UNMATCHED, allReviews, categories, fmt, issueById, type Review } from "@/lib/data";
import { buildIndex, classify } from "@/lib/match";
import { groupUnmatched } from "@/lib/group";
import { scan, type RawRow } from "@/lib/scan";
import { useApp } from "@/lib/store";
import { SentimentPill, btn, btnPrimary } from "./ui";

const norm = (t: string) => t.toLowerCase().replace(/[^a-z0-9 ]+/g, "").replace(/\s+/g, " ").trim();
type Tab = "upload" | "paste" | "one";
const TABS: { id: Tab; label: string; icon: typeof UploadCloud }[] = [
  { id: "upload", label: "Upload CSV", icon: UploadCloud },
  { id: "paste", label: "Paste feedback", icon: ClipboardPaste },
  { id: "one", label: "Add one", icon: PenLine },
];
const MAX_FILE = 100_000_000; // bytes. The file is read in the browser, in chunks, so size is not the constraint.
const MAX_DISTINCT_READ = 50_000; // distinct reviews tracked while reading
const MAX_STORED = 3_000; // distinct reviews kept in a session (browser storage is about 5 MB)

export function ImportDialog() {
  const { importOpen, setImportOpen, addUser, user, clearUser, importDest, createSession, session, sessions, switchSession } = useApp();
  const router = useRouter();
  const ref = useRef<HTMLDialogElement>(null);
  const [tab, setTab] = useState<Tab>("upload");
  const [rows, setRows] = useState<RawRow[] | null>(null);
  const [name, setName] = useState("");
  const [err, setErr] = useState("");
  const [text, setText] = useState("");
  const [cat, setCat] = useState("");
  const [drag, setDrag] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [loadNote, setLoadNote] = useState("");
  const [addAnyway, setAddAnyway] = useState(false);
  const [destChoice, setDestChoice] = useState<"new" | "this" | null>(null);
  const dest = destChoice ?? importDest;

  useEffect(() => {
    const d = ref.current; if (!d) return;
    if (importOpen && !d.open) d.showModal();
    if (!importOpen && d.open) d.close();
  }, [importOpen]);

  const reveal = (r: RawRow[]) => { setRows(r); setScanning(true); setTimeout(() => setScanning(false), 750); };
  const reset = () => { setLoadNote(""); setDestChoice(null); setAddAnyway(false); setScanning(false); setRows(null); setErr(""); setText(""); setName(""); setCat(""); };
  const close = () => { setImportOpen(false); reset(); };

  const index = useMemo(() => buildIndex(DATA.reviews.map((r) => ({ text: r.text, issue: r.issue, sentiment: r.sentiment }))), []);
  // Reviews already in the dashboard (sample data plus anything added before), compared on normalized text.
  // A new session starts empty, so nothing counts as a repeat there.
  const existing = useMemo(() => (dest === "this" ? new Set(allReviews().map((r) => norm(r.text))) : new Set<string>()), [user, importOpen, dest, session.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const result = useMemo(() => {
    if (!rows) return null;
    const s = scan(rows);
    const matched = s.distinct.map((d) => ({ d, m: classify(index, d.text), dup: existing.has(norm(d.text)) }));
    return { s, matched, dupCount: matched.filter((x) => x.dup).length };
  }, [rows, index, existing]);

  const onFile = (file: File) => {
    setErr(""); setRows(null); setLoadNote("");
    if (!file.name.toLowerCase().endsWith(".csv")) return setErr("Please choose a .csv file.");
    if (file.size > MAX_FILE) return setErr(`This file is ${(file.size / 1e6).toFixed(0)} MB. The limit is 100 MB. Export fewer columns or rows and try again.`);
    // Stream the file: keep only review and category, and count repeats as we go, so a big file uses little memory.
    const agg = new Map<string, RawRow>();
    let fields: string[] | undefined, ignored = 0;
    Papa.parse<Record<string, string>>(file, {
      header: true, skipEmptyLines: true, transformHeader: (h) => h.trim().toLowerCase(),
      step: (res) => {
        fields ??= res.meta.fields;
        const text = (res.data.review ?? "").trim();
        if (!text) return;
        const category = res.data.category?.trim() || undefined;
        const key = `${(category ?? "").toLowerCase()}||${text.replace(/\s+/g, " ").toLowerCase()}`;
        const hit = agg.get(key);
        if (hit) hit.count = (hit.count ?? 1) + 1;
        else if (agg.size < MAX_DISTINCT_READ) agg.set(key, { review: text, category, count: 1 });
        else ignored++;
      },
      complete: () => {
        if (!fields?.includes("review")) return setErr(`Couldn't find a "review" column. Columns found: ${fields?.join(", ") || "none"}.`);
        if (!agg.size) return setErr("The file has a review column but no review text.");
        if (ignored) setLoadNote(`This file has more than ${fmt(MAX_DISTINCT_READ)} distinct reviews. The first ${fmt(MAX_DISTINCT_READ)} were analyzed and ${fmt(ignored)} later reviews with new wording were left out.`);
        setName(file.name); reveal([...agg.values()]);
      },
      error: (e) => setErr(`Couldn't read the file: ${e.message}`),
    });
  };
  const fromText = (mode: "paste" | "one") => {
    setErr("");
    const lines = (mode === "paste" ? text.split(/\r?\n/) : [text]).map((l) => l.trim()).filter(Boolean).slice(0, 20000);
    if (!lines.length) return setErr(mode === "paste" ? "Paste at least one review, one per line." : "Write the feedback first.");
    setName(mode === "paste" ? "Pasted feedback" : "Single entry");
    reveal(lines.map((review) => ({ review, category: mode === "one" ? cat || undefined : undefined })));
  };

  const commit = () => {
    if (!result) return;
    const chosen = result.matched.filter((x) => addAnyway || !x.dup).sort((a, b) => b.d.count - a.d.count).slice(0, MAX_STORED);
    const stamp = Date.now();
    // Reviews that match no known issue are grouped with each other into new issues, so they can still be ranked.
    const grouped = groupUnmatched(index, chosen.filter((x) => !x.m.matched).map(({ d, m }) => ({ text: d.text, count: d.count, category: d.category?.trim() || undefined, sentiment: m.sentiment })), `x${stamp.toString(36)}`);
    const list: Review[] = chosen.map(({ d, m }, i) => {
      const issue = m.matched && m.issue ? m.issue : grouped.assign.get(d.text) ?? UNMATCHED;
      const category = d.category?.trim() || (m.matched && m.issue ? issueById(m.issue).category : grouped.issues.find((x) => x.id === issue)?.category ?? "Uncategorized");
      const weekly = Array(WEEKS).fill(0); weekly[WEEKS - 1] = d.count;
      return { id: `u${stamp}-${i}`, text: d.text, category, count: d.count, issue, sentiment: m.sentiment, weekly, source: "user", similarity: m.similarity };
    });
    if (!list.length) return;
    if (dest === "new") createSession(name.replace(/\.csv$/i, "") || "New session", list, grouped.issues); else addUser(list, grouped.issues);
    close();
    router.push("/overview");
  };

  // The same file imported before as its own session?
  const baseName = name.replace(/\.csv$/i, "") || "New session";
  const sameSource = dest === "new" ? sessions.filter((x) => x.kind === "import" && (x.source ?? x.name) === baseName) : [];
  const s = result?.s;
  const nMatched = result?.matched.filter((x) => x.m.matched).length ?? 0;
  const dupCount = result?.dupCount ?? 0;
  const toAdd = result ? result.matched.filter((x) => addAnyway || !x.dup).reduce((a, x) => a + x.d.count, 0) : 0;
  const piiTotal = s ? s.pii.emails + s.pii.cards + s.pii.phones : 0;
  const checks = s ? [
    ...(loadNote ? [{ ok: false, label: "Very large file", note: loadNote }] : []),
    ...(s.distinct.length > MAX_STORED ? [{ ok: false, label: `Only the ${fmt(MAX_STORED)} most repeated reviews are kept`, note: `This file has ${fmt(s.distinct.length)} distinct reviews. A session stores up to ${fmt(MAX_STORED)} in this browser, starting with the ones customers repeat most.` }] : []),
    { ok: true, label: `${fmt(s.rows)} reviews read`, note: `${fmt(s.distinct.length)} distinct` },
    { ok: s.duplicateShare < 0.2, label: `${Math.round(s.duplicateShare * 100)}% repeated text`, note: "Merged into one row each. Counts are kept, so volume still reflects how many customers said it." },
    { ok: dupCount === 0, label: dupCount ? `${dupCount} of ${s.distinct.length} distinct reviews are already in your dashboard` : "Nothing here is in your dashboard yet", note: dupCount ? "They are skipped by default so your counts don't double. Tick the box below to add them again." : "All reviews are new." },
    { ok: piiTotal === 0, label: piiTotal ? `Personal data found in ${s.pii.rows} ${s.pii.rows === 1 ? "review" : "reviews"}` : "No personal data found", note: piiTotal ? `${[s.pii.emails && `${s.pii.emails} email${s.pii.emails > 1 ? "s" : ""}`, s.pii.phones && `${s.pii.phones} phone number${s.pii.phones > 1 ? "s" : ""}`, s.pii.cards && `${s.pii.cards} card-like number${s.pii.cards > 1 ? "s" : ""}`].filter(Boolean).join(", ")}. Masked before anything is stored.` : "Checked for emails, phone and card numbers." },
    { ok: s.short === 0, label: s.short ? `${s.short} very short reviews` : "No very short reviews", note: s.short ? "Under 3 words. These are hard to classify." : "All reviews have enough text to analyze." },
    { ok: s.nonAsciiShare < 0.1, label: s.nonAsciiShare < 0.1 ? "Looks like English" : "Mixed languages likely", note: s.nonAsciiShare < 0.1 ? "Matching is tuned for English text." : "Matching works best on English text." },
    { ok: s.categoryShare > 0.9, label: s.categoryShare > 0.9 ? "Category column present" : "No category column", note: s.categoryShare > 0.9 ? "Used to place reviews." : "Category is inferred from the closest known issue." },
  ] : [];

  return (
    <dialog ref={ref} onClose={() => { setImportOpen(false); reset(); }} onClick={(e) => e.target === ref.current && close()}
      aria-labelledby="import-title" className="m-auto w-[min(720px,calc(100vw-2rem))] rounded-2xl border border-line bg-white p-0 shadow-2xl backdrop:bg-slate-900/50 backdrop:backdrop-blur-sm max-sm:mb-0 max-sm:w-full max-sm:max-w-none max-sm:rounded-b-none max-sm:rounded-t-3xl max-sm:border-x-0 max-sm:border-b-0">
      <div className="flex max-h-[85vh] flex-col max-sm:max-h-[88dvh]">
        <div aria-hidden className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-slate-300 sm:hidden" />
        <div className="flex items-start justify-between border-b border-line px-6 py-4">
          <div><h2 id="import-title" className="text-lg font-semibold">Import data</h2><p className="text-sm text-muted">Add feedback. We check it first, then match it to known issues.</p></div>
          <button onClick={close} aria-label="Close" className="rounded-lg p-1.5 text-muted hover:bg-slate-100"><X size={18} /></button>
        </div>

        <div className="flex gap-1 border-b border-line px-6 pt-3" role="tablist">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} role="tab" aria-selected={tab === id} onClick={() => { setTab(id); reset(); }}
              className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-2.5 pb-2.5 text-sm font-medium sm:px-3 ${tab === id ? "border-brand text-brand" : "border-transparent text-muted hover:text-ink"}`}>
              <Icon size={16} className="hidden sm:block" />{label}</button>
          ))}
        </div>

        <div className="space-y-5 overflow-y-auto px-6 py-5">
          {!rows && tab === "upload" && (
            <div key="u" onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
              onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) onFile(f); }}
              className={`tab-pane rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors ${drag ? "scale-[1.01] border-brand bg-brand-soft" : "border-line"}`}>
              <UploadCloud className="mx-auto text-brand" size={30} />
              <p className="mt-3 font-medium">Drop a CSV here</p>
              <p className="mt-1 text-sm text-muted">Needs a <code>review</code> column. <code>category</code> is optional. Up to 100 MB.</p>
              <label className={`${btn} mt-4 cursor-pointer`}>Choose file<input type="file" accept=".csv,text/csv" aria-label="CSV file" className="sr-only" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} /></label>
            </div>
          )}
          {!rows && tab === "paste" && (
            <div className="tab-pane"><textarea value={text} onChange={(e) => setText(e.target.value)} rows={7} placeholder={"One review per line, for example:\nMy order never arrived and nobody answers my emails\nGreat product, fast delivery"} aria-label="Pasted feedback"
              className="w-full rounded-lg border border-line p-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" />
              <button className={`${btnPrimary} mt-3`} onClick={() => fromText("paste")}>Check feedback</button></div>
          )}
          {!rows && tab === "one" && (
            <div className="tab-pane space-y-3">
              <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} placeholder="What did the customer say?" aria-label="Feedback text"
                className="w-full rounded-lg border border-line p-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" />
              <select value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Category" className="rounded-lg border border-line px-3 py-2 text-sm">
                <option value="">Category: detect automatically</option>{categories().filter((c) => c !== "Uncategorized").map((c) => <option key={c}>{c}</option>)}
              </select>
              <div><button className={btnPrimary} onClick={() => fromText("one")}>Check feedback</button></div>
            </div>
          )}
          {err && <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><AlertTriangle size={16} className="mt-0.5 shrink-0" />{err}</div>}

          {result && s && scanning && (
            <div role="status" className="tab-pane py-10 text-center">
              <div className="relative mx-auto h-1.5 w-56 overflow-hidden rounded-full bg-slate-100"><div className="absolute inset-y-0 w-1/3 rounded-full bg-brand" style={{ animation: "scan 0.9s ease-in-out infinite" }} /></div>
              <p className="mt-3 text-sm text-muted">Checking {fmt(rows?.reduce((a, r) => a + (r.count ?? 1), 0) ?? 0)} reviews: duplicates, personal data, language…</p>
            </div>
          )}
          {result && s && !scanning && (
            <>
              <div>
                <div className="mb-2 flex items-center gap-2"><ShieldCheck size={16} className="text-brand" /><h3 className="text-sm font-semibold">Pre-flight check</h3><span className="text-xs text-muted">{name}</span></div>
                <ul className="divide-y divide-line rounded-lg border border-line">
                  {checks.map((c, i) => (
                    <li key={c.label} style={{ ["--i" as string]: i }} className="step-in flex gap-3 px-4 py-2.5 text-sm">
                      <span className="pop-in mt-0.5 shrink-0" style={{ ["--i" as string]: i }}>{c.ok ? <CheckCircle2 size={16} className="text-pos" /> : <AlertTriangle size={16} className="text-neu" />}</span>
                      <div><p className="font-medium">{c.label}</p><p className="text-xs text-muted">{c.note}</p></div>
                    </li>))}
                </ul>
                {dupCount > 0 && <label className="mt-3 flex cursor-pointer items-start gap-2 text-sm"><input type="checkbox" checked={addAnyway} onChange={(e) => setAddAnyway(e.target.checked)} className="mt-0.5 size-4 accent-indigo-600" /><span>Add the {dupCount} repeated {dupCount === 1 ? "review" : "reviews"} again anyway</span></label>}
              </div>
              <fieldset>
                <legend className="mb-2 text-sm font-semibold">Add to</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {([["this", `This session`, session.name], ["new", "New session", "Its own dashboard, tracker and reports"]] as const).map(([v, title, sub]) => (
                    <label key={v} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm ${dest === v ? "border-brand bg-brand-soft" : "border-line hover:bg-slate-50"}`}>
                      <input type="radio" name="dest" value={v} checked={dest === v} onChange={() => setDestChoice(v)} className="mt-0.5 size-4 accent-indigo-600" />
                      <span className="min-w-0"><span className="block font-medium">{title}</span><span className="block truncate text-xs text-muted">{sub}</span></span>
                    </label>
                  ))}
                </div>
              </fieldset>
              {sameSource.length > 0 && (
                <div role="status" className="flex flex-wrap items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  <span className="min-w-0 flex-1">You already imported “{baseName}” as the session “{sameSource[0].name}”. A new session makes a separate copy.</span>
                  <button onClick={() => { switchSession(sameSource[0].id); close(); router.push("/overview"); }} className="shrink-0 rounded-lg border border-amber-300 bg-white px-3 py-1.5 font-medium hover:bg-amber-100">Open existing</button>
                </div>)}
              <div>
                <div className="mb-2 flex items-center gap-2"><Sparkles size={16} className="text-brand" /><h3 className="text-sm font-semibold">Matched to known issues</h3>
                  <span className="text-xs text-muted">{nMatched} of {result.matched.length} distinct reviews matched</span></div>
                <ul className="divide-y divide-line rounded-lg border border-line text-sm">
                  {result.matched.slice(0, 5).map(({ d, m }, i) => (
                    <li key={d.text} style={{ ["--i" as string]: i + checks.length }} className="step-in space-y-1 px-4 py-2.5">
                      <p>{d.text}{d.count > 1 && <span className="ml-1 text-xs text-muted">({fmt(d.count)}×)</span>}</p>
                      <p className="flex flex-wrap items-center gap-2 text-xs"><SentimentPill s={m.sentiment} />
                        {m.matched && m.issue ? <span className="text-slate-600">{issueById(m.issue).name} <span className="text-muted">· {Math.round(m.similarity * 100)}% similar to “{m.neighbor.slice(0, 48)}…”</span></span>
                          : <span className="text-muted">No close match to a known issue. It will be grouped with similar reviews into a new issue.</span>}</p>
                    </li>))}
                </ul>
                <p className="mt-2 text-xs text-muted">Matching compares each review with the 320 labeled reviews. When nothing is close it says so, and those reviews are grouped with each other into new issues.</p>
              </div>
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-line px-6 py-4">
          {user.length > 0 && !rows && <button onClick={() => { clearUser(); }} className="text-sm text-muted hover:text-neg">Remove my {fmt(user.length)} added reviews</button>}
          <Link href="/import" onClick={close} className="text-sm text-muted hover:text-brand">Adaption cleaning details</Link>
          <div className="ml-auto flex gap-2">
            {rows && <button className={btn} onClick={reset}>Back</button>}
            {rows && !scanning && <button disabled={toAdd === 0} className={`${btnPrimary} step-in`} style={{ ["--i" as string]: checks.length + 2 }} onClick={commit}>{toAdd === 0 ? "Nothing new to add" : dest === "new" ? `Create session with ${fmt(toAdd)} ${toAdd === 1 ? "review" : "reviews"}` : `Add ${fmt(toAdd)} ${toAdd === 1 ? "review" : "reviews"} to dashboard`}</button>}
          </div>
        </div>
      </div>
    </dialog>
  );
}
