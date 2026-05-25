"use client";

import { createChart, ColorType, IChartApi, CandlestickData, HistogramData, LineData, SeriesMarker, Time } from "lightweight-charts";
import { Maximize2, PenLine } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Timeframe, timeframes } from "@/lib/terminal-data";
import { MarketBar } from "@/lib/types";
import { cn } from "@/lib/utils";

export function MarketChart({
  bars,
  symbol,
  timeframe,
  onTimeframeChange
}: {
  bars: MarketBar[];
  symbol: string;
  timeframe: Timeframe;
  onTimeframeChange: (timeframe: Timeframe) => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const latest = bars.at(-1);
  const rsiSeries = useMemo(() => bars.slice(-80).map((bar, index) => ({ index, rsi: bar.rsi ?? 50 })), [bars]);
  const macdSeries = useMemo(() => bars.slice(-80).map((bar, index) => ({ index, macd: bar.macd ?? 0, signal: bar.macdSignal ?? 0 })), [bars]);

  useEffect(() => {
    if (!ref.current || bars.length === 0) return;
    const chart = createChart(ref.current, {
      height: fullscreen ? 620 : 430,
      layout: { background: { type: ColorType.Solid, color: "transparent" }, textColor: "#a8c7cf" },
      grid: { vertLines: { color: "rgba(255,255,255,0.04)" }, horzLines: { color: "rgba(255,255,255,0.04)" } },
      rightPriceScale: { borderColor: "rgba(255,255,255,0.08)" },
      crosshair: { mode: 1 },
      timeScale: { borderColor: "rgba(255,255,255,0.08)", timeVisible: true }
    });
    const candles = chart.addCandlestickSeries({
      upColor: "#59d38c",
      downColor: "#ff647c",
      borderVisible: false,
      wickUpColor: "#59d38c",
      wickDownColor: "#ff647c"
    });
    candles.setData(
      bars.map((bar) => ({
        time: bar.timestamp.slice(0, 10),
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close
      })) as CandlestickData[]
    );
    candles.setMarkers(buildMarkers(bars));

    const ema = chart.addLineSeries({ color: "#3ddbd9", lineWidth: 2, priceLineVisible: false, title: "EMA20" });
    ema.setData(lineData(bars, "ema20"));
    const sma = chart.addLineSeries({ color: "#f4c430", lineWidth: 1, priceLineVisible: false, title: "SMA50" });
    sma.setData(lineData(bars, "sma50"));
    const vwap = chart.addLineSeries({ color: "#9b8cff", lineWidth: 1, priceLineVisible: false, title: "VWAP" });
    vwap.setData(lineData(bars, "vwap"));
    chart.addLineSeries({ color: "rgba(255,255,255,.24)", lineWidth: 1, priceLineVisible: false, title: "BBU" }).setData(lineData(bars, "bbUpper"));
    chart.addLineSeries({ color: "rgba(255,255,255,.24)", lineWidth: 1, priceLineVisible: false, title: "BBL" }).setData(lineData(bars, "bbLower"));

    const volume = chart.addHistogramSeries({
      color: "rgba(61,219,217,.28)",
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
      priceLineVisible: false
    });
    chart.priceScale("volume").applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
    volume.setData(
      bars.map((bar) => ({
        time: bar.timestamp.slice(0, 10),
        value: bar.volume,
        color: bar.close >= bar.open ? "rgba(89,211,140,.35)" : "rgba(255,100,124,.35)"
      })) as HistogramData[]
    );
    chart.timeScale().fitContent();
    const resize = () => chart?.applyOptions({ width: ref.current?.clientWidth ?? 800 });
    resize();
    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      chart?.remove();
    };
  }, [bars, fullscreen]);

  return (
    <div className={cn("space-y-3", fullscreen && "fixed inset-4 z-50 rounded-xl border border-cyan/30 bg-[#061016] p-4 shadow-2xl")}>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="font-mono text-xs uppercase tracking-[0.24em] text-slate-500">Institutional Chart Stack</div>
          <div className="mt-1 flex items-center gap-3">
            <span className="font-mono text-xl font-semibold text-slate-50">{symbol}</span>
            <span className="rounded border border-success/30 bg-success/10 px-2 py-1 font-mono text-xs text-success">LIVE</span>
            {latest ? <span className="font-mono text-sm text-slate-400">O {latest.open.toFixed(2)} H {latest.high.toFixed(2)} L {latest.low.toFixed(2)} C {latest.close.toFixed(2)}</span> : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {timeframes.map((item) => (
            <button
              key={item}
              onClick={() => onTimeframeChange(item)}
              className={cn("h-8 rounded-md border border-line px-2.5 font-mono text-xs transition hover:border-cyan/60 hover:text-cyan", item === timeframe && "border-cyan/60 bg-cyan/10 text-cyan")}
            >
              {item}
            </button>
          ))}
          <button className="grid h-8 w-8 place-items-center rounded-md border border-line text-slate-400 transition hover:border-cyan/60 hover:text-cyan" aria-label="Drawing tools">
            <PenLine size={14} />
          </button>
          <button onClick={() => setFullscreen((value) => !value)} className="grid h-8 w-8 place-items-center rounded-md border border-line text-slate-400 transition hover:border-cyan/60 hover:text-cyan" aria-label="Fullscreen chart">
            <Maximize2 size={14} />
          </button>
        </div>
      </div>
      <div ref={ref} className={fullscreen ? "h-[620px] w-full" : "h-[430px] w-full"} />
      <div className="grid gap-3 md:grid-cols-2">
        <MicroIndicator title="RSI" data={rsiSeries.map((item) => item.rsi)} accent="#3ddbd9" />
        <MicroIndicator title="MACD" data={macdSeries.map((item) => item.macd - item.signal)} accent="#f4c430" />
      </div>
    </div>
  );
}

function lineData(bars: MarketBar[], key: keyof MarketBar): LineData[] {
  return bars
    .filter((bar) => typeof bar[key] === "number")
    .map((bar) => ({ time: bar.timestamp.slice(0, 10), value: Number(bar[key]) }));
}

function buildMarkers(bars: MarketBar[]): SeriesMarker<Time>[] {
  const sample = bars.slice(-80);
  return sample
    .filter((_, index) => index % 23 === 0)
    .map((bar, index) => ({
      time: bar.timestamp.slice(0, 10),
      position: index % 2 === 0 ? "belowBar" : "aboveBar",
      color: index % 2 === 0 ? "#59d38c" : "#ff647c",
      shape: index % 2 === 0 ? "arrowUp" : "arrowDown",
      text: index % 2 === 0 ? "AI BUY" : "RISK TRIM"
    }));
}

function MicroIndicator({ title, data, accent }: { title: string; data: number[]; accent: string }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  return (
    <div className="rounded-md border border-line bg-black/25 p-2">
      <div className="mb-2 font-mono text-[11px] uppercase tracking-[0.18em] text-slate-500">{title}</div>
      <div className="flex h-16 items-end gap-0.5">
        {data.map((value, index) => {
          const height = ((value - min) / Math.max(0.001, max - min)) * 54 + 6;
          return <div key={`${title}-${index}`} className="flex-1 rounded-t-sm" style={{ height, background: accent, opacity: 0.28 + index / data.length / 2 }} />;
        })}
      </div>
    </div>
  );
}
