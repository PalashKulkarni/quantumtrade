/**
 * Global dashboard state — Zustand store.
 * Demo mode: no authentication required. All state is local.
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Decision, MarketBar, Portfolio, TerminalEvent, ChatMessage } from "@/lib/types";
import type { CurrencyCode } from "@/lib/markets";

// ─── Demo user (always present) ───────────────────────────────────────────────

export interface DemoUser {
  id: number;
  name: string;
  email: string;
  plan: "pro";
  preferred_currency: CurrencyCode;
  preferred_markets: string;
}

export const DEMO_USER: DemoUser = {
  id: 1,
  name: "Demo Trader",
  email: "demo@quantumtrade.ai",
  plan: "pro",
  preferred_currency: "INR",
  preferred_markets: "NSE,NASDAQ",
};

// ─── Holding shape ────────────────────────────────────────────────────────────

export interface HoldingInput {
  id?: number;
  ticker: string;
  quantity: number;
  average_price: number;
  sector?: string;
  asset_class?: string;
}

export type HoldingDTO = HoldingInput;

// ─── Portfolio analytics ──────────────────────────────────────────────────────

export interface PortfolioAnalytics {
  total_value: number;
  unrealized_pnl: number;
  unrealized_pnl_percent: number;
  beta: number;
  sharpe_ratio: number;
  sector_exposure: Record<string, number>;
  asset_class_exposure: Record<string, number>;
  correlations: Record<string, Record<string, number>>;
  stress_tests: Record<string, number>;
  health_score: number;
  recommendations: string[];
}

// ─── Market status ────────────────────────────────────────────────────────────

export interface MarketStatus {
  source: "live" | "error" | "syncing";
  provider: string;
  asOf: string;
  error?: string;
}

// ─── Store shape ──────────────────────────────────────────────────────────────

interface DashboardState {
  // Dashboard
  symbol: string;
  currency: CurrencyCode;
  bars: MarketBar[];
  decision: Decision | undefined;
  portfolio: Portfolio | undefined;
  marketStatus: MarketStatus | undefined;
  events: TerminalEvent[];

  // Portfolio
  holdings: HoldingInput[];
  portfolioAnalytics: PortfolioAnalytics | undefined;

  // Chat
  chatMessages: ChatMessage[];

  // UI
  sidebarOpen: boolean;
  commandPaletteOpen: boolean;
}

interface DashboardActions {
  setSymbol: (symbol: string) => void;
  setCurrency: (currency: CurrencyCode) => void;
  setBars: (bars: MarketBar[]) => void;
  setDecision: (decision: Decision | undefined) => void;
  setPortfolio: (portfolio: Portfolio | undefined) => void;
  setMarketStatus: (status: MarketStatus | undefined) => void;
  setEvents: (events: TerminalEvent[]) => void;
  setHoldings: (holdings: HoldingInput[]) => void;
  setPortfolioAnalytics: (analytics: PortfolioAnalytics | undefined) => void;
  setChatMessages: (messages: ChatMessage[]) => void;
  addChatMessage: (message: ChatMessage) => void;
  clearChat: () => void;
  setSidebarOpen: (open: boolean) => void;
  setCommandPaletteOpen: (open: boolean) => void;
}

type DashboardStore = DashboardState & DashboardActions;

// ─── Store ────────────────────────────────────────────────────────────────────

export const useDashboardStore = create<DashboardStore>()(
  persist(
    (set) => ({
      symbol: "RELIANCE.NS",
      currency: "INR",
      bars: [],
      decision: undefined,
      portfolio: undefined,
      marketStatus: undefined,
      events: [],
      holdings: [],
      portfolioAnalytics: undefined,
      chatMessages: [],
      sidebarOpen: false,
      commandPaletteOpen: false,

      setSymbol: (symbol) => set({ symbol }),
      setCurrency: (currency) => set({ currency }),
      setBars: (bars) => set({ bars }),
      setDecision: (decision) => set({ decision }),
      setPortfolio: (portfolio) => set({ portfolio }),
      setMarketStatus: (marketStatus) => set({ marketStatus }),
      setEvents: (events) => set({ events }),
      setHoldings: (holdings) => set({ holdings }),
      setPortfolioAnalytics: (portfolioAnalytics) => set({ portfolioAnalytics }),
      setChatMessages: (chatMessages) => set({ chatMessages }),
      addChatMessage: (message) =>
        set((state) => ({ chatMessages: [...state.chatMessages, message] })),
      clearChat: () => set({ chatMessages: [] }),
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      setCommandPaletteOpen: (commandPaletteOpen) => set({ commandPaletteOpen }),
    }),
    {
      name: "qt-dashboard-demo",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        symbol: state.symbol,
        currency: state.currency,
        holdings: state.holdings,
        chatMessages: state.chatMessages,
      }),
    }
  )
);

// ─── Selectors ────────────────────────────────────────────────────────────────

/** Always returns plain JSON headers — no Authorization token in demo mode */
export const selectApiHeaders = (_state?: DashboardStore): Record<string, string> => ({
  "Content-Type": "application/json",
});
