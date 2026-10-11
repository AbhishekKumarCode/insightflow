"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BarChart3, MessageSquare, Flag, ListChecks, FileText, Upload, Search, Sparkles, Database, FilePlus2 } from "lucide-react";
import { useApp } from "@/lib/store";
import { ImportDialog } from "./import-dialog";

const NAV = [
  { href: "/overview", label: "Overview", icon: BarChart3 },
  { href: "/feedback", label: "Feedback", icon: MessageSquare },
  { href: "/priorities", label: "Priorities", icon: Flag },
  { href: "/tracker", label: "Tracker", icon: ListChecks },
  { href: "/reports", label: "Reports", icon: FileText },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const { filters, setFilters, tracked, setImportOpen } = useApp();
  
  return (
    <div className="flex min-h-screen">
      <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-line bg-white p-4 gap-1 sticky top-0 h-screen">
        <Link href="/import" className="flex items-center gap-2 px-2 py-3 text-lg font-semibold">
          <span className="grid size-8 place-items-center rounded-lg bg-brand text-white"><Sparkles size={16} /></span>InsightFlow
        </Link>
        <button onClick={() => setImportOpen(true)} className="mb-3 flex items-center justify-center gap-2 rounded-lg bg-brand px-3 py-2.5 text-sm font-medium text-white hover:bg-indigo-700">
          <Upload size={16} /> Import data
        </button>
        {NAV.map(({ href, label, icon: Icon }) => {
          const on = path.startsWith(href);
          return (
            <Link key={href} href={href} aria-current={on ? "page" : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${on ? "bg-brand-soft text-brand" : "text-muted hover:bg-slate-50"}`}>
              <Icon size={18} />{label}
            </Link>
          );
        })}
      </aside>
      <div className="flex min-w-0 flex-1 flex-col pb-16 md:pb-0">
        <header className="no-print sticky top-0 z-10 flex items-center gap-3 border-b border-line bg-white/90 px-4 py-3 backdrop-blur md:px-8">
          <label className="relative w-full max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input value={filters.q} onChange={(e) => setFilters({ q: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && path !== "/feedback" && router.push("/feedback")}
              placeholder="Search feedback or issues…" aria-label="Search feedback"
              className="w-full rounded-lg border border-line bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" />
          </label>
          <div className="ml-auto flex items-center gap-2 md:gap-3">
            <span className="hidden items-center gap-2 rounded-full border border-line bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 lg:flex">
              <Database size={14} className="text-brand" />Sample dataset · 7,000 reviews
            </span>
            <button onClick={() => setImportOpen(true)} aria-label="Import data" className="grid size-9 place-items-center rounded-lg border border-line text-slate-600 hover:bg-slate-50 md:hidden"><Upload size={18} /></button>
            <Link href="/tracker" aria-label={`${tracked.length} tracked issues`} className="relative grid size-9 place-items-center rounded-lg border border-line text-slate-600 hover:bg-slate-50">
              <ListChecks size={18} />
              {tracked.length > 0 && <span className="absolute -right-1.5 -top-1.5 grid min-w-5 place-items-center rounded-full bg-brand px-1 text-[11px] font-semibold text-white">{tracked.length}</span>}
            </Link>
            <Link href="/reports" className="hidden items-center gap-2 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 sm:flex"><FilePlus2 size={16} />Create report</Link>
            <span aria-hidden className="grid size-9 place-items-center rounded-full bg-brand-soft text-sm font-semibold text-brand">AK</span>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
      <ImportDialog />
      <nav className="no-print fixed inset-x-0 bottom-0 z-20 flex border-t border-line bg-white md:hidden">
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] ${path.startsWith(href) ? "text-brand" : "text-muted"}`}>
            <Icon size={20} />{label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
