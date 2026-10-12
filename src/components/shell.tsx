"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { BarChart3, MessageSquare, Flag, ListChecks, FileText, Search, Database, FilePlus2, Plus, MoreHorizontal, ChevronDown, Check } from "lucide-react";
import { useApp, type Session } from "@/lib/store";
import { DATA, DEFAULT_FILTERS, summarize, fmt } from "@/lib/data";
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
    <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden>
      <rect width="32" height="32" rx="8" fill="#6366f1" />
      <rect x="7" y="16" width="4.5" height="9" rx="1.5" fill="#fff" opacity=".55" />
      <rect x="13.75" y="10" width="4.5" height="15" rx="1.5" fill="#fff" opacity=".8" />
      <rect x="20.5" y="6" width="4.5" height="19" rx="1.5" fill="#fff" />
    </svg>
  );
}

/** Close a popover on outside click or Escape. */
function useDismiss(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const off = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) close(); };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("mousedown", off); document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", off); document.removeEventListener("keydown", esc); };
  }, [open, close]);
  return ref;
}

function sessionCount(s: Session) { return (s.kind === "sample" ? DATA.totals.rows : 0) + s.extra.reduce((a, r) => a + r.count, 0); }
function groupLabel(s: Session) {
  if (s.kind === "sample") return "Sample";
  return "Your sessions";
}

