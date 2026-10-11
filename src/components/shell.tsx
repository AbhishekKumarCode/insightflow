"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo } from "react";
import { Upload, Search } from "lucide-react";
import { useApp } from "@/lib/store";
import { DEFAULT_FILTERS, summarize, pct, fmt } from "@/lib/data";
import { ImportDialog } from "./import-dialog";

const NAV = [
  { href: "/overview", label: "Overview" },
  { href: "/feedback", label: "Feedback" },
  { href: "/priorities", label: "Priorities" },
  { href: "/tracker", label: "Tracker" },
  { href: "/reports", label: "Reports" },
];

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
      <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col border-r border-line px-5 py-6 md:flex">
        <Link href="/overview" className="mb-8 flex items-center gap-2.5">
          <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden><rect width="22" height="22" rx="4" fill="#111" /><path d="M5 15.5h3v-4H5zM9.5 15.5h3v-8h-3zM14 15.5h3v-11h-3z" fill="#f7f7f5" /></svg>
          <span className="text-[17px] font-semibold">InsightFlow</span>
        </Link>
        <button onClick={() => setImportOpen(true)} className="mb-6 flex items-center justify-center gap-2 rounded-md bg-ink2 px-3 py-2 text-sm font-medium text-white transition hover:bg-stone-700">
          <Upload size={15} /> Import data
        </button>
        <nav className="space-y-0.5 text-[15px]">
          {NAV.map(({ href, label }) => {
            const on = path.startsWith(href);
            return (
              <Link key={href} href={href} aria-current={on ? "page" : undefined}
                className={`flex items-center justify-between rounded-md px-2.5 py-1.5 transition-colors ${on ? "bg-stone-200/70 font-semibold text-ink" : "text-stone-600 hover:bg-stone-200/40 hover:text-ink"}`}>
                {label}
                {href === "/tracker" && tracked.length > 0 && <span className="text-sm font-medium tabular-nums text-stone-500">{tracked.length}</span>}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto border-t border-line pt-4 text-sm">
          <p className="font-medium">Sample dataset</p>
          <div className="mt-2 flex h-1 overflow-hidden rounded-full bg-stone-200" role="img" aria-label={`${pct(positive, all.total)}% positive, ${pct(negative, all.total)}% negative`}>
            <div style={{ width: `${pct(positive, all.total)}%` }} className="bg-pos" /><div style={{ width: `${pct(neutral, all.total)}%` }} className="bg-neu" /><div style={{ width: `${pct(negative, all.total)}%` }} className="bg-neg" />
          </div>
          <p className="mt-2 text-xs leading-relaxed text-muted">{fmt(all.total)} reviews, {pct(negative, all.total)}% negative{user.length > 0 && `. ${fmt(user.length)} added by you.`}</p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col pb-16 md:pb-0">
        <header className="no-print sticky top-0 z-10 flex items-center gap-3 border-b border-line bg-background/90 px-4 py-3 backdrop-blur md:px-10">
          <label className="relative w-full max-w-sm">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input value={filters.q} onChange={(e) => setFilters({ q: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && path !== "/feedback" && router.push("/feedback")}
              placeholder="Search feedback or issues" aria-label="Search feedback"
              className="w-full rounded-md border border-line bg-white py-2 pl-9 pr-3 text-sm outline-none transition focus:border-stone-900" />
          </label>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <button onClick={() => setImportOpen(true)} aria-label="Import data" className="grid size-9 place-items-center rounded-md border border-line bg-white md:hidden"><Upload size={16} /></button>
            <Link href="/tracker" aria-label={`${tracked.length} tracked issues`} className="hidden rounded-md px-2 py-1.5 text-stone-600 hover:text-ink sm:block">Tracked <b className="tabular-nums text-ink">{tracked.length}</b></Link>
            <Link href="/reports" className="rounded-md border border-stone-900 px-3 py-1.5 font-medium hover:bg-stone-900 hover:text-white">Create report</Link>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 md:px-10 md:py-10">{children}</main>
      </div>

      <ImportDialog />
      <nav className="no-print fixed inset-x-0 bottom-0 z-20 flex border-t border-line bg-background md:hidden">
        {NAV.map(({ href, label }) => (
          <Link key={href} href={href} className={`flex-1 py-3 text-center text-xs ${path.startsWith(href) ? "font-semibold text-ink" : "text-muted"}`}>{label}</Link>
        ))}
      </nav>
    </div>
  );
}
