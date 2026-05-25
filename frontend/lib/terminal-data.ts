import { AgentDecision, ChatMessage, Decision, MarketBar, TerminalEvent } from "@/lib/types";

export const timeframes = ["1m", "5m", "15m", "1h", "4h", "1d"] as const;
export type Timeframe = (typeof timeframes)[number];

export function enrichBars(bars: MarketBar[]): MarketBar[] {
  let cumulativePv = 0;
  let cumulativeVolume = 0;
  return bars.map((bar, index) => {
    const closeSlice = bars.slice(Math.max(0, index - 49), index + 1).map((item) => item.close);
    const ema20 = emaAt(bars, index, 20);
    const sma50 = average(closeSlice);
    const basisSlice = bars.slice(Math.max(0, index - 19), index + 1).map((item) => item.close);
    const basis = average(basisSlice);
    const sigma = stddev(basisSlice);
    cumulativePv += bar.close * bar.volume;
    cumulativeVolume += bar.volume;
    const prev = bars[index - 1]?.close ?? bar.close;
    const momentum = bar.close - prev;
    return {
      ...bar,
      ema20,
      sma50,
      vwap: cumulativePv / Math.max(1, cumulativeVolume),
      bbUpper: basis + sigma * 2,
      bbLower: basis - sigma * 2,
      rsi: 50 + Math.max(-35, Math.min(35, momentum / Math.max(1, prev) * 1800)),
      macd: emaAt(bars, index, 12) - emaAt(bars, index, 26),
      macdSignal: emaAt(bars, index, 9) - emaAt(bars, index, 18)
    };
  });
}

export function buildTerminalEvents(symbol: string, decision?: Decision): TerminalEvent[] {
  const action = decision?.action ?? "HOLD";
  const confidence = Math.round((decision?.confidence ?? 0.62) * 100);
  return [
    { id: "e1", timestamp: "09:41:22", source: "Momentum Agent", message: `${action} ${symbol} confidence ${confidence}%`, severity: action === "BUY" ? "success" : action === "SELL" ? "danger" : "info" },
    { id: "e2", timestamp: "09:41:25", source: "Regime Engine", message: `Regime switched to ${(decision?.regime ?? "bull_market").replace("_", " ").toUpperCase()}`, severity: "warning" },
    { id: "e3", timestamp: "09:41:28", source: "Risk Engine", message: "Reduced marginal exposure by 14% after VaR drift", severity: "warning" },
    { id: "e4", timestamp: "09:41:32", source: "Sentiment Mesh", message: "News impulse improved bullish score by 18%", severity: "success" },
    { id: "e5", timestamp: "09:41:37", source: "Execution Simulator", message: "Paper fill routed with 11ms synthetic latency", severity: "info" }
  ];
}

export function marketCommentary(symbol: string, decision?: Decision): string {
  const regime = (decision?.regime ?? "bull_market").replace("_", " ");
  return `${symbol} is trading in a ${regime} with ${Math.round((decision?.confidence ?? 0.62) * 100)}% meta-agent confidence. Momentum remains constructive, volatility is contained, and sentiment adds a modest positive impulse while the risk engine keeps sizing disciplined.`;
}

export const heatmapCells = [
  { label: "IT", value: 2.4, size: 34 },
  { label: "Banks", value: -0.8, size: 28 },
  { label: "Energy", value: 1.7, size: 25 },
  { label: "Autos", value: -1.2, size: 20 },
  { label: "FMCG", value: 0.5, size: 18 },
  { label: "Crypto", value: 3.1, size: 22 },
  { label: "Semis", value: 2.8, size: 30 },
  { label: "Rates", value: -0.4, size: 16 }
];

export const portfolioFactors = [
  { factor: "Momentum", exposure: 0.74 },
  { factor: "Value", exposure: 0.22 },
  { factor: "Quality", exposure: 0.61 },
  { factor: "Low Vol", exposure: 0.38 },
  { factor: "Sentiment", exposure: 0.57 }
];

export const stressScenarios = [
  { scenario: "2008 crash", pnl: -18.4, var: 12.8 },
  { scenario: "COVID shock", pnl: -11.7, var: 9.4 },
  { scenario: "High inflation", pnl: -6.2, var: 6.9 },
  { scenario: "Rate hike cycle", pnl: -4.8, var: 5.6 }
];

export function answerQuantQuestion(question: string, symbol: string, decision?: Decision): ChatMessage {
  const lower = question.toLowerCase();
  const signal = decision?.agents.sort((a, b) => b.confidence - a.confidence)[0];
  let content = `For **${symbol}**, the meta-agent is currently leaning **${decision?.action ?? "HOLD"}** with ${Math.round((decision?.confidence ?? 0.62) * 100)}% confidence. The strongest specialist signal is **${signal?.agent ?? "momentum"}**, and the portfolio impact is controlled through volatility-adjusted sizing.`;
  if (lower.includes("risk") || lower.includes("var")) {
    content = `Risk is moderate. Current simulated VaR is elevated but inside policy, gross exposure is below the max threshold, and the risk agent is dampening position size because volatility contribution is rising.`;
  }
  if (lower.includes("compare")) {
    content = `Relative comparison: **${symbol}** has stronger near-term momentum than the peer basket, while sentiment is closer to neutral. I would watch RSI recovery, VWAP reclaim, and whether MACD remains above signal for confirmation.`;
  }
  if (lower.includes("why")) {
    content = decision?.explanation ?? content;
  }
  return { id: `a-${Date.now()}`, role: "assistant", content };
}

export function agentRoster(decision?: Decision): AgentDecision[] {
  const base = decision?.agents ?? [];
  const extras: AgentDecision[] = [
    { agent: "macro", action: "HOLD", confidence: 0.59, probabilities: { BUY: 0.31, SELL: 0.1, HOLD: 0.59 }, explanation: "Macro liquidity is neutral; rates volatility is not forcing a de-risking event." },
    { agent: "forecasting", action: "BUY", confidence: 0.66, probabilities: { BUY: 0.66, SELL: 0.12, HOLD: 0.22 }, explanation: "Sequence model projects upside skew with compressed volatility." }
  ];
  const existing = new Set(base.map((item) => item.agent));
  return [...base, ...extras.filter((item) => !existing.has(item.agent))];
}

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
}

function stddev(values: number[]): number {
  const mean = average(values);
  return Math.sqrt(average(values.map((value) => (value - mean) ** 2)));
}

function emaAt(bars: MarketBar[], index: number, span: number): number {
  const alpha = 2 / (span + 1);
  let ema = bars[0]?.close ?? 0;
  for (let i = 1; i <= index; i += 1) {
    ema = bars[i].close * alpha + ema * (1 - alpha);
  }
  return ema;
}
