"use client";

import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { MarketBar } from "@/lib/types";

export function PerformancePanel({ bars }: { bars: MarketBar[] }) {
  const data = buildEquityCurve(bars);
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="equity" x1="0" x2="0" y1="0" y2="1">
            <stop offset="5%" stopColor="#3ddbd9" stopOpacity={0.45} />
            <stop offset="95%" stopColor="#3ddbd9" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="day" stroke="#6f8b92" fontSize={12} />
        <YAxis stroke="#6f8b92" fontSize={12} domain={["dataMin - 2000", "dataMax + 2000"]} />
        <Tooltip contentStyle={{ background: "#0d1820", border: "1px solid rgba(132,170,180,.18)" }} />
        <Area type="monotone" dataKey="equity" stroke="#3ddbd9" fill="url(#equity)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function performanceStats(bars: MarketBar[]) {
  const returns = bars.slice(1).map((bar, index) => bar.close / bars[index].close - 1).filter(Number.isFinite);
  const mean = average(returns);
  const sigma = stddev(returns);
  const sharpe = sigma > 0 ? (mean / sigma) * Math.sqrt(252) : 0;
  const equity = buildEquityCurve(bars).map((point) => point.equity);
  const maxDrawdown = equity.reduce(
    (state, value) => {
      const peak = Math.max(state.peak, value);
      return { peak, drawdown: Math.min(state.drawdown, value / peak - 1) };
    },
    { peak: equity[0] ?? 100000, drawdown: 0 }
  ).drawdown;
  const winRate = returns.length ? returns.filter((item) => item > 0).length / returns.length : 0;
  return { sharpe, maxDrawdown, winRate };
}

function buildEquityCurve(bars: MarketBar[]) {
  const usable = bars.length > 2 ? bars.slice(-90) : [];
  if (usable.length === 0) return [{ day: 1, equity: 100000 }];
  const start = usable[0].close;
  return usable.map((bar, index) => ({ day: index + 1, equity: 100000 * (bar.close / start) }));
}

function average(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
}

function stddev(values: number[]) {
  const mean = average(values);
  return Math.sqrt(average(values.map((value) => (value - mean) ** 2)));
}