export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const { filters, setFilters, tracked, openImport, user, reports, clearUser, clearTracked, clearReports, sessions, session, switchSession, renameSession, deleteSession, resetAll } = useApp();
  const [menu, setMenu] = useState(false);
  const [chip, setChip] = useState(false);
  const [rowMenu, setRowMenu] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const menuRef = useDismiss(menu, () => setMenu(false));
  const chipRef = useDismiss(chip, () => setChip(false));
  const rowRef = useDismiss(rowMenu !== null, () => { setRowMenu(null); setConfirmDel(null); });
  // `filters` changes identity when the active session or its data changes, which must refresh this.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const all = useMemo(() => summarize(DEFAULT_FILTERS), [filters]);
  const groups = [...new Set(sessions.map(groupLabel))];

  const pick = (id: string) => { switchSession(id); setChip(false); setRowMenu(null); if (path === "/import") router.push("/overview"); };
  const startRename = (s: Session) => { setRenaming(s.id); setDraft(s.name); setRowMenu(null); };

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-ink2 px-3 py-4 text-slate-300 md:flex">
        <Link href="/overview" className="flex items-center gap-3 px-3 pb-4 pt-1">
          <Mark /><span className="font-display text-xl font-semibold text-white">InsightFlow</span>
        </Link>
        <button onClick={() => openImport("new")} className="mb-4 flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 py-2.5 text-sm font-medium text-white transition hover:bg-white/15 active:scale-[0.98]">
          <Plus size={16} /> New session
        </button>
        <nav className="space-y-0.5">
          {NAV.map(({ href, label, icon: Icon }) => {
            const on = path.startsWith(href);
            return (
              <Link key={href} href={href} aria-current={on ? "page" : undefined}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${on ? "bg-white/10 text-white" : "hover:bg-white/5 hover:text-white"}`}>
                <Icon size={17} className={on ? "text-indigo-300" : ""} />{label}
                {href === "/tracker" && tracked.length > 0 && <span className="ml-auto rounded-full bg-indigo-500 px-1.5 text-[11px] font-semibold text-white">{tracked.length}</span>}
              </Link>
            );
          })}
        </nav>

        <div ref={rowRef} className="mt-4 flex min-h-0 flex-1 flex-col border-t border-white/10 pt-3">
          <p className="px-3 pb-1 text-xs font-medium text-slate-400">Sessions</p>
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1" role="list" aria-label="Sessions">
            {groups.map((g) => (
              <div key={g}>
                <p className="px-3 pb-1 text-[11px] text-slate-500">{g}</p>
                {sessions.filter((s) => groupLabel(s) === g).map((s) => {
                  const on = s.id === session.id;
                  return (
                    <div key={s.id} role="listitem" className={`group relative flex items-center rounded-lg ${on ? "bg-white/15" : "hover:bg-white/5"}`}>
                      {renaming === s.id ? (
                        <input autoFocus aria-label="Session name" value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={() => { renameSession(s.id, draft); setRenaming(null); }}
                          onKeyDown={(e) => { if (e.key === "Enter") { renameSession(s.id, draft); setRenaming(null); } if (e.key === "Escape") setRenaming(null); }}
                          className="m-1 w-full rounded-md bg-white/10 px-2 py-1.5 text-sm text-white outline-none ring-1 ring-indigo-300" />
                      ) : (
                        <button onClick={() => pick(s.id)} aria-current={on ? "true" : undefined} className="flex min-w-0 flex-1 items-center gap-2.5 px-3 py-2 text-left">
                          {s.kind === "sample" ? <Database size={15} className="shrink-0 text-indigo-300" /> : <FileText size={15} className="shrink-0 text-slate-400" />}
                          <span className="min-w-0 flex-1"><span className={`block truncate text-sm ${on ? "font-medium text-white" : ""}`}>{s.name}</span>
                            <span className="block text-[11px] text-slate-400">{fmt(sessionCount(s))} reviews</span></span>
                        </button>
                      )}
                      {s.kind === "import" && renaming !== s.id && (
                        <>
                          <button aria-label={`Options for ${s.name}`} aria-haspopup="menu" onClick={() => { setRowMenu(rowMenu === s.id ? null : s.id); setConfirmDel(null); }}
                            className={`mr-1 grid size-7 shrink-0 place-items-center rounded-md text-slate-400 hover:bg-white/10 hover:text-white ${rowMenu === s.id ? "bg-white/10" : "opacity-0 focus:opacity-100 group-hover:opacity-100"}`}><MoreHorizontal size={16} /></button>
                          {rowMenu === s.id && (
                            <div role="menu" className="absolute right-1 top-9 z-30 w-44 rounded-lg border border-white/10 bg-slate-900 p-1 text-sm shadow-xl">
                              <button role="menuitem" onClick={() => startRename(s)} className="w-full rounded-md px-3 py-1.5 text-left text-slate-200 hover:bg-white/10">Rename</button>
                              <button role="menuitem" onClick={() => { if (confirmDel === s.id) { deleteSession(s.id); setRowMenu(null); setConfirmDel(null); } else setConfirmDel(s.id); }} className="w-full rounded-md px-3 py-1.5 text-left text-rose-300 hover:bg-white/10">{confirmDel === s.id ? "Click again to delete" : "Delete session"}</button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        <p className="mt-3 px-3 text-[11px] leading-relaxed text-slate-500">Sessions are saved in this browser only.</p>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col pb-16 md:pb-0">
        <header className="no-print sticky top-0 z-10 flex items-center gap-3 border-b border-line bg-background/90 px-4 py-3 backdrop-blur md:px-8">
          <label className="relative w-full min-w-0 max-w-md">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <input value={filters.q} onChange={(e) => setFilters({ q: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && path !== "/feedback" && router.push("/feedback")}
              placeholder="Search feedback or issues…" aria-label="Search feedback"
              className="w-full min-w-0 rounded-lg border border-line bg-white py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/10" />
          </label>
          <div className="ml-auto flex shrink-0 items-center gap-2 md:gap-3">
            <div ref={chipRef} className="relative">
              <button onClick={() => setChip((v) => !v)} aria-haspopup="menu" aria-expanded={chip} aria-label="Switch session" className="flex max-w-[8.5rem] items-center gap-2 rounded-full border border-line bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 sm:max-w-[16rem]">
                <Database size={14} className="shrink-0 text-brand" /><span className="truncate">{session.name} · {fmt(all.total)}</span><ChevronDown size={14} className="shrink-0 text-muted" />
              </button>
              {chip && (
                <div role="menu" className="absolute right-0 top-12 z-30 w-72 rounded-xl border border-line bg-white p-2 text-sm shadow-lg">
                  <p className="px-3 py-2 text-xs text-muted">Switch session</p>
                  {sessions.map((s) => (
                    <button key={s.id} role="menuitem" onClick={() => pick(s.id)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-slate-50">
                      <span className="min-w-0 flex-1"><span className="block truncate font-medium">{s.name}</span><span className="block text-xs text-muted">{fmt(sessionCount(s))} reviews</span></span>
                      {s.id === session.id && <Check size={16} className="text-brand" />}
                    </button>
                  ))}
                  <div className="my-1 border-t border-line" />
                  <button role="menuitem" onClick={() => { setChip(false); openImport("new"); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left font-medium text-brand hover:bg-brand-soft"><Plus size={15} />New session</button>
                </div>
              )}
            </div>
            <Link href="/tracker" aria-label={`${tracked.length} tracked issues`} className="relative hidden size-10 place-items-center sm:grid rounded-lg border border-line bg-white text-slate-600 hover:bg-slate-50">
              <ListChecks size={18} />
              {tracked.length > 0 && <span className="absolute -right-1.5 -top-1.5 grid min-w-5 place-items-center rounded-full bg-brand px-1 text-[11px] font-semibold text-white">{tracked.length}</span>}
            </Link>
            <Link href="/reports" className="hidden items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800 sm:flex"><FilePlus2 size={16} />Create report</Link>
            <div ref={menuRef} className="relative">
              <button onClick={() => setMenu((v) => !v)} aria-label="My data" aria-haspopup="menu" aria-expanded={menu} className="grid size-10 place-items-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-200">AK</button>
              {menu && (
                <div role="menu" className="absolute right-0 top-12 z-30 w-72 rounded-xl border border-line bg-white p-2 text-sm shadow-lg">
                  <p className="px-3 py-2 text-xs text-muted">Applies to this session. Everything is saved in this browser only.</p>
                  <button role="menuitem" disabled={!user.length} onClick={() => { clearUser(); setMenu(false); }} className="flex w-full justify-between rounded-lg px-3 py-2 text-left hover:bg-slate-50 disabled:text-slate-400 disabled:hover:bg-transparent">Remove reviews I added<span className="tabular-nums">{user.length}</span></button>
                  <button role="menuitem" disabled={!tracked.length} onClick={() => { clearTracked(); setMenu(false); }} className="flex w-full justify-between rounded-lg px-3 py-2 text-left hover:bg-slate-50 disabled:text-slate-400 disabled:hover:bg-transparent">Clear tracked issues<span className="tabular-nums">{tracked.length}</span></button>
                  <button role="menuitem" disabled={!reports.length} onClick={() => { clearReports(); setMenu(false); }} className="flex w-full justify-between rounded-lg px-3 py-2 text-left hover:bg-slate-50 disabled:text-slate-400 disabled:hover:bg-transparent">Delete saved reports<span className="tabular-nums">{reports.length}</span></button>
                  <div className="my-1 border-t border-line" />
                  <button role="menuitem" onClick={() => { resetAll(); setMenu(false); }} className="w-full rounded-lg px-3 py-2 text-left font-medium text-rose-600 hover:bg-rose-50">Reset everything (all sessions)</button>
                </div>
              )}
            </div>
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
