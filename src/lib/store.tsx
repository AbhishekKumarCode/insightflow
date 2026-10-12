"use client";
import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { DEFAULT_FILTERS, setSessionData, type Filters, type IssueDef, type Review } from "./data";

export type TrackedStatus = "New" | "Investigating" | "In progress" | "Resolved";
export type Tracked = { issueId: string; status: TrackedStatus; owner: string; note: string; addedAt: string };
export type SavedReport = { id: string; title: string; createdAt: string; topIssueIds: string[]; items?: { name: string; score: number }[]; totals?: { reviews: number; negativePct: number }; scope?: string };

/** A session is one dataset with its own tracked issues and saved reports. The sample session also includes the 320 built-in reviews. */
export type Session = { id: string; name: string; createdAt: string; kind: "sample" | "import"; extra: Review[]; issues: IssueDef[]; tracked: Tracked[]; reports: SavedReport[]; source?: string };
export const SAMPLE_ID = "sample";
const EMPTY: Session = { id: "empty", name: "No data yet", createdAt: "", kind: "import", extra: [], issues: [], tracked: [], reports: [] };
const freshSample = (): Session => ({ id: SAMPLE_ID, name: "Sample dataset", createdAt: "", kind: "sample", extra: [], issues: [], tracked: [], reports: [] });

type Ctx = {
  filters: Filters; setFilters: (f: Partial<Filters>) => void; resetFilters: () => void;
  // Everything below is scoped to the active session.
  tracked: Tracked[]; track: (issueId: string) => void; untrack: (issueId: string) => void; updateTracked: (issueId: string, p: Partial<Tracked>) => void;
  reports: SavedReport[]; saveReport: (r: SavedReport) => void; deleteReport: (id: string) => void;
  clearTracked: () => void; clearReports: () => void;
  user: Review[]; addUser: (r: Review[], issues?: IssueDef[]) => void; clearUser: () => void;
  sessions: Session[]; session: Session; createSession: (name: string, reviews: Review[], issues?: IssueDef[]) => string;
  restoreSample: () => void; switchSession: (id: string) => void; renameSession: (id: string, name: string) => void; deleteSession: (id: string) => void; resetAll: () => void;
  storageFull: boolean;
  importOpen: boolean; setImportOpen: (v: boolean) => void; importDest: "new" | "this"; openImport: (dest?: "new" | "this") => void;
  ready: boolean;
};
const C = createContext<Ctx | null>(null);
export const useApp = () => useContext(C)!;

