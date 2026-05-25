import { findInstrument } from "@/lib/markets";
import { enrichBars } from "@/lib/terminal-data";
import { AgentDecision, Decision, MarketBar, Portfolio, TerminalEvent } from "@/lib/types";

type Action = "BUY" | "SELL" | "HOLD";

export type QuantAnalysis = {
  decision: Decision;
  portfolio: Portfolio;
  events: TerminalEvent[];
  commentary: string;
  heatmap: { label: string; value: number; size: number }[];
  factors: { factor: string; exposure: number }[];
  stress: { scenario: string; pnl: number; var: number }[];
};

export function analyzeMarket(symbol: string, rawBars: MarketBar[]): QuantAnalysis {
  const instrument = findInstrument(symbol);
  const bars = enrichBars(rawBars);
  const latest = bars.at(-1);
  const previous = bars.at(-2);
  if (!latest || !previous) {
    throw new Error("Not enough market data to analyze");
  }

  const returns = pctReturns(bars);
  const trend20 = latest.close / bars[Math.max(0, bars.length - 21)].close - 1;
  const trend60 = latest.close / bars[Math.max(0, bars.length - 61)].close - 1;
  const realizedVol = stddev(returns.slice(-30)) * Math.sqrt(252);
  const volumeRatio = latest.volume / Math.max(1, average(bars.slice(-30).map((bar) => bar.volume)));
  const rsi = latest.rsi ?? 50;
  const macdSpread = (latest.macd ?? 0) - (latest.macdSignal ?? 0);
  const vwapDistance = latest.vwap ? latest.close / latest.vwap - 1 : 0;
  const bollingerPosition = latest.bbUpper && latest.bbLower ? (latest.close - latest.bbLower) / Math.max(0.001, latest.bbUpper - latest.bbLower) : 0.5;
  const sentimentScore = inferSentimentFromTape({ trend20, trend60, volumeRatio, rsi, macdSpread });
  const regime = detectRegime(trend60, realizedVol);
  const agents = buildAgentDecisions({ trend20, trend60, realizedVol, volumeRatio, rsi, macdSpread, vwapDistance, bollingerPosition, sentimentScore, regime });
  const actionScores = aggregateAgents(agents);
  const action = Object.entries(actionScores).sort((a, b) => b[1] - a[1])[0][0] as Action;
  const confidence = clamp(actionScores[action] / Math.max(0.001, Object.values(actionScores).reduce((sum, score) => sum + score, 0)), 0.34, 0.94);
  const atr = average(bars.slice(-14).map((bar) => bar.high - bar.low));
  const portfolioValue = 100_000;
  const positionSize = action === "BUY" ? Math.floor(Math.min(portfolioValue * 0.24 / latest.close, portfolioValue * 0.018 / Math.max(atr * 2, latest.close * 0.012))) : 0;

  const featureImportance = {
    momentum: clamp(Math.abs(trend20) * 10, 0.05, 1),
    sentiment: clamp(Math.abs(sentimentScore), 0.05, 1),
    volatility: clamp(realizedVol, 0.05, 1),
    regime: regime === "sideways_market" ? 0.35 : 0.72,
    risk: clamp(atr / latest.close * 16, 0.1, 0.85),
    volume: clamp(volumeRatio / 2.5, 0.05, 1)
  };

  const explanation = explainDecision({ action, confidence, symbol, rsi, trend20, realizedVol, volumeRatio, sentimentScore, regime, vwapDistance });
  const decision: Decision = {
    symbol,
    action,
    confidence,
    position_size: positionSize,
    regime,
    sentiment: {
      bullish: clamp((sentimentScore + 1) / 2, 0, 1),
      bearish: clamp(1 - (sentimentScore + 1) / 2, 0, 1),
      confidence: clamp(0.5 + Math.abs(sentimentScore) / 2, 0.5, 0.95),
      aggregate: sentimentScore
    },
    agents,
    explanation,
    feature_importance: featureImportance
  };

  const notional = positionSize * latest.close;
  return {
    decision,
    portfolio: {
      cash: portfolioValue - notional,
      equity: portfolioValue + notional * (latest.close / previous.close - 1),
      gross_exposure: notional,
      trade_count: Math.max(3, Math.round(volumeRatio * 7)),
      positions: positionSize > 0 ? { [symbol]: positionSize } : {}
    },
    events: buildRealEvents(symbol, decision, { realizedVol, volumeRatio, latestPrice: latest.close }),
    commentary: buildCommentary(symbol, instrument.name, decision, { trend20, realizedVol, volumeRatio, rsi, vwapDistance }),
    heatmap: buildHeatmap(instrument.sector, trend20, realizedVol, sentimentScore),
    factors: buildFactors({ trend20, realizedVol, sentimentScore, volumeRatio }),
    stress: buildStress(realizedVol, trend60)
  };
}

