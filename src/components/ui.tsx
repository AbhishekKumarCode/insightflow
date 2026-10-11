import type { Sentiment } from "@/lib/data";

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-xl border border-line bg-white p-5 ${className}`}>{children}</section>;
}
export function PageHead({ title, sub, right }: { title: string; sub: string; right?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div><h1 className="text-2xl font-semibold tracking-tight">{title}</h1><p className="mt-1 text-sm text-muted">{sub}</p></div>
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
export const btnPrimary = "inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50";
