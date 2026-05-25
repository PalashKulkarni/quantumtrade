"use client";

import { motion } from "framer-motion";
import { AlertTriangle, TrendingUp, Activity, BarChart3, ShieldCheck } from "lucide-react";
import { useDashboardStore } from "@/store/use-dashboard-store";
import { Card } from "./ui/card";
import { formatCurrency } from "@/lib/markets";

export function PortfolioIntelligence() {
  const { holdings, portfolioAnalytics: pa } = useDashboardStore();

  if (!pa || holdings.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center space-y-3 rounded-lg border border-line bg-black/20 p-8 text-center text-slate-400">
        <Activity size={32} className="opacity-50" />
        <p className="text-sm">Portfolio data is empty. Add holdings to activate intelligence engine.</p>
      </div>
    );
  }

  const sectors = Object.entries(pa.sector_exposure).sort((a, b) => b[1] - a[1]);
  const isHealthy = pa.health_score > 75;

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Top row: Health & Performance */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border border-line bg-black/30 p-4">
          <div className="text-xs font-semibold text-slate-400">Portfolio Health</div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={`text-3xl font-bold ${isHealthy ? "text-success" : "text-warning"}`}>
              {pa.health_score.toFixed(0)}
            </span>
            <span className="text-xs text-slate-500">/ 100</span>
          </div>
          <div className="mt-2 h-1.5 w-full rounded-full bg-slate-800">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pa.health_score}%` }}
              className={`h-full rounded-full ${isHealthy ? "bg-success" : "bg-warning"}`}
            />
          </div>
        </div>

        <div className="rounded-lg border border-line bg-black/30 p-4">
          <div className="text-xs font-semibold text-slate-400">Total Value</div>
          <div className="mt-2 text-2xl font-bold text-slate-100">{formatCurrency(pa.total_value, "USD")}</div>
          <div className={`mt-1 text-xs font-medium ${pa.unrealized_pnl >= 0 ? "text-success" : "text-danger"}`}>
            {pa.unrealized_pnl >= 0 ? "+" : ""}{formatCurrency(pa.unrealized_pnl, "USD")} ({pa.unrealized_pnl_percent.toFixed(2)}%)
          </div>
        </div>
      </div>

      {/* Middle row: Analytics Grid */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-md border border-line bg-black/20 p-3 text-center">
          <div className="text-[10px] uppercase text-slate-500">Portfolio Beta</div>
          <div className="mt-1 text-lg font-semibold text-slate-200">{pa.beta.toFixed(2)}</div>
        </div>
        <div className="rounded-md border border-line bg-black/20 p-3 text-center">
          <div className="text-[10px] uppercase text-slate-500">Sharpe Ratio</div>
          <div className="mt-1 text-lg font-semibold text-slate-200">{pa.sharpe_ratio.toFixed(2)}</div>
        </div>
        <div className="rounded-md border border-line bg-black/20 p-3 text-center">
          <div className="text-[10px] uppercase text-slate-500">Assets</div>
          <div className="mt-1 text-lg font-semibold text-slate-200">{holdings.length}</div>
        </div>
      </div>

      {/* Sector Exposure map */}
      <div className="flex-1 rounded-lg border border-line bg-black/30 p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-200">
          <BarChart3 size={16} />
          Sector Exposure Map
        </div>
        <div className="space-y-3">
          {sectors.map(([sector, pct], idx) => (
            <div key={idx}>
              <div className="mb-1 flex justify-between text-xs text-slate-400">
                <span>{sector}</span>
                <span>{pct.toFixed(1)}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.8, delay: idx * 0.1 }}
                  className="h-full bg-cyan/80"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AI Recommendations */}
      <div className="rounded-lg border border-cyan/20 bg-cyan/5 p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-cyan">
          <ShieldCheck size={16} />
          AI Copilot Recommendations
        </div>
        <ul className="space-y-2 text-sm text-slate-300">
          {pa.recommendations.map((rec, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-cyan">•</span>
              <span className="leading-snug">{rec}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
