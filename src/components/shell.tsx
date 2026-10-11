"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo } from "react";
import { BarChart3, MessageSquare, Flag, ListChecks, FileText, Upload, Search, Database, FilePlus2 } from "lucide-react";
import { useApp } from "@/lib/store";
import { DEFAULT_FILTERS, summarize, pct, fmt } from "@/lib/data";
import { ImportDialog } from "./import-dialog";

const NAV = [
  { href: "/overview", label: "Overview", icon: BarChart3 },
  { href: "/feedback", label: "Feedback", icon: MessageSquare },
  { href: "/priorities", label: "Priorities", icon: Flag },
  { href: "/tracker", label: "Tracker", icon: ListChecks },
  { href: "/reports", label: "Reports", icon: FileText },
];

function Mark() {
  return (
    <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden>
      <rect width="34" height="34" rx="10" fill="#4f46e5" />
      <rect x="8" y="17" width="4.5" height="9" rx="1.6" fill="#fff" opacity=".55" />
      <rect x="14.75" y="11" width="4.5" height="15" rx="1.6" fill="#fff" opacity=".8" />
      <rect x="21.5" y="7" width="4.5" height="19" rx="1.6" fill="#fff" />
    </svg>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const { filters, setFilters, tracked, setImportOpen, user } = useApp();
  // `filters` changes identity when feedback is added, which must refresh this.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const all = useMemo(() => summarize(DEFAULT_FILTERS), [filters]);
  const { positive, neutral, negative } = all.sentiment;

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col bg-ink2 px-3 py-4 text-slate-300 md:flex">
        <Link href="/overview" className="flex items-center gap-3 px-3 pb-6 pt-2">
          <Mark /><span className="font-display text-xl font-semibold text-white">InsightFlow</span>
        </Link>
        <button onClick={() => setImportOpen(true)} className="mb-5 flex items-center justify-center gap-2 rounded-xl bg-indigo-500 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-400 active:scale-[0.98]">
          <Upload size={16} /> Import data
        </button>
        <nav className="space-y-0.5">
          {NAV.map(({ href, label, icon: Icon }) => {
            const on = path.startsWith(href);
            return (
              <Link key={href} href={href} aria-current={on ? "page" : undefined}
                className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${on ? "bg-white/10 text-white" : "hover:bg-white/5 hover:text-white"}`}>
                {on && <span className="absolute -left-3 top-2 h-[calc(100%-1rem)] w-1 rounded-r-full bg-indigo-400" />}
                <Icon size={18} className={on ? "text-indigo-300" : ""} />{label}
                {href === "/tracker" && tracked.length > 0 && <span className="ml-auto rounded-full bg-indigo-500 px-1.5 text-[11px] font-semibold text-white">{tracked.length}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto rounded-2xl bg-white/5 p-4">
          <p className="flex items-center gap-2 text-sm font-medium text-white"><Database size={14} className="text-indigo-300" />Sample dataset</p>
          <div className="mt-3 flex h-1.5 overflow-hidden rounded-full bg-white/10" role="img" aria-label={`${pct(positive, all.total)}% positive, ${pct(negative, all.total)}% negative`}>
            <div style={{ width: `${pct(positive, all.total)}%` }} className="bg-emerald-400" />
            <div style={{ width: `${pct(neutral, all.total)}%` }} className="bg-amber-400" />
            <div style={{ width: `${pct(negative, all.total)}%` }} className="bg-rose-400" />
          </div>
          <p className="mt-2 text-xs text-slate-400">{fmt(all.total)} reviews, {pct(negative, all.total)}% negative{user.length > 0 && `, ${fmt(user.length)} added by you`}</p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col pb-16 md:pb-0">
        <header className="no-print sticky top-0 z-10 flex items-center gap-3 border-b border-slate-200/70 bg-[#f3f5fa]/85 px-4 py-3 backdrop-blur md:px-8">
          <label className="relative w-full max-w-md">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <input value={filters.q} onChange={(e) => setFilters({ q: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && path !== "/feedback" && router.push("/feedback")}
              placeholder="Search feedback or issues…" aria-label="Search feedback"
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10" />
          </label>
          <div className="ml-auto flex items-center gap-2 md:gap-3">
            <button onClick={() => setImportOpen(true)} aria-label="Import data" className="grid size-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 md:hidden"><Upload size={18} /></button>
            <Link href="/tracker" aria-label={`${tracked.length} tracked issues`} className="relative grid size-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50">
              <ListChecks size={18} />
              {tracked.length > 0 && <span className="absolute -right-1.5 -top-1.5 grid min-w-5 place-items-center rounded-full bg-indigo-600 px-1 text-[11px] font-semibold text-white">{tracked.length}</span>}
            </Link>
            <Link href="/reports" className="hidden items-center gap-2 rounded-xl bg-ink2 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 sm:flex"><FilePlus2 size={16} />Create report</Link>
            <span aria-hidden className="grid size-10 place-items-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700">AK</span>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>

      <ImportDialog />
      <nav className="no-print fixed inset-x-0 bottom-0 z-20 flex border-t border-slate-200 bg-white md:hidden">
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] ${path.startsWith(href) ? "text-indigo-600" : "text-muted"}`}>
            <Icon size={20} />{label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
