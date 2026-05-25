import { NextRequest, NextResponse } from "next/server";
import { MarketBar } from "@/lib/types";

export const dynamic = "force-dynamic";

const timeframeMap = {
  "1m": { interval: "1m", range: "1d" },
  "5m": { interval: "5m", range: "5d" },
  "15m": { interval: "15m", range: "5d" },
  "1h": { interval: "1h", range: "1mo" },
  "4h": { interval: "1h", range: "3mo", bucket: 4 },
  "1d": { interval: "1d", range: "1y" }
} as const;

type YahooChartResponse = {
  chart?: {
    result?: Array<{
      meta?: { regularMarketPrice?: number; currency?: string; exchangeName?: string; instrumentType?: string };
      timestamp?: number[];
      indicators?: {
        quote?: Array<{
          open?: Array<number | null>;
          high?: Array<number | null>;
          low?: Array<number | null>;
          close?: Array<number | null>;
          volume?: Array<number | null>;
        }>;
      };
    }>;
    error?: { description?: string };
  };
};

export async function GET(request: NextRequest, context: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await context.params;
  const timeframe = request.nextUrl.searchParams.get("timeframe") ?? "1d";
  const limit = Number(request.nextUrl.searchParams.get("limit") ?? 180);
  const config = timeframeMap[timeframe as keyof typeof timeframeMap] ?? timeframeMap["1d"];
  const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${config.range}&interval=${config.interval}&includePrePost=false`;

  try {
    const response = await fetch(yahooUrl, {
      cache: "no-store",
      headers: {
        "User-Agent": "QuantumTradeAI/1.0 market-data research terminal"
      }
    });
    if (!response.ok) {
      throw new Error(`Yahoo Finance returned ${response.status}`);
    }
    const payload = (await response.json()) as YahooChartResponse;
    const result = payload.chart?.result?.[0];
    const quote = result?.indicators?.quote?.[0];
    if (!result?.timestamp || !quote?.close) {
      throw new Error(payload.chart?.error?.description ?? "Yahoo Finance response did not include OHLCV bars");
    }

    let bars = result.timestamp
      .map((timestamp, index): MarketBar | undefined => {
        const open = quote.open?.[index];
        const high = quote.high?.[index];
        const low = quote.low?.[index];
        const close = quote.close?.[index];
        const volume = quote.volume?.[index] ?? 0;
        if ([open, high, low, close].some((value) => value === null || value === undefined || Number.isNaN(value))) return undefined;
        return {
          timestamp: new Date(timestamp * 1000).toISOString(),
          open: Number(open),
          high: Number(high),
          low: Number(low),
          close: Number(close),
          volume: Number(volume)
        };
      })
      .filter((bar): bar is MarketBar => Boolean(bar));

    if ("bucket" in config && config.bucket) {
      bars = bucketBars(bars, config.bucket);
    }

    return NextResponse.json({
      source: "live",
      provider: "Yahoo Finance",
      asOf: new Date().toISOString(),
      meta: result.meta,
      bars: bars.slice(-limit)
    });
  } catch (error) {
    return NextResponse.json(
      {
        source: "error",
        provider: "Yahoo Finance",
        asOf: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown market-data error",
        bars: []
      },
      { status: 502 }
    );
  }
}

function bucketBars(bars: MarketBar[], bucketSize: number): MarketBar[] {
  const output: MarketBar[] = [];
  for (let index = 0; index < bars.length; index += bucketSize) {
    const bucket = bars.slice(index, index + bucketSize);
    if (bucket.length === 0) continue;
    output.push({
      timestamp: bucket[0].timestamp,
      open: bucket[0].open,
      high: Math.max(...bucket.map((bar) => bar.high)),
      low: Math.min(...bucket.map((bar) => bar.low)),
      close: bucket.at(-1)?.close ?? bucket[0].close,
      volume: bucket.reduce((sum, bar) => sum + bar.volume, 0)
    });
  }
  return output;
}
