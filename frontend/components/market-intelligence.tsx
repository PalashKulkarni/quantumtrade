import { heatmapCells, marketCommentary } from "@/lib/terminal-data";
import { Decision } from "@/lib/types";

export function MarketIntelligence({
  symbol,
  decision,
  commentary,
  heatmap
}: {
  symbol: string;
  decision?: Decision;
  commentary?: string;
  heatmap?: { label: string; value: number; size: number }[];
}) {
  const cells = heatmap ?? heatmapCells;
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-line bg-black/25 p-3">
        <div className="text-sm font-semibold text-slate-100">AI Market Commentary</div>
        <p className="mt-2 text-sm leading-6 text-slate-300">{commentary ?? marketCommentary(symbol, decision)}</p>
      </div>
      <div>
        <div className="mb-2 text-sm font-semibold text-slate-100">Market Heatmap</div>
        <div className="grid grid-cols-4 gap-2">
          {cells.map((cell) => (
            <div
              key={cell.label}
              className="rounded-md border border-line p-2"
              style={{
                minHeight: `${cell.size * 2.2}px`,
                background: cell.value >= 0 ? `rgba(89, 211, 140, ${0.08 + cell.value / 18})` : `rgba(255, 100, 124, ${0.08 + Math.abs(cell.value) / 18})`
              }}
            >
              <div className="text-xs font-semibold text-slate-100">{cell.label}</div>
              <div className={cell.value >= 0 ? "font-mono text-sm text-success" : "font-mono text-sm text-danger"}>
                {cell.value > 0 ? "+" : ""}{cell.value.toFixed(1)}%
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {["Unusual volume +2.1x", "Breadth 61% positive", "News impact +18", "Vol forecast 21.4%"].map((item) => (
          <div key={item} className="rounded-md border border-line bg-white/[0.03] p-2 font-mono text-xs text-slate-300">{item}</div>
        ))}
      </div>
    </div>
  );
}