function buildAgentDecisions(input: {
  trend20: number;
  trend60: number;
  realizedVol: number;
  volumeRatio: number;
  rsi: number;
  macdSpread: number;
  vwapDistance: number;
  bollingerPosition: number;
  sentimentScore: number;
  regime: string;
}): AgentDecision[] {
  return [
    agent("momentum", input.trend20 > 0.015 && input.macdSpread > 0 ? "BUY" : input.trend20 < -0.015 && input.macdSpread < 0 ? "SELL" : "HOLD", clamp(0.48 + Math.abs(input.trend20) * 8 + Math.abs(input.macdSpread) * 0.08, 0.45, 0.88), `20-period trend is ${(input.trend20 * 100).toFixed(2)}% and MACD spread is ${input.macdSpread.toFixed(3)}.`),
    agent("mean_reversion", input.rsi < 35 || input.bollingerPosition < 0.18 ? "BUY" : input.rsi > 68 || input.bollingerPosition > 0.88 ? "SELL" : "HOLD", clamp(0.42 + Math.abs(input.rsi - 50) / 55, 0.42, 0.82), `RSI is ${input.rsi.toFixed(1)} and Bollinger location is ${(input.bollingerPosition * 100).toFixed(0)}%.`),
    agent("volatility", input.realizedVol > 0.38 ? "HOLD" : input.trend20 > 0 ? "BUY" : "HOLD", clamp(0.46 + input.realizedVol, 0.46, 0.86), `Realized volatility is ${(input.realizedVol * 100).toFixed(1)}%.`),
    agent("sentiment", input.sentimentScore > 0.18 ? "BUY" : input.sentimentScore < -0.18 ? "SELL" : "HOLD", clamp(0.5 + Math.abs(input.sentimentScore) * 0.35, 0.5, 0.84), `Tape-implied sentiment score is ${(input.sentimentScore * 100).toFixed(0)}.`),
    agent("risk_manager", input.realizedVol > 0.45 || input.regime === "high_volatility" ? "HOLD" : "HOLD", clamp(0.52 + input.realizedVol * 0.55, 0.52, 0.88), `Risk model sees ${input.regime.replace("_", " ")} with volume ratio ${input.volumeRatio.toFixed(2)}x.`),
    agent("portfolio_allocation", input.regime === "bull_market" ? "BUY" : input.regime === "bear_market" ? "SELL" : "HOLD", 0.58, `Allocation model adapts to ${input.regime.replace("_", " ")}.`),
    agent("macro", input.realizedVol > 0.35 ? "HOLD" : "HOLD", 0.55, "Macro proxy remains neutral because no external macro feed is configured."),
    agent("forecasting", input.trend60 > 0 && input.vwapDistance > 0 ? "BUY" : input.trend60 < 0 && input.vwapDistance < 0 ? "SELL" : "HOLD", clamp(0.5 + Math.abs(input.trend60) * 4, 0.5, 0.82), `Sequence proxy uses 60-period trend ${(input.trend60 * 100).toFixed(2)}% and VWAP distance ${(input.vwapDistance * 100).toFixed(2)}%.`)
  ];
}

function agent(name: string, action: Action, confidence: number, explanation: string): AgentDecision {
  const remaining = 1 - confidence;
  return {
    agent: name,
    action,
    confidence,
    probabilities: {
      BUY: action === "BUY" ? confidence : remaining / 2,
      SELL: action === "SELL" ? confidence : remaining / 2,
      HOLD: action === "HOLD" ? confidence : remaining / 2
    },
    explanation
  };
}

function aggregateAgents(agents: AgentDecision[]): Record<Action, number> {
  const weights: Record<string, number> = { momentum: 1.2, mean_reversion: 0.95, volatility: 1.05, sentiment: 0.85, risk_manager: 1.25, portfolio_allocation: 0.9, macro: 0.7, forecasting: 1.1 };
  return agents.reduce(
    (scores, item) => {
      scores[item.action] += item.confidence * (weights[item.agent] ?? 1);
      return scores;
    },
    { BUY: 0, SELL: 0, HOLD: 0 } as Record<Action, number>
  );
}

function detectRegime(trend60: number, vol: number): string {
  if (vol > 0.42) return "high_volatility";
  if (trend60 > 0.045) return "bull_market";
  if (trend60 < -0.045) return "bear_market";
  return "sideways_market";
}

function inferSentimentFromTape(input: { trend20: number; trend60: number; volumeRatio: number; rsi: number; macdSpread: number }): number {
  return clamp(input.trend20 * 4 + input.trend60 * 2 + (input.volumeRatio - 1) * 0.12 + (input.rsi - 50) / 120 + Math.sign(input.macdSpread) * 0.08, -0.9, 0.9);
}

