"use client";

import { motion } from "framer-motion";
import {
  Activity, Bell, BrainCircuit, Cpu, FlaskConical,
  Radio, RefreshCw, ShieldAlert, Sparkles, Zap,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AiChatPanel } from "@/components/ai-chat-panel";
import { AgentOrchestration } from "@/components/agent-orchestration";
import { ExplainabilityPanel } from "@/components/explainability-panel";
import { LiveTerminal } from "@/components/live-terminal";
import { MarketCommandPalette } from "@/components/market-command-palette";
import { MarketChart } from "@/components/market-chart";
import { MarketIntelligence } from "@/components/market-intelligence";
import { MetricTile } from "@/components/metric-tile";
import { NewsIntelligence } from "@/components/news-intelligence";
import { PerformancePanel, performanceStats } from "@/components/performance-panel";
import { PortfolioRiskSuite } from "@/components/portfolio-risk-suite";
import { PortfolioIntelligence } from "@/components/portfolio-intelligence";
import { PortfolioManager } from "@/components/portfolio-manager";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { fetchMarketData } from "@/lib/api";
import { API_BASE } from "@/lib/config";
import { convertCurrency, findInstrument, formatCurrency } from "@/lib/markets";
import { analyzeMarket, QuantAnalysis } from "@/lib/quant-engine";
import { enrichBars, Timeframe } from "@/lib/terminal-data";
import { MarketBar } from "@/lib/types";
import { useDashboardStore } from "@/store/use-dashboard-store";

// ─── Demo badge ───────────────────────────────────────────────────────────────

function DemoBadge() {
  return (
    <div className="flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[10px] font-medium text-amber-400">
      <Zap size={10} className="fill-amber-400" />
      DEMO MODE
    </div>
  );
}

// ─── Nav link ─────────────────────────────────────────────────────────────────

function NavLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-1.5 rounded-lg border border-line bg-black/25 px-3 py-1.5 text-xs text-slate-400 transition hover:border-slate-600 hover:text-slate-200"
    >
      {icon}{label}
    </Link>
  );
}

// ─── Main dashboard ───────────────────────────────────────────────────────────

