import type { Sentiment } from "@/lib/data";

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-lg border border-slate-200/70 bg-white p-5 ${className}`}>{children}</section>;
}
export function PageHead({ title, sub, right }: { title: string; sub: string; right?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div><h1 className="text-[28px] font-semibold leading-tight">{title}</h1><p className="mt-1 text-sm text-muted">{sub}</p></div>
      {right}
    </div>
  );
}
const SENT = { positive: "bg-green-50 text-green-700", neutral: "bg-amber-50 text-amber-700", negative: "bg-red-50 text-red-700" };
export function SentimentPill({ s }: { s: Sentiment }) {
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${SENT[s]}`}>{s}</span>;
}
export function Chip({ children }: { children: React.ReactNode }) {
  return <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">{children}</span>;
}
export function ScoreBadge({ score }: { score: number }) {
  return <span className="inline-block whitespace-nowrap rounded-md bg-brand-soft px-2 py-0.5 text-xs font-semibold text-brand">Priority {score}</span>;
}
export const btn = "inline-flex items-center justify-center gap-2 rounded-lg border border-line bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50";
export const btnPrimary = "inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50";

export const tier = (score: number) => (score >= 85 ? "#c8372d" : score >= 70 ? "#c98a1b" : "#1d4ed8");
/** Score as a ring: the arc fills in proportion to the 0-100 score. */
export function ScoreRing({ score, size = 44 }: { score: number; size?: number }) {
  const r = (size - 6) / 2, c = 2 * Math.PI * r;
  return (
    <span className="relative inline-grid shrink-0 place-items-center" style={{ width: size, height: size }} role="img" aria-label={`Priority ${score} of 100`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth="4" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={tier(score)} strokeWidth="4" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)} />
      </svg>
      <span className="absolute text-[13px] font-semibold tabular-nums">{score}</span>
    </span>
  );
}
