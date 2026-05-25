"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ExternalLink, Loader2, Newspaper, RefreshCw, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { API_BASE } from "@/lib/config";
import { useDashboardStore } from "@/store/use-dashboard-store";

interface Article {
  id: string; title: string; summary: string; url: string; source: string;
  published_at: string; sentiment_score: number; sentiment: "positive" | "negative" | "neutral"; symbol: string;
}

function SentimentBadge({ sentiment, score }: { sentiment: string; score: number }) {
  if (sentiment === "positive") return <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-400"><TrendingUp size={9} />{(score * 100).toFixed(0)}%</span>;
  if (sentiment === "negative") return <span className="flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-medium text-red-400"><TrendingDown size={9} />{(Math.abs(score) * 100).toFixed(0)}%</span>;
  return <span className="flex items-center gap-1 rounded-full bg-slate-500/15 px-2 py-0.5 text-[10px] text-slate-500"><Minus size={9} />neutral</span>;
}

export function NewsIntelligence() {
  const { holdings } = useDashboardStore();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | "positive" | "negative">("all");

  const fetchNews = useCallback(async () => {
    setLoading(true);
    try {
      const symbols = holdings.map(h => h.ticker).join(",");
      const url = symbols
        ? `${API_BASE}/api/news?symbols=${encodeURIComponent(symbols)}`
        : `${API_BASE}/api/news`;
      const res = await fetch(url);
      if (res.ok) { const data = await res.json(); setArticles(data.articles ?? []); }
    } finally { setLoading(false); }
  }, [holdings]);

  useEffect(() => { fetchNews(); }, [holdings]);

  const filtered = articles.filter(a =>
    filter === "all" ? true : filter === "positive" ? a.sentiment === "positive" : a.sentiment === "negative"
  );

  const posCount = articles.filter(a => a.sentiment === "positive").length;
  const negCount = articles.filter(a => a.sentiment === "negative").length;
  const neutralCount = articles.filter(a => a.sentiment === "neutral").length;
  const overallSentiment = posCount > negCount ? "bullish" : negCount > posCount ? "bearish" : "mixed";
  const sentimentColor = overallSentiment === "bullish" ? "text-emerald-400" : overallSentiment === "bearish" ? "text-red-400" : "text-slate-400";

  return (
    <div className="flex h-full flex-col rounded-lg border border-line bg-black/25">
      <div className="flex items-center justify-between border-b border-line px-3 py-2">
        <div className="flex items-center gap-2">
          <Newspaper size={15} className="text-violet-400" />
          <span className="text-sm font-semibold text-slate-100">News Intelligence</span>
          {articles.length > 0 && <span className={`font-mono text-[10px] font-semibold uppercase ${sentimentColor}`}>· {overallSentiment}</span>}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {(["all", "positive", "negative"] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`rounded-full px-2 py-0.5 text-[10px] transition capitalize ${filter === f ? f === "positive" ? "bg-emerald-500/20 text-emerald-400" : f === "negative" ? "bg-red-500/20 text-red-400" : "bg-white/[0.08] text-slate-300" : "text-slate-600 hover:text-slate-400"}`}>
                {f}
              </button>
            ))}
          </div>
          <button onClick={fetchNews} disabled={loading} className="rounded-md border border-line p-1 text-slate-500 transition hover:text-slate-300 disabled:opacity-40">
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {articles.length > 0 && (
        <div className="border-b border-line px-3 py-2">
          <div className="mb-1 flex items-center justify-between text-[10px] text-slate-500">
            <span>{negCount} bearish</span>
            <span className="font-medium text-slate-400">Sentiment distribution</span>
            <span>{posCount} bullish</span>
          </div>
          <div className="flex h-1.5 gap-0.5 overflow-hidden rounded-full">
            {negCount > 0 && <div className="rounded-l-full bg-red-500/60" style={{ flex: negCount }} />}
            {neutralCount > 0 && <div className="bg-slate-600/60" style={{ flex: neutralCount }} />}
            {posCount > 0 && <div className="rounded-r-full bg-emerald-500/60" style={{ flex: posCount }} />}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {loading && articles.length === 0 && (
          <div className="flex h-32 items-center justify-center gap-2 text-xs text-slate-600">
            <Loader2 size={14} className="animate-spin" /> Fetching news…
          </div>
        )}
        {!loading && articles.length === 0 && (
          <div className="flex h-32 flex-col items-center justify-center gap-2 text-center">
            <Newspaper size={20} className="text-slate-700" />
            <p className="text-xs text-slate-600">{holdings.length === 0 ? "Add holdings to see portfolio-linked news" : "No articles found"}</p>
          </div>
        )}
        <AnimatePresence initial={false}>
          {filtered.map((article, i) => (
            <motion.a key={article.id} href={article.url || "#"} target="_blank" rel="noopener noreferrer"
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className="group block border-b border-line/50 px-3 py-2.5 transition hover:bg-white/[0.03] last:border-b-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-start gap-2">
                    <div className={`mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full ${article.sentiment === "positive" ? "bg-emerald-400" : article.sentiment === "negative" ? "bg-red-400" : "bg-slate-600"}`} />
                    <p className="line-clamp-2 text-[12px] font-medium leading-snug text-slate-200 group-hover:text-slate-100">{article.title}</p>
                  </div>
                  {article.summary && <p className="ml-3.5 line-clamp-1 text-[11px] text-slate-500">{article.summary}</p>}
                  <div className="mt-1.5 h-0.5 w-full overflow-hidden rounded-full bg-white/[0.05]">
                    <div className={`h-full rounded-full ${article.sentiment_score > 0.1 ? "bg-emerald-500" : article.sentiment_score < -0.1 ? "bg-red-500" : "bg-slate-600"}`}
                      style={{ width: `${Math.abs(article.sentiment_score) * 100}%` }} />
                  </div>
                  <div className="ml-0.5 mt-1.5 flex items-center gap-2 text-[10px] text-slate-600">
                    <span className="font-mono">{article.symbol}</span><span>·</span>
                    <span>{article.source}</span>
                    {article.published_at && <><span>·</span><span>{article.published_at.slice(0, 16)}</span></>}
                  </div>
                </div>
                <div className="flex flex-shrink-0 flex-col items-end gap-1.5">
                  <SentimentBadge sentiment={article.sentiment} score={article.sentiment_score} />
                  {article.url && <ExternalLink size={11} className="text-slate-700 transition group-hover:text-slate-400" />}
                </div>
              </div>
            </motion.a>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