export default function DashboardPage() {
  const {
    symbol, currency, bars, decision, portfolio, marketStatus, events,
    holdings, setSymbol, setCurrency, setBars, setDecision, setPortfolio,
    setMarketStatus, setEvents, setHoldings, setPortfolioAnalytics,
  } = useDashboardStore();

  const instrument = findInstrument(symbol);
  const [timeframe, setTimeframe] = useState<Timeframe>("1d");
  const [analysis, setAnalysis] = useState<QuantAnalysis | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [showPortfolioManager, setShowPortfolioManager] = useState(false);
  const [mounted, setMounted] = useState(false);

  async function fetchPortfolioData() {
    try {
      const pRes = await fetch(`${API_BASE}/api/portfolio`);
      if (pRes.ok) {
        const pData = await pRes.json();
        setHoldings(pData.holdings || []);
      }
      const aRes = await fetch(`${API_BASE}/api/portfolio/analytics`);
      if (aRes.ok) setPortfolioAnalytics(await aRes.json());
    } catch (e) {
      console.warn("Portfolio fetch failed:", e);
    }
  }

  async function refresh() {
    try {
      const marketData = await fetchMarketData(symbol, timeframe);
      const nextAnalysis = analyzeMarket(symbol, marketData.bars);
      setBars(marketData.bars);
      setDecision(nextAnalysis.decision);
      setPortfolio(nextAnalysis.portfolio);
      setEvents(nextAnalysis.events);
      setAnalysis(nextAnalysis);
      setMarketStatus({ source: marketData.source, provider: marketData.provider, asOf: marketData.asOf });
      setError(undefined);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to load market data";
      setError(message);
      setMarketStatus({ source: "error", provider: "Yahoo Finance", asOf: new Date().toISOString(), error: message });
    }
  }

  useEffect(() => {
    refresh();
    fetchPortfolioData();
    const timer = window.setInterval(refresh, 12000);
    setMounted(true);
    return () => window.clearInterval(timer);
  }, [symbol, timeframe]);

  const convertedBars = useMemo<MarketBar[]>(
    () =>
      enrichBars(bars).map((bar) => ({
        ...bar,
        open: convertCurrency(bar.open, instrument.quoteCurrency, currency),
        high: convertCurrency(bar.high, instrument.quoteCurrency, currency),
        low: convertCurrency(bar.low, instrument.quoteCurrency, currency),
        close: convertCurrency(bar.close, instrument.quoteCurrency, currency),
        ema20: bar.ema20 ? convertCurrency(bar.ema20, instrument.quoteCurrency, currency) : undefined,
        sma50: bar.sma50 ? convertCurrency(bar.sma50, instrument.quoteCurrency, currency) : undefined,
        vwap: bar.vwap ? convertCurrency(bar.vwap, instrument.quoteCurrency, currency) : undefined,
        bbUpper: bar.bbUpper ? convertCurrency(bar.bbUpper, instrument.quoteCurrency, currency) : undefined,
        bbLower: bar.bbLower ? convertCurrency(bar.bbLower, instrument.quoteCurrency, currency) : undefined,
      })),
    [bars, currency, instrument.quoteCurrency]
  );

  const convertedEquity = convertCurrency(portfolio?.equity ?? 100000, "USD", currency);
  const convertedExposure = convertCurrency(portfolio?.gross_exposure ?? 0, "USD", currency);
  const latestPrice = convertedBars.at(-1)?.close ?? 0;
  const previousPrice = convertedBars.at(-2)?.close ?? latestPrice;
  const priceDelta = latestPrice - previousPrice;
  const asOfText = mounted && marketStatus?.asOf
    ? new Date(marketStatus.asOf).toLocaleTimeString("en-IN", { hour12: false })
    : "waiting";
  const stats = performanceStats(convertedBars);

  return (
    <main className="subtle-grid min-h-screen px-3 py-4 md:px-5">
      <div className="mx-auto max-w-[1800px] space-y-4">

        {/* ── Top bar ─────────────────────────────────────────────────── */}
        <header className="terminal-topbar rounded-xl border border-line bg-black/20 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-cyan">
                <BrainCircuit size={22} />
                <span className="text-sm uppercase tracking-[0.3em] font-medium">QuantumTrade AI</span>
              </div>
              <span className={
                marketStatus?.source === "live"
                  ? "rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-emerald-400"
                  : "rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-amber-400"
              }>
                {marketStatus?.source === "live" ? "● LIVE" : "◌ SYNCING"}
              </span>
              <DemoBadge />
            </div>
            <div className="flex items-center gap-2">
              <NavLink href="/backtests" icon={<FlaskConical size={12} />} label="Backtester" />
              <NavLink href="/alerts" icon={<Bell size={12} />} label="Alerts" />
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-slate-50 md:text-4xl">
                AI-Native Institutional Trading OS
              </h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-400">
                Multi-agent decisioning · Explainable AI · Portfolio risk engine · Conversational market intelligence
              </p>
              <p className="mt-1.5 font-mono text-xs text-slate-600">
                Provider: {marketStatus?.provider ?? "Yahoo Finance"} · Last sync: {asOfText}
                {error ? ` · ⚠ ${error}` : ""}
              </p>
            </div>
            <div className="flex flex-shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
              <MarketCommandPalette
                symbol={symbol}
                currency={currency}
                onSymbolChange={setSymbol}
                onCurrencyChange={setCurrency}
              />
              <div className="flex gap-2">
                <Button onClick={() => setShowPortfolioManager(true)}>Manage Portfolio</Button>
                <Button onClick={() => { refresh(); fetchPortfolioData(); }}>
                  <RefreshCw size={15} /> Sync
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* ── Metric tiles ────────────────────────────────────────────── */}
        <section className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <MetricTile label="Meta Decision" value={decision ? `${decision.action} ${(decision.confidence * 100).toFixed(0)}%` : "Loading"} tone={decision?.action === "BUY" ? "good" : decision?.action === "SELL" ? "bad" : "neutral"} />
          <MetricTile label="Market Regime" value={decision?.regime.replace("_", " ") ?? "Loading"} />
          <MetricTile label="Last Price" value={latestPrice ? formatCurrency(latestPrice, currency) : "Loading"} />
          <MetricTile label="Live Tick" value={`${priceDelta >= 0 ? "+" : ""}${priceDelta.toFixed(2)}`} tone={priceDelta >= 0 ? "good" : "bad"} />
          <MetricTile label="Paper Equity" value={formatCurrency(convertedEquity, currency)} tone="good" />
          <MetricTile label="Gross Exposure" value={formatCurrency(convertedExposure, currency)} />
        </section>

        {/* ── Chart · Explainability · Terminal ──────────────────────── */}
        <section className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-[1.55fr_0.9fr_0.75fr]">
          <Card className="min-w-0">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                <Activity size={17} /> Execution Charting
              </div>
              <div className="flex items-center gap-2 text-xs text-emerald-400">
                <Radio size={14} /> Live API polling
              </div>
            </div>
            <MarketChart bars={convertedBars} symbol={symbol} timeframe={timeframe} onTimeframeChange={setTimeframe} />
          </Card>
          <Card>
            <ExplainabilityPanel decision={decision} />
            <div className="mt-5 rounded-lg border border-cyan/20 bg-cyan/5 p-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-cyan">
                <Sparkles size={16} /> Confidence Pulse
              </div>
              <motion.div animate={{ opacity: [0.45, 1, 0.45] }} transition={{ repeat: Infinity, duration: 1.8 }} className="mt-3 h-3 rounded-full bg-white/10">
                <div className="h-3 rounded-full bg-gradient-to-r from-cyan to-emerald-400" style={{ width: `${Math.round((decision?.confidence ?? 0.62) * 100)}%` }} />
              </motion.div>
            </div>
          </Card>
          <Card><LiveTerminal events={events} /></Card>
        </section>

        {/* ── Agents · Performance · Market Intel ────────────────────── */}
        <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-[1fr_1fr_0.85fr]">
          <Card>
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-200">
              <Cpu size={16} /> Multi-Agent Orchestration
            </div>
            <AgentOrchestration decision={decision} />
          </Card>
          <Card>
            <div className="mb-3 text-sm font-semibold text-slate-200">Performance & Drawdown Analytics</div>
            <PerformancePanel bars={convertedBars} />
            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs text-slate-400">
              <div className="rounded-md border border-line p-2">Sharpe<br /><span className="text-slate-100">{stats.sharpe.toFixed(2)}</span></div>
              <div className="rounded-md border border-line p-2">Max DD<br /><span className="text-red-400">{(stats.maxDrawdown * 100).toFixed(1)}%</span></div>
              <div className="rounded-md border border-line p-2">Win Rate<br /><span className="text-emerald-400">{(stats.winRate * 100).toFixed(0)}%</span></div>
            </div>
          </Card>
          <Card>
            <MarketIntelligence symbol={symbol} decision={decision} commentary={analysis?.commentary} heatmap={analysis?.heatmap} />
          </Card>
        </section>

        {/* ── Portfolio · AI Chat · News ──────────────────────────────── */}
        <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-[1fr_1.2fr_1fr]">
          <Card>
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-200">
              <Activity size={16} /> Portfolio Intelligence & Risk Engine
            </div>
            <PortfolioIntelligence />
          </Card>
          <Card className="min-h-[520px]"><AiChatPanel /></Card>
          <Card className="min-h-[520px] overflow-hidden p-0"><NewsIntelligence /></Card>
        </section>

        {/* ── Risk Suite ──────────────────────────────────────────────── */}
        <section>
          <Card>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                <ShieldAlert size={16} /> Synthetic Factor Intelligence & Stress Tests
              </div>
              <div className="flex gap-3 text-[11px] text-slate-500">
                <Link href="/backtests" className="flex items-center gap-1 transition hover:text-cyan">
                  <FlaskConical size={11} /> Run a full backtest →
                </Link>
                <Link href="/alerts" className="flex items-center gap-1 transition hover:text-amber-400">
                  <Bell size={11} /> Set price alerts →
                </Link>
              </div>
            </div>
            <PortfolioRiskSuite factors={analysis?.factors} stress={analysis?.stress} />
          </Card>
        </section>

      </div>
      {showPortfolioManager && <PortfolioManager onClose={() => setShowPortfolioManager(false)} />}
    </main>
  );
}
