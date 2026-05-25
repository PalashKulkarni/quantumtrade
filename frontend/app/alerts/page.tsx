"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle, ArrowLeft, Bell, BellOff, CheckCircle2,
  Loader2, Plus, Trash2, TrendingDown, TrendingUp, Zap, RefreshCw
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { API_BASE } from "@/lib/config";
import { stockUniverse } from "@/lib/markets";

interface Alert {
  id: number; symbol: string; condition: "above" | "below" | "signal_change";
  target_price: number | null; is_active: boolean; triggered_at: string | null; created_at: string;
}
interface TriggeredAlert { id: number; symbol: string; condition: string; target_price: number; current_price: number; }

function conditionLabel(a: Alert) {
  if (a.condition === "above") return `Price ≥ $${a.target_price?.toLocaleString()}`;
  if (a.condition === "below") return `Price ≤ $${a.target_price?.toLocaleString()}`;
  return "Signal change";
}

function conditionIcon(condition: string) {
  if (condition === "above") return <TrendingUp size={13} className="text-emerald-400" />;
  if (condition === "below") return <TrendingDown size={13} className="text-red-400" />;
  return <Zap size={13} className="text-amber-400" />;
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [triggered, setTriggered] = useState<TriggeredAlert[]>([]);
  const [symbol, setSymbol] = useState("RELIANCE.NS");
  const [condition, setCondition] = useState<"above" | "below">("above");
  const [targetPrice, setTargetPrice] = useState("");
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/alerts`);
      if (res.ok) setAlerts(await res.json());
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAlerts(); }, []);

  async function createAlert(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!targetPrice || isNaN(+targetPrice)) { setFormError("Enter a valid price"); return; }
    setCreating(true);
    try {
      const res = await fetch(`${API_BASE}/api/alerts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol, condition, target_price: +targetPrice }),
      });
      if (!res.ok) throw new Error((await res.json()).detail);

      const newAlert = await res.clone().json();
      setAlerts(prev => [newAlert, ...prev]);

      setTargetPrice("");
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Failed to create");
    } finally { setCreating(false); }
  }

  async function deleteAlert(id: number) {
    await fetch(`${API_BASE}/api/alerts/${id}`, { method: "DELETE" });
    setAlerts(prev => prev.filter(a => a.id !== id));
  }

  async function checkNow() {
    setChecking(true);
    try {
      const res = await fetch(`${API_BASE}/api/alerts/check`, { method: "POST" });
      const data = await res.json();
      if (data.triggered?.length > 0) { setTriggered(data.triggered); await fetchAlerts(); }
    } finally { setChecking(false); }
  }

  const active = alerts.filter(a => a.is_active);
  const done = alerts.filter(a => !a.is_active);

  return (
    <div className="min-h-screen subtle-grid">
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute right-1/4 top-0 h-[500px] w-[500px] rounded-full bg-amber-500/4 blur-[140px]" />
      </div>
      <div className="relative z-10 mx-auto max-w-4xl px-4 py-6">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-slate-400 transition hover:border-slate-500 hover:text-slate-200">
              <ArrowLeft size={16} />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <Bell size={18} className="text-amber-400" />
                <h1 className="text-lg font-semibold text-slate-100">Price Alerts</h1>
              </div>
              <p className="mt-0.5 text-xs text-slate-500">Get notified when prices hit your targets</p>
            </div>
          </div>
          <button onClick={checkNow} disabled={checking}
            className="flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-xs text-slate-400 transition hover:border-amber-500/30 hover:text-amber-400 disabled:opacity-50">
            {checking ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />} Check now
          </button>
        </div>

        <AnimatePresence>
          {triggered.map(t => (
            <motion.div key={t.id} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mb-4 flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
              <CheckCircle2 size={16} className="flex-shrink-0 text-emerald-400" />
              <div className="flex-1 text-sm text-emerald-300">
                <strong>{t.symbol}</strong> triggered — price is <strong>${t.current_price.toFixed(2)}</strong>
                {t.condition === "above" ? " ≥ " : " ≤ "}<strong>${t.target_price.toFixed(2)}</strong>
              </div>
              <button onClick={() => setTriggered(prev => prev.filter(x => x.id !== t.id))} className="text-emerald-600 hover:text-emerald-400">×</button>
            </motion.div>
          ))}
        </AnimatePresence>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[340px_1fr]">
          {/* Create form */}
          <div className="rounded-xl border border-line bg-black/30 p-4">
            <p className="mb-4 font-mono text-[10px] uppercase tracking-widest text-slate-500">New Alert</p>
            <form onSubmit={createAlert} className="space-y-3">
              <div>
                <label className="mb-1.5 block text-xs text-slate-400">Symbol</label>
                <select value={symbol} onChange={e => setSymbol(e.target.value)}
                  className="h-9 w-full rounded-lg border border-line bg-black/40 px-3 text-sm text-slate-200 outline-none focus:border-amber-500/40">
                  {stockUniverse.map(s => <option key={s.symbol} value={s.symbol}>{s.symbol} — {s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs text-slate-400">Condition</label>
                <div className="grid grid-cols-2 gap-1">
                  {(["above", "below"] as const).map(c => (
                    <button key={c} type="button" onClick={() => setCondition(c)}
                      className={`flex items-center justify-center gap-2 rounded-lg border py-2 text-xs transition ${condition === c ? c === "above" ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400" : "border-red-500/40 bg-red-500/10 text-red-400" : "border-line bg-white/[0.02] text-slate-400 hover:border-slate-600"}`}>
                      {c === "above" ? <TrendingUp size={13} /> : <TrendingDown size={13} />} Price {c}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs text-slate-400">Target Price</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">$</span>
                  <input type="number" min="0" step="0.01" value={targetPrice} onChange={e => setTargetPrice(e.target.value)} placeholder="0.00"
                    className="h-9 w-full rounded-lg border border-line bg-black/40 pl-7 pr-3 text-sm text-slate-200 outline-none focus:border-amber-500/40" />
                </div>
              </div>
              {formError && (
                <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                  <AlertTriangle size={12} /> {formError}
                </div>
              )}
              <button type="submit" disabled={creating}
                className="flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 text-sm font-medium text-amber-400 transition hover:bg-amber-500/20 disabled:opacity-50">
                {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Create Alert
              </button>
            </form>
            <div className="mt-4 rounded-lg border border-line bg-black/20 p-3 text-xs text-slate-500">
              <p className="mb-2 font-medium text-slate-400">How alerts work</p>
              <ul className="space-y-1">
                <li>• Checked against latest daily close</li>
                <li>• Click "Check now" to evaluate immediately</li>
                <li>• Triggered alerts are marked and deactivated</li>
              </ul>
            </div>
          </div>

          {/* Alert list */}
          <div className="space-y-4">
            {loading ? (
              <div className="flex h-40 items-center justify-center"><Loader2 size={20} className="animate-spin text-slate-600" /></div>
            ) : (
              <>
                <div>
                  <div className="mb-3 flex items-center gap-2">
                    <Bell size={13} className="text-amber-400" />
                    <span className="text-xs font-medium text-slate-300">Active ({active.length})</span>
                  </div>
                  {active.length === 0 ? (
                    <div className="flex h-24 flex-col items-center justify-center rounded-xl border border-dashed border-line text-center">
                      <BellOff size={18} className="mb-2 text-slate-600" />
                      <p className="text-xs text-slate-600">No active alerts</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <AnimatePresence>
                        {active.map(alert => (
                          <motion.div key={alert.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }}
                            className="flex items-center gap-3 rounded-xl border border-line bg-black/25 px-4 py-3">
                            {conditionIcon(alert.condition)}
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-semibold text-slate-200">{alert.symbol}</span>
                                <span className="text-xs text-slate-400">{conditionLabel(alert)}</span>
                              </div>
                              <div className="mt-0.5 font-mono text-[10px] text-slate-600">Set {new Date(alert.created_at).toLocaleDateString()}</div>
                            </div>
                            <div className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />
                            <button onClick={() => deleteAlert(alert.id)} className="ml-2 rounded-md p-1.5 text-slate-600 transition hover:text-red-400"><Trash2 size={13} /></button>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  )}
                </div>
                {done.length > 0 && (
                  <div>
                    <div className="mb-3 flex items-center gap-2">
                      <CheckCircle2 size={13} className="text-slate-600" />
                      <span className="text-xs font-medium text-slate-500">Triggered ({done.length})</span>
                    </div>
                    <div className="space-y-2">
                      {done.map(alert => (
                        <div key={alert.id} className="flex items-center gap-3 rounded-xl border border-line/50 bg-white/[0.01] px-4 py-3 opacity-50">
                          <CheckCircle2 size={13} className="text-slate-600" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs text-slate-400">{alert.symbol}</span>
                              <span className="text-xs text-slate-500">{conditionLabel(alert)}</span>
                            </div>
                            {alert.triggered_at && <div className="mt-0.5 font-mono text-[10px] text-slate-600">Triggered {new Date(alert.triggered_at).toLocaleDateString()}</div>}
                          </div>
                          <button onClick={() => deleteAlert(alert.id)} className="text-slate-700 hover:text-red-400"><Trash2 size={13} /></button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
