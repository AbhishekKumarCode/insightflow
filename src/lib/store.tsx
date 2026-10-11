"use client";
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { DEFAULT_FILTERS, type Filters } from "./data";

export type TrackedStatus = "New" | "Investigating" | "In progress" | "Resolved";
export type Tracked = { issueId: string; status: TrackedStatus; owner: string; note: string; addedAt: string };
export type SavedReport = { id: string; title: string; createdAt: string; topIssueIds: string[] };

type Ctx = {
  filters: Filters; setFilters: (f: Partial<Filters>) => void; resetFilters: () => void;
  tracked: Tracked[]; track: (issueId: string) => void; untrack: (issueId: string) => void; updateTracked: (issueId: string, p: Partial<Tracked>) => void;
  reports: SavedReport[]; saveReport: (r: SavedReport) => void;
  ready: boolean;
};
const C = createContext<Ctx | null>(null);
export const useApp = () => useContext(C)!;

function usePersisted<T>(key: string, init: T) {
  const [v, setV] = useState<T>(init);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try { const s = localStorage.getItem(key); if (s) setV(JSON.parse(s)); } catch {}
    setReady(true);
  }, [key]);
  useEffect(() => { if (ready) localStorage.setItem(key, JSON.stringify(v)); }, [key, v, ready]);
  return [v, setV, ready] as const;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [filters, setF] = useState<Filters>(DEFAULT_FILTERS);
  const [tracked, setTracked, r1] = usePersisted<Tracked[]>("if.tracked", []);
  const [reports, setReports, r2] = usePersisted<SavedReport[]>("if.reports", []);
  const setFilters = useCallback((p: Partial<Filters>) => setF((f) => ({ ...f, ...p })), []);
  const resetFilters = useCallback(() => setF(DEFAULT_FILTERS), []);
  const track = (issueId: string) => setTracked((t) => t.some((x) => x.issueId === issueId) ? t : [...t, { issueId, status: "New", owner: "", note: "", addedAt: new Date().toISOString() }]);
  const untrack = (issueId: string) => setTracked((t) => t.filter((x) => x.issueId !== issueId));
  const updateTracked = (issueId: string, p: Partial<Tracked>) => setTracked((t) => t.map((x) => (x.issueId === issueId ? { ...x, ...p } : x)));
  const saveReport = (r: SavedReport) => setReports((l) => [r, ...l]);
  return <C.Provider value={{ filters, setFilters, resetFilters, tracked, track, untrack, updateTracked, reports, saveReport, ready: r1 && r2 }}>{children}</C.Provider>;
}
