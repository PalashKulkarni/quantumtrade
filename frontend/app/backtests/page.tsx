"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell
} from "recharts";
import {
  Activity, ArrowLeft, FlaskConical, Loader2,
  TrendingDown, TrendingUp, Zap, BarChart2, AlertTriangle,
  Trophy, Target, ChevronDown
} from "lucide-react";
import Link from "next/link";
import { useState, useCallback } from "react";
import { API_BASE } from "@/lib/config";
import { useDashboardStore } from "@/store/use-dashboard-store";
import { stockUniverse } from "@/lib/markets";

interface EquityPoint { timestamp: string; equity: number; }
interface Trade { timestamp: string; side: "BUY" | "SELL"; quantity: number; price: number; fee: number; }
interface BacktestMetrics {
  cumulative_return: number; cagr: number; sharpe_ratio: number; sortino_ratio: number;
  max_drawdown: number; alpha: number; beta: number; volatility: number;
  win_rate: number; profit_factor: number;
}
interface BacktestResult { metrics: BacktestMetrics; equity_curve: EquityPoint[]; trades: Trade[]; }

function pct(v: number) { return `${v >= 0 ? "+" : ""}${(v * 100).toFixed(2)}%`; }
function fmt2(v: number) { return v.toFixed(2); }

function buildMonthlyReturns(curve: EquityPoint[]) {
  const byMonth: Record<string, number[]> = {};
  for (let i = 1; i < curve.length; i++) {
    const d = new Date(curve[i].timestamp);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const r = (curve[i].equity - curve[i - 1].equity) / curve[i - 1].equity;
    if (!byMonth[key]) byMonth[key] = [];
    byMonth[key].push(r);
  }
  return Object.entries(byMonth).map(([month, rets]) => ({
    month,
    label: new Date(month + "-01").toLocaleDateString("en", { month: "short", year: "2-digit" }),
    ret: rets.reduce((a, b) => (1 + a) * (1 + b) - 1, 0),
  })).slice(-24);
}

function buildDrawdown(curve: EquityPoint[]) {
  let peak = curve[0]?.equity ?? 1;
  return curve.map((p) => {
    peak = Math.max(peak, p.equity);
    return { timestamp: p.timestamp, dd: ((p.equity - peak) / peak) * 100 };
  });
}

function MetricCard({ label, value, sub, positive, icon }: {
  label: string; value: string; sub?: string; positive?: boolean; icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-line bg-black/25 p-4">
      <div className="mb-2 flex items-center gap-2 text-xs text-slate-500">{icon}{label}</div>
      <div className={`text-xl font-semibold ${positive === undefined ? "text-slate-100" : positive ? "text-emerald-400" : "text-red-400"}`}>{value}</div>
      {sub && <div className="mt-0.5 text-[11px] text-slate-500">{sub}</div>}
    </div>
  );
}

function TradeRow({ trade, index }: { trade: Trade; index: number }) {
  const isBuy = trade.side === "BUY";
  const d = new Date(trade.timestamp);
  return (
    <motion.tr initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.02 }}
      className="border-b border-line/50 hover:bg-white/[0.02]">
      <td className="py-2 pl-3 font-mono text-[11px] text-slate-500">{d.toLocaleDateString("en", { day: "2-digit", month: "short", year: "2-digit" })}</td>
      <td className="py-2"><span className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold ${isBuy ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"}`}>{trade.side}</span></td>
      <td className="py-2 font-mono text-[11px] text-slate-300">{trade.quantity.toFixed(2)}</td>
      <td className="py-2 font-mono text-[11px] text-slate-300">${trade.price.toFixed(2)}</td>
      <td className="py-2 pr-3 font-mono text-[11px] text-slate-500">${trade.fee.toFixed(2)}</td>
    </motion.tr>
  );
}