function explainDecision(input: { action: Action; confidence: number; symbol: string; rsi: number; trend20: number; realizedVol: number; volumeRatio: number; sentimentScore: number; regime: string; vwapDistance: number }): string {
  return `${input.action} selected for ${input.symbol} with ${(input.confidence * 100).toFixed(0)}% ensemble confidence because 20-period momentum is ${(input.trend20 * 100).toFixed(2)}%, RSI is ${input.rsi.toFixed(1)}, tape-implied sentiment contributes ${(input.sentimentScore * 100).toFixed(0)}%, and VWAP distance is ${(input.vwapDistance * 100).toFixed(2)}%. Regime is ${input.regime.replace("_", " ")} with realized volatility at ${(input.realizedVol * 100).toFixed(1)}% and volume running ${input.volumeRatio.toFixed(2)}x recent average.`;
}

function buildRealEvents(symbol: string, decision: Decision, input: { realizedVol: number; volumeRatio: number; latestPrice: number }): TerminalEvent[] {
  const now = new Date();
  const stamp = (offset: number) => new Date(now.getTime() - offset * 1000).toLocaleTimeString("en-GB", { hour12: false });
  return [
    { id: "live-1", timestamp: stamp(22), source: "Market Data", message: `Yahoo Finance tick ${symbol} ${input.latestPrice.toFixed(2)}`, severity: "info" },
    { id: "live-2", timestamp: stamp(17), source: "Meta Agent", message: `${decision.action} confidence ${(decision.confidence * 100).toFixed(0)}%`, severity: decision.action === "BUY" ? "success" : decision.action === "SELL" ? "danger" : "info" },
    { id: "live-3", timestamp: stamp(12), source: "Regime Engine", message: `Detected ${decision.regime.replace("_", " ")}`, severity: decision.regime === "high_volatility" ? "warning" : "info" },
    { id: "live-4", timestamp: stamp(7), source: "Risk Engine", message: `Realized vol ${(input.realizedVol * 100).toFixed(1)}%; volume ${input.volumeRatio.toFixed(2)}x`, severity: input.realizedVol > 0.35 ? "warning" : "success" },
    { id: "live-5", timestamp: stamp(2), source: "Execution Simulator", message: `Position size ${decision.position_size.toFixed(0)} shares from live bars`, severity: "info" }
  ];
}

function buildCommentary(symbol: string, name: string, decision: Decision, input: { trend20: number; realizedVol: number; volumeRatio: number; rsi: number; vwapDistance: number }): string {
  return `${name} (${symbol}) is being analyzed from live Yahoo Finance bars. The ensemble is ${decision.action} with ${(decision.confidence * 100).toFixed(0)}% confidence: trend ${(input.trend20 * 100).toFixed(2)}%, RSI ${input.rsi.toFixed(1)}, VWAP distance ${(input.vwapDistance * 100).toFixed(2)}%, realized volatility ${(input.realizedVol * 100).toFixed(1)}%, and volume ${input.volumeRatio.toFixed(2)}x recent average.`;
}

function buildHeatmap(sector: string, trend: number, vol: number, sentiment: number) {
  const base = [
    ["Selected", trend * 100, 34],
    [sector, (trend + sentiment * 0.04) * 100, 30],
    ["Momentum", trend * 80, 24],
    ["Risk", -vol * 18, 22],
    ["Volume", sentiment * 7, 20],
    ["Breadth", trend * 45 + sentiment * 4, 18]
  ] as const;
  return base.map(([label, value, size]) => ({ label, value, size }));
}

function buildFactors(input: { trend20: number; realizedVol: number; sentimentScore: number; volumeRatio: number }) {
  return [
    { factor: "Momentum", exposure: clamp(0.5 + input.trend20 * 5, 0, 1) },
    { factor: "Quality", exposure: clamp(0.62 - input.realizedVol * 0.4, 0, 1) },
    { factor: "Low Vol", exposure: clamp(1 - input.realizedVol, 0, 1) },
    { factor: "Sentiment", exposure: clamp((input.sentimentScore + 1) / 2, 0, 1) },
    { factor: "Liquidity", exposure: clamp(input.volumeRatio / 2, 0, 1) }
  ];
}

function buildStress(vol: number, trend: number) {
  const drift = trend * 30;
  return [
    { scenario: "2008 crash", pnl: -Math.round((vol * 38 - drift) * 10) / 10, var: Math.round(vol * 26 * 10) / 10 },
    { scenario: "COVID shock", pnl: -Math.round((vol * 28 - drift) * 10) / 10, var: Math.round(vol * 21 * 10) / 10 },
    { scenario: "High inflation", pnl: -Math.round((vol * 18 - drift / 2) * 10) / 10, var: Math.round(vol * 15 * 10) / 10 },
    { scenario: "Rate hike cycle", pnl: -Math.round((vol * 14 - drift / 2) * 10) / 10, var: Math.round(vol * 12 * 10) / 10 }
  ];
}

function pctReturns(bars: MarketBar[]): number[] {
  return bars.slice(1).map((bar, index) => bar.close / bars[index].close - 1);
}

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
}

function stddev(values: number[]): number {
  const mean = average(values);
  return Math.sqrt(average(values.map((value) => (value - mean) ** 2)));
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

