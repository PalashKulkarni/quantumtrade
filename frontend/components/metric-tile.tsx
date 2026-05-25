export function MetricTile({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "neutral" | "good" | "bad" }) {
  const color = tone === "good" ? "text-success" : tone === "bad" ? "text-danger" : "text-slate-100";
  return (
    <div className="rounded-md border border-line bg-white/[0.035] p-3">
      <div className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</div>
      <div className={`mt-2 text-xl font-semibold ${color}`}>{value}</div>
    </div>
  );
}

