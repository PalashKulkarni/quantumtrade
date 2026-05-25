import { MarketDataResponse } from "@/lib/types";
import { Timeframe } from "@/lib/terminal-data";

export async function fetchMarketData(symbol: string, timeframe: Timeframe = "1d"): Promise<MarketDataResponse> {
  const response = await fetch(`/api/market-data/${encodeURIComponent(symbol)}?timeframe=${timeframe}&limit=220`, {
    cache: "no-store"
  });
  const payload = (await response.json()) as MarketDataResponse;
  if (!response.ok || payload.bars.length === 0) {
    throw new Error(payload.error ?? "Live market data unavailable");
  }
  return payload;
}