function readJSON<T>(key: string): T | null {
  try { const s = localStorage.getItem(key); return s ? (JSON.parse(s) as T) : null; } catch { return null; }
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [filtersRaw, setF] = useState<Filters>(DEFAULT_FILTERS);
  const [sessions, setSessions] = useState<Session[]>([freshSample()]);
  const [activeId, setActiveId] = useState(SAMPLE_ID);
  const [importOpen, setImportOpen] = useState(false);
  const [importDest, setImportDest] = useState<"new" | "this">("this");
  const openImport = (d: "new" | "this" = "this") => { setImportDest(d); setImportOpen(true); };
  const [ready, setReady] = useState(false);
  const [storageFull, setStorageFull] = useState(false);

  useEffect(() => {
    // Load after mount so server and first client render match (localStorage is client-only).
    let list = readJSON<Session[]>("if.sessions");
    if (!Array.isArray(list)) {
      // First run on this version: carry over anything saved by the single-dataset version into the sample session.
      list = [{ ...freshSample(), tracked: readJSON<Tracked[]>("if.tracked") ?? [], reports: readJSON<SavedReport[]>("if.reports") ?? [], extra: readJSON<Review[]>("if.user") ?? [] }];
    }
    list = list.map((s) => ({ ...s, issues: s.issues ?? [] }));
    const act = localStorage.getItem("if.active");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSessions(list);
    setActiveId(act && list.some((s) => s.id === act) ? act : (list[0]?.id ?? ""));
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    // Browsers allow about 5 MB per site. If it is full, say so instead of failing silently.
    try { localStorage.setItem("if.sessions", JSON.stringify(sessions)); localStorage.setItem("if.active", activeId); setStorageFull(false); } catch { setStorageFull(true); } // eslint-disable-line react-hooks/set-state-in-effect
  }, [sessions, activeId, ready]);

  // With every session removed there is an empty stand-in, so pages never see an undefined session.
  const session = sessions.find((s) => s.id === activeId) ?? sessions[0] ?? EMPTY;
  // Aggregates read the active session's data from module-level state, so set it during render and
  // give `filters` a new identity whenever it changes: every memo keyed on `filters` recomputes.
  setSessionData(session.kind === "sample", session.extra, session.issues);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const filters = useMemo(() => ({ ...filtersRaw }), [filtersRaw, session.id, session.extra, session.issues]);

  const patch = (fn: (s: Session) => Session) => setSessions((l) => l.map((s) => (s.id === session.id ? fn(s) : s)));
  const setFilters = useCallback((p: Partial<Filters>) => setF((f) => ({ ...f, ...p })), []);
  const resetFilters = useCallback(() => setF(DEFAULT_FILTERS), []);

  const addUser = (r: Review[], issues: IssueDef[] = []) => patch((s) => ({ ...s, extra: [...s.extra, ...r].slice(-3000), issues: [...s.issues, ...issues.filter((n) => !s.issues.some((o) => o.id === n.id))] }));
  const clearUser = () => patch((s) => ({ ...s, extra: [], issues: [] }));
  const track = (issueId: string) => patch((s) => s.tracked.some((x) => x.issueId === issueId) ? s : { ...s, tracked: [...s.tracked, { issueId, status: "New", owner: "", note: "", addedAt: new Date().toISOString() }] });
  const untrack = (issueId: string) => patch((s) => ({ ...s, tracked: s.tracked.filter((x) => x.issueId !== issueId) }));
  const updateTracked = (issueId: string, p: Partial<Tracked>) => patch((s) => ({ ...s, tracked: s.tracked.map((x) => (x.issueId === issueId ? { ...x, ...p } : x)) }));
  const saveReport = (r: SavedReport) => patch((s) => ({ ...s, reports: [r, ...s.reports] }));
  const deleteReport = (id: string) => patch((s) => ({ ...s, reports: s.reports.filter((x) => x.id !== id) }));
  const clearTracked = () => patch((s) => ({ ...s, tracked: [] }));
  const clearReports = () => patch((s) => ({ ...s, reports: [] }));

  const createSession = (name: string, reviews: Review[], issues: IssueDef[] = []) => {
    const id = `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
    const base = name.trim() || "New session";
    // Two imports of the same file get distinct names: "feb", "feb (2)", "feb (3)".
    setSessions((l) => {
      const taken = new Set(l.map((s) => s.name));
      let unique = base, n = 2;
      while (taken.has(unique)) unique = `${base} (${n++})`;
      return [...l, { id, name: unique, source: base, createdAt: new Date().toISOString(), kind: "import", extra: reviews.slice(-3000), issues, tracked: [], reports: [] }];
    });
    setActiveId(id); setF(DEFAULT_FILTERS);
    return id;
  };
  const switchSession = (id: string) => { setActiveId(id); setF(DEFAULT_FILTERS); };
  const renameSession = (id: string, name: string) => setSessions((l) => l.map((s) => (s.id === id && s.kind === "import" && name.trim() ? { ...s, name: name.trim() } : s)));
  const deleteSession = (id: string) => {
    const rest = sessions.filter((s) => s.id !== id);
    setSessions(rest);
    if (activeId === id) { setActiveId(rest[0]?.id ?? ""); setF(DEFAULT_FILTERS); }
  };
  // The sample is built into the app, so removing it from this browser loses nothing and it can come back any time.
  const restoreSample = () => { setSessions((l) => (l.some((s) => s.id === SAMPLE_ID) ? l : [freshSample(), ...l])); setActiveId(SAMPLE_ID); setF(DEFAULT_FILTERS); };
  const resetAll = () => { setSessions([freshSample()]); setActiveId(SAMPLE_ID); setF(DEFAULT_FILTERS); };

  return (
    <C.Provider value={{ filters, setFilters, resetFilters, tracked: session.tracked, track, untrack, updateTracked, reports: session.reports, saveReport, deleteReport, clearTracked, clearReports, user: session.extra, addUser, clearUser, sessions, session, createSession, restoreSample, switchSession, renameSession, deleteSession, resetAll, storageFull, importOpen, setImportOpen, importDest, openImport, ready }}>
      {children}
    </C.Provider>
  );
}
