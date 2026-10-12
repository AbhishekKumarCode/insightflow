"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Hand, Sparkles, Upload } from "lucide-react";
import { DATA, fmt, issueById } from "@/lib/data";
import { useApp } from "@/lib/store";

const PICKS = ["fr-nodelivery", "cs-good", "op-web", "pf-features", "fr-charge", "op-delay", "fr-clean", "cs-slow"];
const TONE = { positive: "#10b981", neutral: "#f59e0b", negative: "#f43f5e" } as const;
const WORD = { positive: "Positive", neutral: "Mixed", negative: "Negative" } as const;
// Each card drifts on its own rhythm so the board feels alive without being noisy.
const TILT = [-2.5, 1.5, -1, 2.5, -2, 1, -1.5, 2];

/** First visit: a short, playful welcome. Returning visits skip it and go straight to the dashboard. */
export default function Welcome() {
  const router = useRouter();
  const { sessions, restoreSample, openImport } = useApp();
  const [show, setShow] = useState(false);
  const [sorted, setSorted] = useState<Set<string>>(new Set());

  useEffect(() => {
    const force = new URLSearchParams(window.location.search).has("welcome");
    if (localStorage.getItem("if.welcomed") === "1" && !force) router.replace("/overview");
    else setShow(true); // eslint-disable-line react-hooks/set-state-in-effect
  }, [router]);

  // The most-repeated review for each of eight different issues, so the board shows real variety.
  const cards = useMemo(() => PICKS.map((id) => DATA.reviews.filter((r) => r.issue === id).sort((a, b) => b.count - a.count)[0]).filter(Boolean), []);

  const enter = () => {
    localStorage.setItem("if.welcomed", "1");
    if (sessions.length === 0) restoreSample();
    router.push("/overview");
  };
  const importOwn = () => { localStorage.setItem("if.welcomed", "1"); openImport("new"); };
  const sort = (id: string) => setSorted((s) => new Set(s).add(id));

  if (!show) return <div className="min-h-screen bg-background" aria-busy="true" />;

  const steps = [[fmt(DATA.totals.rows), "reviews"], [String(DATA.totals.uniqueReviews), "distinct"], [String(DATA.issues.filter((i) => i.polarity === "negative" && i.negative >= 5).length), "problems"], ["1", "decision"]];

  return (
    <div className="relative min-h-screen overflow-clip bg-background">
      <div aria-hidden className="pointer-events-none absolute -right-40 -top-40 size-[34rem] rounded-full bg-indigo-200/40 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-52 -left-32 size-[30rem] rounded-full bg-sky-200/40 blur-3xl" />

      <header className="relative mx-auto flex max-w-6xl items-center justify-between px-5 py-5 md:px-8">
        <span className="flex items-center gap-2.5 text-lg font-semibold">
          <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden><rect width="32" height="32" rx="8" fill="#6366f1" /><rect x="7" y="16" width="4.5" height="9" rx="1.5" fill="#fff" opacity=".55" /><rect x="13.75" y="10" width="4.5" height="15" rx="1.5" fill="#fff" opacity=".8" /><rect x="20.5" y="6" width="4.5" height="19" rx="1.5" fill="#fff" /></svg>
          InsightFlow
        </span>
        <button onClick={enter} className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-white/70">Skip to the dashboard</button>
      </header>

      <main className="relative mx-auto grid max-w-6xl items-center gap-10 px-5 pb-14 pt-4 md:px-8 lg:grid-cols-[1fr_1.05fr] lg:gap-14 lg:pt-10">
        <section>
          <p className="step-in inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-medium text-brand shadow-sm" style={{ ["--i" as string]: 0 }}><Sparkles size={13} />Customer feedback, decided</p>
          <h1 className="step-in mt-5 text-[40px] font-semibold leading-[1.05] tracking-tight sm:text-[52px]" style={{ ["--i" as string]: 1 }}>
            {fmt(DATA.totals.rows)} reviews.<br />One thing to fix first.
          </h1>
          <p className="step-in mt-5 max-w-md text-[17px] leading-relaxed text-slate-600" style={{ ["--i" as string]: 2 }}>
            InsightFlow reads customer feedback, groups it into problems, and tells you what to fix first and why. Try it: tap a review on the board.
          </p>

          <ol className="step-in mt-7 grid grid-cols-4 gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-x-2 sm:gap-y-3" style={{ ["--i" as string]: 3 }} aria-label="From reviews to a decision">
            {steps.map(([n, label], i) => (
              <li key={label} className="flex items-center gap-2">
                <span className="w-full rounded-2xl border border-slate-200/70 bg-white px-1.5 py-2 text-center shadow-sm sm:w-auto sm:px-3.5"><span className="font-display block text-xl font-semibold tabular-nums leading-none">{n}</span><span className="mt-1 block text-[11px] text-muted">{label}</span></span>
                {i < steps.length - 1 && <ArrowRight size={16} className="hidden text-slate-400 sm:block" aria-hidden />}
              </li>))}
          </ol>

          <div className="step-in mt-8 flex flex-wrap items-center gap-3" style={{ ["--i" as string]: 4 }}>
            <button onClick={enter} className="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand px-6 sm:w-auto text-[15px] font-semibold text-white shadow-[0_10px_24px_-8px_rgba(79,70,229,0.6)] transition hover:bg-blue-800 active:scale-[0.98]">Open the dashboard<ArrowRight size={18} className="transition group-hover:translate-x-0.5" /></button>
            <button onClick={importOwn} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-[15px] font-semibold hover:bg-slate-50 sm:w-auto"><Upload size={16} className="text-brand" />Import my own data</button>
          </div>
          <p className="mt-4 text-xs text-muted">The sample is built in. Everything stays in your browser.</p>
        </section>

        {/* The board: tap a review to see where it goes */}
        <section aria-label="Sort some reviews" className="relative">
          <div className="mb-3 flex items-center justify-between text-sm">
            <span className="inline-flex items-center gap-1.5 font-medium text-slate-700"><Hand size={15} className="text-brand" />Tap a review to sort it</span>
            <span className="rounded-full bg-white px-3 py-1 text-xs tabular-nums text-muted shadow-sm" aria-live="polite">{sorted.size} of {cards.length} sorted</span>
          </div>
          <ul className="grid grid-cols-2 gap-3 sm:gap-4">
            {cards.map((r, i) => {
              const done = sorted.has(r.id);
              const issue = issueById(r.issue);
              return (
                <li key={r.id} style={{ ["--tilt" as string]: `${TILT[i % TILT.length]}deg`, animationDelay: `${i * 0.35}s` }} className="board-card">
                  <button onClick={() => sort(r.id)} aria-pressed={done} className={`flex h-full min-h-[8.5rem] w-full flex-col justify-between rounded-2xl border bg-white p-4 text-left shadow-[0_8px_24px_-12px_rgba(15,18,38,0.35)] transition hover:-translate-y-0.5 ${done ? "border-transparent ring-2" : "border-slate-200/70"}`} style={done ? ({ ["--tw-ring-color" as string]: TONE[r.sentiment] } as React.CSSProperties) : undefined}>
                    {done ? (
                      <span className="sorted-in flex h-full flex-col justify-between">
                        <span><span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold text-white" style={{ background: TONE[r.sentiment] }}>{WORD[r.sentiment]}</span>
                          <span className="mt-2 block text-[15px] font-semibold leading-snug">{issue.name}</span></span>
                        <span className="mt-3 text-xs text-muted">{issue.category} · said {fmt(r.count)}×</span>
                      </span>
                    ) : (
                      <>
                        <span className="text-[14px] leading-snug text-slate-800">“{r.text}”</span>
                        <span className="mt-3 flex items-center gap-1.5 text-[11px] text-muted"><i className="size-1.5 rounded-full bg-slate-300" />Not sorted yet</span>
                      </>)}
                  </button>
                </li>);
            })}
          </ul>
          {sorted.size >= 3 && (
            <p className="sorted-in mt-4 rounded-xl bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">That is the idea. InsightFlow does this for all {fmt(DATA.totals.rows)} reviews, counts how many people said each thing, and ranks the problems. <button onClick={enter} className="font-semibold text-brand underline underline-offset-2">See the ranking</button></p>)}
        </section>
      </main>
    </div>
  );
}
