"use client";

import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import { portfolioFactors, stressScenarios } from "@/lib/terminal-data";

export function PortfolioRiskSuite({
  factors = portfolioFactors,
  stress = stressScenarios
}: {
  factors?: { factor: string; exposure: number }[];
  stress?: { scenario: string; pnl: number; var: number }[];
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-lg border border-line bg-black/25 p-3">
        <div className="text-sm font-semibold text-slate-100">Factor Exposure</div>
        <ResponsiveContainer width="100%" height={220}>
          <RadarChart data={factors}>
            <PolarGrid stroke="rgba(255,255,255,.1)" />
            <PolarAngleAxis dataKey="factor" tick={{ fill: "#8aa2aa", fontSize: 11 }} />
            <Radar dataKey="exposure" stroke="#3ddbd9" fill="#3ddbd9" fillOpacity={0.22} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <div className="rounded-lg border border-line bg-black/25 p-3">
        <div className="text-sm font-semibold text-slate-100">Scenario Stress Testing</div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={stress}>
            <XAxis dataKey="scenario" stroke="#6f8b92" fontSize={10} />
            <YAxis stroke="#6f8b92" fontSize={10} />
            <Tooltip contentStyle={{ background: "#0d1820", border: "1px solid rgba(132,170,180,.18)" }} />
            <Bar dataKey="pnl" fill="#ff647c" radius={[4, 4, 0, 0]} />
            <Bar dataKey="var" fill="#f4c430" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
