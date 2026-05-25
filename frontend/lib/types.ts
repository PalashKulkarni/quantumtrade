export type MarketBar = {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  ema20?: number;
  sma50?: number;
  vwap?: number;
  bbUpper?: number;
  bbLower?: number;
  rsi?: number;
  macd?: number;
  macdSignal?: number;
};

export type AgentDecision = {
  agent: string;
  action: "BUY" | "SELL" | "HOLD";
  confidence: number;
  probabilities: Record<string, number>;
  explanation: string;
};

export type Decision = {
  symbol: string;
  action: "BUY" | "SELL" | "HOLD";
  confidence: number;
  position_size: number;
  regime: string;
  sentiment: Record<string, number>;
  agents: AgentDecision[];
  explanation: string;
  feature_importance: Record<string, number>;
};

export type Portfolio = {
  cash: number;
  equity: number;
  gross_exposure: number;
  trade_count: number;
  positions: Record<string, number>;
};

export type MarketDataResponse = {
  source: "live" | "error";
  provider: string;
  asOf: string;
  error?: string;
  bars: MarketBar[];
  meta?: {
    regularMarketPrice?: number;
    currency?: string;
    exchangeName?: string;
    instrumentType?: string;
  };
};

export type TerminalEvent = {
  id: string;
  timestamp: string;
  source: string;
  message: string;
  severity: "info" | "success" | "warning" | "danger";
};

// Extended ChatMessage — toolCalls added for Phase 2 streaming
export type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  toolCalls?: string[];
};