export default function BacktestsPage() {
  const { symbol: dashSymbol } = useDashboardStore();

  const [symbol, setSymbol] = useState(dashSymbol || "RELIANCE.NS");
  const [timeframe, setTimeframe] = useState("1d");
  const [initialCash, setInitialCash] = useState(100000);
  const [commissionBps, setCommissionBps] = useState(2);
  const [slippageBps, setSlippageBps] = useState(1);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"equity" | "drawdown" | "monthly" | "trades">("equity");

  const run = useCallback(async () => {
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/backtests/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol, timeframe, initial_cash: initialCash, commission_bps: commissionBps, slippage_bps: slippageBps }),
      });
      if (!res.ok) throw new Error(`${res.status} — ${(await res.json()).detail}`);
      setResult(await res.json());
      setActiveTab("equity");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally { setLoading(false); }
  }, [symbol, timeframe, initialCash, commissionBps, slippageBps]);

  const m = result?.metrics;
  const monthlies = result ? buildMonthlyReturns(result.equity_curve) : [];
  const drawdowns = result ? buildDrawdown(result.equity_curve) : [];
  const buyTrades = result?.trades.filter(t => t.side === "BUY").length ?? 0;
  const sellTrades = result?.trades.filter(t => t.side === "SELL").length ?? 0;
  const equityMin = result ? Math.min(...result.equity_curve.map(p => p.equity)) : 0;
  const equityMax = result ? Math.max(...result.equity_curve.map(p => p.equity)) : 0;

  return (
    <div className="min-h-screen subtle-grid">
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute left-1/3 top-0 h-[500px] w-[600px] -translate-x-1/2 rounded-full bg-cyan/4 blur-[140px]" />
      </div>
      <div className="relative z-10 mx-auto max-w-7xl px-4 py-6">
        <div className="mb-6 flex items-center gap-4">
          <Link href="/" className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-slate-400 transition hover:border-slate-500 hover:text-slate-200">
            <ArrowLeft size={16} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <FlaskConical size={18} className="text-cyan" />
              <h1 className="text-lg font-semibold text-slate-100">Strategy Backtester</h1>
              <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 font-mono text-[9px] text-violet-400">QUANTTRADE ENGINE</span>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">Simulate the AI meta-agent against real historical data</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[320px_1fr]">
          {/* Config */}
          <div className="space-y-4">
            <div className="rounded-xl border border-line bg-black/30 p-4">
              <p className="mb-4 font-mono text-[10px] uppercase tracking-widest text-slate-500">Configuration</p>
              <div className="space-y-3">
                <div>
                  <label className="mb-1.5 block text-xs text-slate-400">Symbol</label>
                  <div className="relative">
                    <select value={symbol} onChange={e => setSymbol(e.target.value)}
                      className="h-9 w-full appearance-none rounded-lg border border-line bg-black/40 px-3 pr-8 text-sm text-slate-200 outline-none focus:border-cyan/40">
                      {stockUniverse.map(s => <option key={s.symbol} value={s.symbol}>{s.symbol} — {s.name}</option>)}
                    </select>
                    <ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs text-slate-400">Timeframe</label>
                  <div className="grid grid-cols-4 gap-1">
                    {["1d", "1h", "15m", "5m"].map(tf => (
                      <button key={tf} onClick={() => setTimeframe(tf)}
                        className={`rounded-md border py-1.5 text-xs font-mono transition ${timeframe === tf ? "border-cyan/40 bg-cyan/10 text-cyan" : "border-line bg-white/[0.02] text-slate-400 hover:border-slate-600"}`}>
                        {tf}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs text-slate-400">Initial Capital — <span className="text-slate-200">${initialCash.toLocaleString()}</span></label>
                  <input type="range" min={10000} max={1000000} step={10000} value={initialCash} onChange={e => setInitialCash(+e.target.value)} className="w-full accent-cyan" />
                  <div className="mt-1 flex justify-between font-mono text-[10px] text-slate-600"><span>$10K</span><span>$1M</span></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[["Commission (bps)", commissionBps, setCommissionBps], ["Slippage (bps)", slippageBps, setSlippageBps]].map(([label, val, setter]) => (
                    <div key={label as string}>
                      <label className="mb-1.5 block text-xs text-slate-400">{label as string}</label>
                      <input type="number" min={0} max={50} value={val as number} onChange={e => (setter as (v: number) => void)(+e.target.value)}
                        className="h-9 w-full rounded-lg border border-line bg-black/40 px-3 text-sm text-slate-200 outline-none focus:border-cyan/40" />
                    </div>
                  ))}
                </div>
              </div>
              <button onClick={run} disabled={loading}
                className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-cyan/30 bg-cyan/10 text-sm font-medium text-cyan transition hover:bg-cyan/20 disabled:opacity-50">
                {loading ? <><Loader2 size={15} className="animate-spin" />Running…</> : <><Zap size={15} />Run Backtest</>}
              </button>
              {error && (
                <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400">
                  <AlertTriangle size={13} className="mt-0.5 flex-shrink-0" />{error}
                </div>
              )}
            </div>
            <div className="rounded-xl border border-line bg-black/20 p-4">
              <p className="mb-3 font-mono text-[10px] uppercase tracking-widest text-slate-500">How it works</p>
              <ul className="space-y-2 text-xs text-slate-500">
                {[["🤖", "AI meta-agent makes decisions at each bar"], ["📊", "80 bars warmup before trading begins"], ["💱", "Commission + slippage on every fill"], ["📈", "Up to 500 historical bars simulated"]].map(([icon, text]) => (
                  <li key={text as string} className="flex gap-2"><span>{icon}</span><span>{text}</span></li>
                ))}
              </ul>
            </div>
          </div>

          {/* Results */}
          <div className="space-y-4">
            {!result && !loading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="flex h-64 flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-line text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-line bg-white/[0.02]">
                  <BarChart2 size={24} className="text-slate-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-400">No results yet</p>
                  <p className="mt-1 text-xs text-slate-600">Configure and run a backtest</p>
                </div>
              </motion.div>
            )}

            {loading && (
              <div className="flex h-64 flex-col items-center justify-center gap-4 rounded-xl border border-line bg-black/20">
                <div className="relative">
                  <div className="h-12 w-12 rounded-full border border-cyan/20" />
                  <div className="absolute inset-0 h-12 w-12 animate-spin rounded-full border-t border-cyan" />
                </div>
                <p className="text-sm text-slate-300">Simulating strategy on {symbol}…</p>
              </div>
            )}

            <AnimatePresence>
              {result && m && (
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
                    <MetricCard label="Total Return" value={pct(m.cumulative_return)} positive={m.cumulative_return >= 0} icon={<TrendingUp size={12} />} sub="vs buy-and-hold" />
                    <MetricCard label="CAGR" value={pct(m.cagr)} positive={m.cagr >= 0} icon={<Activity size={12} />} sub="annualised" />
                    <MetricCard label="Sharpe Ratio" value={fmt2(m.sharpe_ratio)} positive={m.sharpe_ratio >= 1} icon={<Target size={12} />} sub="risk-adjusted" />
                    <MetricCard label="Max Drawdown" value={pct(m.max_drawdown)} positive={false} icon={<TrendingDown size={12} />} sub="peak to trough" />
                    <MetricCard label="Win Rate" value={`${(m.win_rate * 100).toFixed(1)}%`} positive={m.win_rate >= 0.5} icon={<Trophy size={12} />} sub={`${buyTrades} trades`} />
                  </div>

                  <div className="flex flex-wrap gap-4 rounded-xl border border-line bg-black/20 px-4 py-3">
                    {[["Sortino", fmt2(m.sortino_ratio)], ["Volatility", pct(m.volatility)], ["Beta", fmt2(m.beta)], ["Alpha", pct(m.alpha)], ["Profit Factor", fmt2(m.profit_factor)], ["Total Trades", String(result.trades.length)]].map(([label, val]) => (
                      <div key={label}>
                        <div className="text-[10px] text-slate-500">{label}</div>
                        <div className="font-mono text-xs text-slate-200">{val}</div>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-1 rounded-xl border border-line bg-black/20 p-1">
                    {(["equity", "drawdown", "monthly", "trades"] as const).map(tab => (
                      <button key={tab} onClick={() => setActiveTab(tab)}
                        className={`flex-1 rounded-lg py-1.5 text-xs font-medium transition capitalize ${activeTab === tab ? "bg-white/[0.07] text-slate-100" : "text-slate-500 hover:text-slate-300"}`}>
                        {tab === "equity" ? "Equity Curve" : tab === "drawdown" ? "Drawdown" : tab === "monthly" ? "Monthly Returns" : "Trade Log"}
                      </button>
                    ))}
                  </div>

                  <AnimatePresence mode="wait">
                    <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="rounded-xl border border-line bg-black/25 p-4">
                      {activeTab === "equity" && (
                        <>
                          <div className="mb-3 flex items-center justify-between">
                            <p className="text-xs text-slate-400">Portfolio Equity</p>
                            <span className="font-mono text-sm font-semibold text-slate-100">End ${result.equity_curve.at(-1)?.equity.toLocaleString("en", { maximumFractionDigits: 0 })}</span>
                          </div>
                          <ResponsiveContainer width="100%" height={320}>
                            <AreaChart data={result.equity_curve} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                              <defs>
                                <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#3ddbda" stopOpacity={0.25} />
                                  <stop offset="95%" stopColor="#3ddbda" stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <XAxis dataKey="timestamp" hide />
                              <YAxis domain={[equityMin * 0.98, equityMax * 1.02]} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} width={48} />
                              <Tooltip contentStyle={{ background: "#0d1820", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => [`$${v.toLocaleString("en", { maximumFractionDigits: 0 })}`, "Equity"]} labelFormatter={l => new Date(l).toLocaleDateString()} />
                              <ReferenceLine y={initialCash} stroke="rgba(255,255,255,0.12)" strokeDasharray="4 4" />
                              <Area type="monotone" dataKey="equity" stroke="#3ddbda" strokeWidth={1.5} fill="url(#eqGrad)" dot={false} activeDot={{ r: 3, fill: "#3ddbda" }} />
                            </AreaChart>
                          </ResponsiveContainer>
                        </>
                      )}

                      {activeTab === "drawdown" && (
                        <>
                          <div className="mb-3 flex items-center justify-between">
                            <p className="text-xs text-slate-400">Drawdown from Peak</p>
                            <span className="font-mono text-xs text-red-400">Max {pct(m.max_drawdown)}</span>
                          </div>
                          <ResponsiveContainer width="100%" height={320}>
                            <AreaChart data={drawdowns} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                              <defs>
                                <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#ff647c" stopOpacity={0.3} />
                                  <stop offset="95%" stopColor="#ff647c" stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <XAxis dataKey="timestamp" hide />
                              <YAxis tickFormatter={v => `${v.toFixed(1)}%`} tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} width={48} />
                              <Tooltip contentStyle={{ background: "#0d1820", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => [`${v.toFixed(2)}%`, "Drawdown"]} labelFormatter={l => new Date(l).toLocaleDateString()} />
                              <ReferenceLine y={0} stroke="rgba(255,255,255,0.12)" />
                              <Area type="monotone" dataKey="dd" stroke="#ff647c" strokeWidth={1.5} fill="url(#ddGrad)" dot={false} />
                            </AreaChart>
                          </ResponsiveContainer>
                        </>
                      )}

                      {activeTab === "monthly" && (
                        <>
                          <p className="mb-3 text-xs text-slate-400">Monthly Returns (last 24 months)</p>
                          <ResponsiveContainer width="100%" height={320}>
                            <BarChart data={monthlies} margin={{ top: 5, right: 5, left: 5, bottom: 20 }}>
                              <XAxis dataKey="label" tick={{ fill: "#64748b", fontSize: 9 }} angle={-45} textAnchor="end" interval={0} axisLine={false} tickLine={false} />
                              <YAxis tickFormatter={v => `${(v * 100).toFixed(0)}%`} tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} width={44} />
                              <Tooltip contentStyle={{ background: "#0d1820", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => [`${(v * 100).toFixed(2)}%`, "Return"]} />
                              <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" />
                              <Bar dataKey="ret" radius={[3, 3, 0, 0]}>
                                {monthlies.map((entry, i) => <Cell key={i} fill={entry.ret >= 0 ? "#59d38c" : "#ff647c"} opacity={0.85} />)}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </>
                      )}

                      {activeTab === "trades" && (
                        <>
                          <div className="mb-3 flex items-center justify-between">
                            <p className="text-xs text-slate-400">All Executions</p>
                            <div className="flex gap-3 font-mono text-[10px]">
                              <span className="text-emerald-400">{buyTrades} BUY</span>
                              <span className="text-red-400">{sellTrades} SELL</span>
                            </div>
                          </div>
                          <div className="max-h-72 overflow-y-auto">
                            <table className="w-full">
                              <thead>
                                <tr className="border-b border-line">
                                  {["Date", "Side", "Qty", "Price", "Fee"].map(h => (
                                    <th key={h} className="pb-2 text-left font-mono text-[10px] uppercase tracking-wider text-slate-500 first:pl-3 last:pr-3">{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>{result.trades.map((t, i) => <TradeRow key={i} trade={t} index={i} />)}</tbody>
                            </table>
                          </div>
                        </>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
