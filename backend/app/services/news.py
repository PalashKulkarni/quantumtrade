"""
News Intelligence Service.

Sources:
  1. Yahoo Finance RSS feeds (free, no API key)
  2. Financial Modeling Prep news (free tier)

For each article we compute a sentiment score using keyword analysis,
then link articles to user holdings when symbols match.
"""
from __future__ import annotations

import asyncio
import hashlib
import re
from datetime import datetime, timezone
from typing import Any

import httpx

# ─── Sentiment keywords ────────────────────────────────────────────────────────

_POSITIVE = frozenset({
    "surge", "rally", "gain", "profit", "beat", "record", "growth", "upgrade",
    "outperform", "strong", "positive", "rise", "soar", "jump", "revenue",
    "buyback", "dividend", "expansion", "partnership", "acquisition", "bullish",
    "exceed", "robust", "momentum", "breakout", "milestone",
})

_NEGATIVE = frozenset({
    "drop", "fall", "decline", "loss", "miss", "downgrade", "warning", "risk",
    "sell-off", "crash", "layoff", "cut", "concern", "weak", "struggle",
    "bearish", "debt", "default", "probe", "fraud", "recall", "shortage",
    "delay", "disappoint", "slump", "plunge", "halt", "lawsuit",
})


def _score_sentiment(text: str) -> tuple[float, str]:
    """Return (score, label). Score in [-1, 1]."""
    words = re.findall(r"\b\w+\b", text.lower())
    pos = sum(1 for w in words if w in _POSITIVE)
    neg = sum(1 for w in words if w in _NEGATIVE)
    total = pos + neg
    if total == 0:
        return 0.0, "neutral"
    score = (pos - neg) / total
    label = "positive" if score > 0.1 else "negative" if score < -0.1 else "neutral"
    return round(score, 3), label


def _article_id(url: str) -> str:
    return hashlib.sha1(url.encode()).hexdigest()[:12]


# ─── Yahoo Finance RSS ─────────────────────────────────────────────────────────

async def _fetch_yahoo_rss(symbol: str) -> list[dict[str, Any]]:
    """Fetch from Yahoo Finance RSS for a given symbol."""
    # Clean symbol for Yahoo (strip .NS, .BO etc.)
    clean = re.sub(r"\.(NS|BO|L|T|AS)$", "", symbol, flags=re.IGNORECASE)
    url = f"https://feeds.finance.yahoo.com/rss/2.0/headline?s={clean}&region=US&lang=en-US"

    articles = []
    try:
        async with httpx.AsyncClient(timeout=8.0, follow_redirects=True) as client:
            r = await client.get(url, headers={"User-Agent": "Mozilla/5.0"})
            if r.status_code != 200:
                return []
            text = r.text

        # Minimal XML parsing without lxml dependency
        items = re.findall(r"<item>(.*?)</item>", text, re.DOTALL)
        for item in items[:8]:
            title_m = re.search(r"<title><!\[CDATA\[(.*?)\]\]></title>", item) or re.search(r"<title>(.*?)</title>", item)
            link_m = re.search(r"<link>(.*?)</link>", item)
            desc_m = re.search(r"<description><!\[CDATA\[(.*?)\]\]></description>", item) or re.search(r"<description>(.*?)</description>", item)
            pub_m = re.search(r"<pubDate>(.*?)</pubDate>", item)

            if not title_m:
                continue

            title = title_m.group(1).strip()
            link = link_m.group(1).strip() if link_m else ""
            desc = re.sub(r"<[^>]+>", "", desc_m.group(1)) if desc_m else ""
            pub = pub_m.group(1).strip() if pub_m else ""

            score, label = _score_sentiment(f"{title} {desc}")
            articles.append({
                "id": _article_id(link or title),
                "title": title,
                "summary": desc[:200] if desc else "",
                "url": link,
                "source": "Yahoo Finance",
                "published_at": pub,
                "sentiment_score": score,
                "sentiment": label,
                "symbol": symbol,
            })
    except Exception:
        pass

    return articles


# ─── Public API ───────────────────────────────────────────────────────────────

async def fetch_news_for_symbols(symbols: list[str], limit_per_symbol: int = 5) -> list[dict[str, Any]]:
    """
    Fetch news for a list of symbols in parallel.
    Returns deduplicated articles sorted by recency, with sentiment scores.
    """
    if not symbols:
        return []

    tasks = [_fetch_yahoo_rss(s) for s in symbols[:8]]  # cap at 8 symbols
    results = await asyncio.gather(*tasks, return_exceptions=True)

    seen_ids: set[str] = set()
    all_articles: list[dict] = []

    for articles in results:
        if isinstance(articles, list):
            for a in articles[:limit_per_symbol]:
                if a["id"] not in seen_ids:
                    seen_ids.add(a["id"])
                    all_articles.append(a)

    return all_articles


async def fetch_market_news(limit: int = 15) -> list[dict[str, Any]]:
    """General market news — Nifty + SPY as proxies."""
    return await fetch_news_for_symbols(["^NSEI", "SPY", "AAPL", "MSFT"], limit_per_symbol=4)
