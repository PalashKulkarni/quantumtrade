"""
QuantumTrade Mock AI Copilot.

Delivers a realistic, streaming AI experience without any external API.
- Category detection via keyword matching
- 10+ unique institutional-quality responses per category
- Randomised selection so repeated questions feel fresh
- Async token-by-token streaming with realistic delays
- Simulated tool calls so the frontend badges animate correctly
"""
from __future__ import annotations

import asyncio
import json
import random
import re
from typing import AsyncGenerator

# ─── Response library ─────────────────────────────────────────────────────────

RESPONSES: dict[str, list[str]] = {
    "portfolio_drop": [
        "Your portfolio has declined due to a combination of macro headwinds and sector rotation. **Rising US Treasury yields** are compressing equity valuations across growth-heavy allocations, and your Technology weighting amplifies that effect. The beta-adjusted drawdown of **{pct}%** is within normal parameters for your risk profile — this is volatility, not structural impairment.\n\n> **Recommendation:** Avoid panic-selling. The mean-reversion signal on your largest positions is strengthening. Review your stop-loss levels and consider trimming overweight sectors by 5–8% to rebalance toward your target allocation.",
        "The drop is attributable to **systematic risk factors** rather than idiosyncratic stock issues. Broad market beta exposure accounts for approximately 70% of the move. Your Sharpe ratio of **{sharpe}** indicates the portfolio is still generating acceptable risk-adjusted returns over a 12-month horizon.\n\n**Key drivers:**\n- Macro repricing of rate expectations\n- FII outflows from emerging markets\n- Sector rotation from growth to value\n\nThis is a normal correction phase. Your **stress test results** show resilience even in the 2008-equivalent scenario.",
        "Portfolio drawdowns of this magnitude are well within the **historical distribution** for diversified equity portfolios. Your maximum drawdown of **{pct}%** compares favourably to the Nifty 50's {pct2}% drawdown over the same period.\n\n> The risk engine flags **no structural issues** with your portfolio construction. Consider this a tax-loss harvesting opportunity — selling losers to offset gains while maintaining economic exposure via correlated instruments.",
        "Three factors explain the decline:\n\n1. **Valuation compression** — P/E multiples contracting as yields rise\n2. **Earnings revision cycle** — Q3 guidance cuts across IT and consumer staples\n3. **Currency headwinds** — INR depreciation squeezing import-heavy sectors\n\nYour **beta of {beta}** means you'll experience ~{pct}% of market moves in both directions. The portfolio is behaving exactly as modelled. No rebalancing is warranted until sector deviations exceed 15% from target.",
        "The decline reflects **global risk-off sentiment** triggered by central bank hawkishness. Historically, portfolios with your allocation profile recover to prior peaks within **47–90 trading days** following similar drawdowns.\n\n**Quantitative assessment:** The current drawdown is 0.8 standard deviations from the mean — statistically unremarkable. Your portfolio's **Sortino ratio** remains positive, indicating downside volatility is not disproportionate. Hold your positions and let the systematic rebalancing trigger naturally.",
    ],
    "market_crash": [
        "Running a **2008-equivalent stress test** on your current allocation:\n\n| Scenario | Estimated Impact |\n|---|---|\n| 2008 Financial Crisis | **-{pct}%** |\n| COVID-19 Shock (Mar 2020) | **-{pct2}%** |\n| Dot-com Bust (2000–2002) | **-{pct3}%** |\n| Rate Hike Cycle (2022) | **-{pct4}%** |\n\nYour **cash buffer and low-correlation assets** provide meaningful downside protection. The risk engine recommends maintaining at minimum 8% in short-duration instruments as a volatility dampener.",
        "In a **market crash scenario**, your portfolio's fate depends heavily on correlation structure. Currently, your holdings exhibit a **weighted average correlation of 0.68** with the broader index — moderate systemic exposure.\n\n> Portfolios with your beta profile historically experience **peak-to-trough drawdowns of 28–42%** during systemic crises. The good news: full recovery has occurred within 18–36 months in every post-war crash.\n\n**Defensive actions to consider:**\n- Increase gold allocation to 5–8%\n- Add short-duration government bonds\n- Reduce single-stock concentration above 8%",
        "Crash resilience is a function of **factor exposure**, not just diversification. Your portfolio's current factor loadings:\n\n- **Market beta:** High exposure — increases crash sensitivity\n- **Value factor:** Moderate — provides some crash buffer\n- **Quality factor:** Low — quality stocks tend to outperform in downturns\n- **Momentum:** Elevated — momentum strategies suffer in sharp reversals\n\nStrengthening your quality factor exposure would meaningfully improve crash resilience without sacrificing long-term return expectations.",
        "The **tail risk** in your portfolio is primarily driven by concentrated sector bets. In a -30% market scenario, your Technology holdings could decline **35–50%** due to higher beta and valuation sensitivity.\n\nHowever, your Financial sector holdings exhibit **negative correlation to tech** in crisis periods — providing a natural hedge. The net impact would be approximately -22% in an extreme scenario, well below a fully passive index exposure.",
        "Historical crash analysis shows your portfolio structure **outperforms the benchmark** in the recovery phase following corrections. Portfolios with strong free-cash-flow stocks and low leverage recover faster.\n\n> The AI engine identifies your top 3 most crash-resilient holdings as defensive anchors. Consider sizing these up to 15–18% combined weight as a structural hedge without altering your return target materially.",
    ],
    "sharpe": [
        "Your current **Sharpe ratio of {sharpe}** is {assessment}. Here's a structured path to improvement:\n\n**Immediate actions (0–30 days):**\n- Trim the 3 highest-volatility positions by 20% each\n- Rotate proceeds into low-beta, high-dividend quality stocks\n\n**Medium-term (30–90 days):**\n- Add 2–3 uncorrelated asset classes (REITs, gold, short bonds)\n- Rebalance sector weights to reduce concentration\n\nEach 0.1 improvement in Sharpe ratio represents a **meaningful enhancement in risk-adjusted compounding** over a 5-year horizon. Target Sharpe of 1.4+ is achievable with your current holdings mix.",
        "The Sharpe ratio measures **excess return per unit of risk**. At {sharpe}, your portfolio is {assessment} compared to institutional benchmarks (target: 1.0–2.0).\n\nThe primary drag on your Sharpe is **volatility concentration** — a few high-beta positions are inflating your denominator without proportionally increasing returns.\n\n**Optimisation levers:**\n1. Reduce position sizes in beta > 1.5 stocks\n2. Add negative-correlation assets\n3. Smooth return distribution through systematic rebalancing\n4. Consider a covered-call overlay on large positions to monetise volatility",
        "Improving Sharpe ratio requires attacking it from **both numerator and denominator**:\n\n**Increase returns (numerator):**\n- Tilt toward high-quality, compounding businesses\n- Reduce cash drag by deploying idle capital systematically\n\n**Reduce volatility (denominator):**\n- Diversify across sectors and geographies\n- Add mean-reverting assets to smooth the return series\n- Set position size limits at 8% maximum\n\nWith disciplined implementation, a Sharpe improvement of **0.3–0.5** is achievable within 6 months without materially changing your return targets.",
        "Your Sharpe ratio of **{sharpe}** tells a nuanced story. The risk-free rate used in the calculation is critical — at current Indian 10-year yields of ~7.2%, your excess return hurdle is meaningfully higher than historical norms.\n\n> **Actionable insight:** Your portfolio is generating alpha, but the volatility profile is suboptimal. The **Information Ratio** — which measures active return per unit of active risk — is a better metric for your strategy. It currently stands at approximately 0.8, which is institutionally acceptable.",
        "To optimise Sharpe ratio, the **Mean-Variance Optimisation** engine suggests the following target weights would maximise risk-adjusted return given your current universe:\n\n- Large-cap defensives: **35%** (up from current)\n- High-growth tech: **20%** (down from current)\n- Financial services: **25%** (maintain)\n- International exposure: **10%** (new addition)\n- Cash/bonds: **10%** (liquidity buffer)\n\nThis reallocation is estimated to improve Sharpe by **0.28** based on 5-year historical covariance matrices.",
    ],
    "sector_exposure": [
        "Your sector allocation analysis reveals **significant concentration risk**:\n\n| Sector | Current Weight | Benchmark | Deviation |\n|---|---|---|---|\n| Technology | High | 28% | Overweight |\n| Financials | Moderate | 22% | Neutral |\n| Healthcare | Low | 12% | Underweight |\n| Energy | Low | 8% | Underweight |\n\n> **Overweight Technology** increases portfolio sensitivity to rate changes and regulatory risk. Consider trimming to benchmark weight and rotating into Healthcare — a defensive sector with strong structural tailwinds.",
        "Sector exposure is your **primary source of systematic risk** right now. The heavy Technology tilt means your portfolio has approximately **2.1x** the rate sensitivity of a diversified index.\n\nA well-constructed multi-sector portfolio should have no single sector exceeding **25–30%** of total weight. Your current construction has meaningful rebalancing opportunity.\n\n**High-conviction sectors for the next 12 months:**\n- **Financials** — Net Interest Margin expansion benefits\n- **Healthcare** — Defensive characteristics + India's growing middle-class demand\n- **Consumer Staples** — Inflation pass-through and consistent FCF",
        "The sector exposure breakdown shows you're running a **high-beta, growth-tilted portfolio** — excellent in bull markets, vulnerable in corrections.\n\nFor institutional-quality portfolio construction, target:\n- **Cyclicals:** 40–50% (tech, consumer discretionary)\n- **Defensives:** 30–40% (healthcare, staples, utilities)\n- **Value plays:** 15–25% (financials, energy)\n\nYour current defensive allocation is likely below target. Adding **2–3 quality defensive names** would reduce portfolio beta without sacrificing meaningful return potential.",
        "Sector correlation analysis reveals your holdings are **more correlated than they appear** on the surface. Despite spanning multiple sectors, the underlying factor exposures — particularly **growth, momentum, and quality** — overlap significantly.\n\nTrue diversification requires **factor diversification**, not just sector diversification. The AI engine recommends incorporating at least one **value-tilted** and one **low-volatility** factor bet to genuinely reduce portfolio-level risk.",
        "Your sector exposure creates **three key risk concentrations:**\n\n1. **Regulatory risk** — Technology sector faces ongoing scrutiny\n2. **Rate sensitivity** — Growth stocks reprice sharply when yields rise\n3. **Earnings cyclicality** — Multiple sectors tied to the same economic cycle\n\nThe recommended **sector hedge strategy** would be to add a 5% allocation to a inverse-correlated sector ETF during high-volatility periods, preserving upside while limiting tail risk.",
    ],
    "risk": [
        "Your portfolio's **risk profile assessment:**\n\n- **Beta:** {beta} — {beta_assessment} market sensitivity\n- **VaR (95%, 1-day):** Approximately {var}% of portfolio value\n- **Max Drawdown (12M):** {drawdown}%\n- **Volatility (annualised):** {vol}%\n\nThe **risk engine rates your portfolio** as Moderate-Aggressive. For your stated risk tolerance, the current construct is appropriate — though the tail risk metrics suggest adding a small defensive allocation would improve the risk-reward profile.",
        "Risk analysis breaks into **systematic vs idiosyncratic components:**\n\n**Systematic (market) risk — {systematic}% of total risk:**\nDriven by broad market beta. Cannot be diversified away — only hedged.\n\n**Idiosyncratic (stock-specific) risk — {idiosyncratic}% of total risk:**\nReducible through diversification. Adding 3–5 uncorrelated positions would reduce this meaningfully.\n\n> **Key insight:** Your diversification ratio is {div_ratio} — you're retaining more idiosyncratic risk than necessary. A more diversified construction would not sacrifice expected returns.",
        "The **risk dashboard** flags three areas requiring attention:\n\n1. **Concentration risk** — Top 3 positions represent >40% of portfolio. Standard institutional limit is 25%.\n2. **Correlation clustering** — Multiple holdings exhibit >0.75 correlation. Effective diversification is lower than nominal.\n3. **Drawdown asymmetry** — Recent drawdowns are recovering slower than historical averages, suggesting regime change.\n\n**Priority action:** Reduce position sizing in highest-correlation cluster and deploy capital into lower-beta names.",
        "From a **quantitative risk management** perspective, your portfolio is operating within acceptable parameters but approaching concentration thresholds:\n\n- Herfindahl-Hirschman Index (HHI): **0.18** — moderate concentration\n- Information Ratio: **0.72** — below institutional threshold of 1.0\n- Tracking Error vs Nifty 50: **8.4%** — high active risk\n\nThe elevated tracking error suggests you're taking meaningful active bets. Ensure each active position has a clear, differentiated thesis with defined entry/exit criteria.",
        "Your **tail risk exposure** is the most important metric to monitor. Value-at-Risk and Expected Shortfall indicate:\n\n- On **1 in 20 days**, you can expect a loss exceeding {var}%\n- In the **worst 5% of scenarios**, average loss is approximately {es}%\n\nThese are within normal ranges for an equity-heavy portfolio. However, the **fat-tail distribution** of equity returns means actual extreme losses can exceed model estimates. Maintain your stop-loss discipline and position sizing rules as a practical hedge against model risk.",
    ],
    "buy_stock": [
        "Before executing a purchase, the AI engine runs a **6-factor pre-trade checklist:**\n\n✅ **Valuation** — Is the stock trading below intrinsic value?\n✅ **Momentum** — Is price action confirming the fundamental thesis?\n✅ **Sector context** — Is the sector in a favourable macro regime?\n⚠️ **Position sizing** — Would this exceed 8% concentration limit?\n✅ **Liquidity** — Sufficient market depth for your position size?\n✅ **Correlation** — Does this add to or reduce portfolio diversification?\n\nBased on current market conditions, the systematic signal for most quality large-caps is **neutral to mildly bullish** — appropriate for scaling into positions on dips.",
        "A structured **stock analysis framework** should include:\n\n**Quantitative factors:**\n- P/E relative to sector median and 5-year own history\n- Revenue and earnings growth trajectory (3-year CAGR)\n- Free Cash Flow yield vs risk-free rate\n- Return on Equity consistency\n\n**Technical confirmation:**\n- Price above 200-day moving average\n- RSI not in overbought territory (>70)\n- Volume confirmation on breakouts\n\nEntry timing matters less than **position sizing and conviction level**. Averaging into positions over 2–4 tranches reduces timing risk significantly.",
        "The **optimal entry strategy** for any new position involves:\n\n1. **Thesis validation** — Can you articulate why this stock beats the market in 2 sentences?\n2. **Price target** — What's the 12-18 month fair value? Define your upside.\n3. **Stop loss** — At what price level is the thesis invalidated?\n4. **Position size** — Start at 50% of target size, complete on confirmation.\n\n> Never deploy full conviction on day one. The market will give you a better entry in 80% of cases if you wait for technical confirmation.",
        "From a **portfolio construction perspective**, any new stock purchase should be evaluated not just on standalone merit but on its **marginal contribution to the portfolio**:\n\n- Does it reduce overall portfolio volatility?\n- Does it increase the Sharpe ratio?\n- Is it correlated with existing holdings?\n- Does it fill a sector gap?\n\nThe best stock purchases are those that **improve the portfolio as a whole**, not just add a promising individual name.",
        "Before buying, consider the **full lifecycle of the trade:**\n\n**Entry:** At what price and with what conviction level?\n**Hold:** What events would strengthen or weaken the thesis?\n**Exit:** Define both profit target AND stop-loss before entering\n**Review:** Set a calendar reminder to reassess in 90 days\n\nInstitutional investors outperform not because of better stock picks, but because of **superior process and discipline**. The AI engine recommends never placing a trade without all four of these defined.",
    ],
    "diversification": [
        "True diversification is a **multi-dimensional concept** that goes beyond holding many stocks:\n\n**Dimensions of diversification:**\n- Geographic (India, US, International)\n- Sector (Cyclical, Defensive, Financial)\n- Factor (Value, Growth, Quality, Momentum)\n- Asset Class (Equity, Debt, Gold, REITs)\n- Market Cap (Large, Mid, Small)\n\nA portfolio diversified across all five dimensions has historically shown **30–40% lower volatility** than a single-country, single-sector equity portfolio with the same expected return.",
        "Your current **diversification score** based on the correlation matrix analysis:\n\n- **Sector diversification:** Moderate — overweight growth sectors\n- **Factor diversification:** Low — high loading on momentum and quality\n- **Geographic diversification:** Minimal — predominantly India-centric\n- **Asset class diversification:** Low — near-100% equity\n\n> Adding a **10–15% international allocation** (US large-cap or global ETF) would meaningfully reduce India-specific political and macro risk while maintaining return potential.",
        "The **mathematics of diversification** shows that you capture most diversification benefits with 15–20 carefully selected uncorrelated stocks. Beyond 30 stocks, incremental diversification benefit diminishes rapidly while complexity increases.\n\nYour portfolio currently has {n_holdings} holdings. The **optimal number for your risk profile** is 18–22, with position sizes varying between 3–10% based on conviction and risk contribution.",
        "Modern Portfolio Theory suggests your portfolio lies **inside the efficient frontier** — meaning there exists a portfolio with the same expected return and lower risk, or higher return with the same risk.\n\nThe path to the frontier involves:\n1. Eliminating highly correlated holdings\n2. Adding assets with negative or zero correlation\n3. Sizing positions by **risk contribution** rather than equal weight\n4. Rebalancing quarterly to maintain target weights\n\nThe AI engine estimates a 0.15–0.25 Sharpe ratio improvement is achievable through better diversification alone.",
        "**International diversification** is the most underutilised tool in Indian retail portfolios. The correlation between Nifty 50 and S&P 500 has averaged only **0.42** over the past decade — meaning US exposure genuinely diversifies India risk.\n\nRecommended international allocation:\n- **US large-cap (S&P 500 equivalent):** 8–10%\n- **Emerging Markets ex-India:** 3–5%\n- **Developed market value:** 2–3%\n\nTotal international: **13–18%** — significantly improves global risk distribution.",
    ],
    "volatility": [
        "Portfolio volatility is currently **{vol}% annualised** — this is {vol_assessment} for a diversified equity portfolio.\n\n**Volatility decomposition:**\n- Market (systematic) volatility: ~{sys_vol}%\n- Idiosyncratic (stock-specific) volatility: ~{idio_vol}%\n- Correlation effects: ~{corr_vol}%\n\n> **Key insight:** Your idiosyncratic volatility is higher than expected for your level of diversification. This suggests your holdings share latent factor exposures — particularly momentum and growth — that are not captured by standard sector analysis.",
        "**Implied vs Realised Volatility** tells an important story about your portfolio:\n\nWhen implied volatility (market's forward-looking estimate) is higher than realised volatility, the market is pricing in fear. Currently, this premium represents a **selling opportunity for options strategies** — though not recommended for most retail investors.\n\nFor long-only portfolios, elevated volatility environments favour:\n- Quality stocks with predictable earnings\n- Dividend payers with consistent cash flow\n- Stocks with low price-earnings correlation to macro factors",
        "Volatility management in a **long-only equity portfolio** is achieved through three mechanisms:\n\n1. **Diversification** — Reduce correlation-weighted volatility\n2. **Factor tilts** — Low-volatility factor has historically generated equity-like returns with 25% less vol\n3. **Rebalancing** — Systematic rebalancing captures volatility as a return source\n\nYour current rebalancing frequency appears to be **ad-hoc** rather than systematic. Implementing quarterly rebalancing with 5% drift thresholds would improve risk management meaningfully.",
        "The **VIX correlation** with your portfolio performance reveals important regime dynamics. When VIX is above 25, your portfolio historically underperforms by an annualised 8% — suggesting elevated beta exposure.\n\n**Volatility regime positioning strategy:**\n- Low vol (VIX < 15): Maintain current allocation, add momentum exposure\n- Medium vol (VIX 15–25): Reduce beta, increase quality factor\n- High vol (VIX > 25): Shift to defensive allocation, increase cash buffer\n\nProactive regime-based allocation is the hallmark of institutional risk management.",
        "**Realised volatility clustering** — the tendency for high-vol periods to follow high-vol periods — is a well-documented market phenomenon. Your portfolio's recent volatility uptick suggests you may be entering a more turbulent regime.\n\nQuantitatively, a **GARCH model** fitted to your portfolio returns suggests annualised volatility may remain elevated at 20–28% for the next 4–6 weeks before mean-reverting.\n\n> **Tactical action:** This is not a signal to de-risk entirely, but rather to avoid adding new high-beta positions until volatility normalises. Let the portfolio's existing positions work through the turbulence.",
    ],
    "optimise": [
        "Running **Mean-Variance Optimisation** on your current holdings:\n\n**Optimal weights (Sharpe-maximising):**\n- Reduce your 3 highest-beta positions by 15–20% each\n- Increase allocation to your highest-Sharpe individual contributors\n- Add a 10% allocation to uncorrelated assets\n\nEstimated outcome:\n- Expected return: **+0.8% annualised** improvement\n- Volatility: **-3.2% annualised** reduction\n- Sharpe ratio: **+0.31** improvement\n\nNote: Optimisation results are sensitive to input assumptions. Use as a directional guide, not a precise prescription.",
        "Portfolio optimisation has **three distinct objectives** — choose the one aligned with your goals:\n\n1. **Sharpe Maximisation** — Best risk-adjusted return. Recommended for most investors.\n2. **Minimum Variance** — Lowest possible volatility. For capital preservation focus.\n3. **Maximum Return** — Highest expected return. Accepts maximum volatility.\n\nFor your stated **moderate-aggressive risk profile**, Sharpe Maximisation is the appropriate objective. The AI engine's optimal portfolio for this objective is estimated to have a Sharpe of **1.4–1.6** — materially above current levels.",
        "The **Black-Litterman model** — the gold standard for institutional portfolio optimisation — combines market equilibrium returns with your specific views to produce stable, investable portfolios.\n\nKey inputs for your portfolio:\n- Market equilibrium weights (derived from Nifty 50 capitalisation)\n- Your overweights represent implicit bullish views on those sectors\n- The model penalises excessive deviation from equilibrium\n\nThe output suggests your **Technology overweight is the most significant active bet** — ensure this is a deliberate, high-conviction view rather than accidental drift.",
        "**Factor optimisation** is often more effective than pure return optimisation:\n\nBy targeting specific factor exposures rather than individual stock weights, you achieve:\n- More stable portfolios (factors mean-revert, individual stocks don't)\n- Better out-of-sample performance\n- Clearer risk attribution\n\nTarget factor portfolio for your objectives:\n- **Quality:** 35% weight\n- **Value:** 25% weight\n- **Low Volatility:** 20% weight\n- **Momentum:** 20% weight\n\nThis factor blend has historically delivered **Sharpe of 1.2–1.5** across market cycles.",
        "The most impactful **portfolio improvement** often comes not from adding new positions but from **position sizing refinement**:\n\nCurrent estimated improvements available from resizing alone:\n- Reduce top 3 overweights → saves 40bps of unnecessary risk\n- Increase underweight high-Sharpe positions → adds 35bps of risk-adjusted return\n- Eliminate near-zero positions (< 1%) → reduces complexity with no return impact\n\nNet improvement: approximately **+0.22 Sharpe** from sizing changes alone. This is often more impactful than researching new stocks.",
    ],
    "general": [
        "That's a thoughtful question. From an **institutional investment perspective**, the key frameworks to apply here are:\n\n1. **Risk-adjusted thinking** — Always evaluate opportunities relative to the risk taken\n2. **Factor awareness** — Understand the underlying drivers of returns\n3. **Process discipline** — Consistent process beats brilliant-but-inconsistent decisions\n4. **Long-term compounding** — The mathematical power of avoiding large drawdowns\n\nThe AI engine is calibrated to institutional standards — feel free to ask more specific questions about your portfolio, market conditions, or investment strategy.",
        "Great question for the **quantitative investment framework**. The most important principle in institutional portfolio management is: **you can't manage what you don't measure**.\n\nKey metrics to track:\n- Sharpe ratio (risk-adjusted return)\n- Maximum drawdown (tail risk)\n- Beta (market sensitivity)\n- Information ratio (active management skill)\n\nAll of these are available in your portfolio analytics dashboard. Regular review of these metrics is the foundation of disciplined portfolio management.",
        "In **modern portfolio theory**, the most important insight is that risk and return are inseparable — but the *type* of risk matters enormously.\n\n- **Systematic risk** (market beta): Not compensated efficiently in long run\n- **Factor risk** (value, quality, momentum): Compensated over time with risk premium\n- **Idiosyncratic risk** (individual stocks): Not compensated — purely reducible through diversification\n\nThe goal is to eliminate uncompensated risks while deliberately taking compensated ones. Ask me about any specific aspect of your portfolio and I'll provide data-driven analysis.",
        "The **behavioural finance** perspective is equally important alongside quantitative models. The biggest threats to your long-term returns are likely:\n\n1. **Panic selling** during corrections (median cost: 2–4% annual return)\n2. **Overtrading** driven by news flow (transaction costs + tax drag)\n3. **Recency bias** — overweighting recent performance in forward expectations\n4. **Concentration from conviction** — holding too much in your 'best ideas'\n\nThe AI engine helps counteract these biases with data-driven, emotionless analysis. Trust the process.",
        "**Investment success** over a 10+ year horizon comes down to three things:\n\n1. **Asset allocation** — Drives 90%+ of return variation across portfolios\n2. **Costs** — Minimise transaction costs, taxes, and management fees\n3. **Behaviour** — Stay invested, rebalance systematically, avoid panic\n\nStock selection — what most investors focus on — drives less than 10% of long-term outcomes. Your energy is best spent on portfolio construction and risk management, which is exactly what this platform is designed to support.",
    ],
}

# ─── Tool simulation ──────────────────────────────────────────────────────────

# Maps keywords → which tool badge to show while "thinking"
TOOL_TRIGGERS: list[tuple[list[str], str]] = [
    (["risk", "drawdown", "beta", "var", "volatil", "sharpe", "health"], "analyze_portfolio_risk"),
    (["sector", "exposure", "concentration", "weight", "allocation"], "get_sector_exposure"),
    (["crash", "stress", "2008", "covid", "scenario", "what if"], "run_stress_test"),
    (["agent", "signal", "decision", "buy signal", "sell signal", "momentum"], "get_agent_decision"),
    (["optimis", "optimize", "rebalanc", "improve", "efficiency", "frontier"], "optimize_allocation"),
]


# ─── Category detection ───────────────────────────────────────────────────────

CATEGORY_KEYWORDS: list[tuple[str, list[str]]] = [
    ("portfolio_drop",  ["drop", "fell", "down", "decline", "loss", "lost", "why.*portfolio", "negative", "red"]),
    ("market_crash",    ["crash", "2008", "covid", "bear market", "recession", "crisis", "what if market", "collapse", "worst case"]),
    ("sharpe",          ["sharpe", "risk.adjusted", "return per", "improve return", "risk-adjusted"]),
    ("sector_exposure", ["sector", "exposure", "concentration", "overweight", "underweight", "diversif.*sector"]),
    ("risk",            ["risk", "beta", "drawdown", "var ", "value at risk", "downside", "tail risk"]),
    ("buy_stock",       ["buy", "purchase", "should i", "entry", "add.*position", "invest in", "pick"]),
    ("diversification", ["diversif", "correl", "uncorrelated", "too many", "too few", "spread"]),
    ("volatility",      ["volatility", "volatile", "vix", "swing", "fluctuat", "unstable", "lot of vol"]),
    ("optimise",        ["optimis", "optimiz", "rebalanc", "efficient frontier", "mean.variance", "improve portfolio"]),
]


def _detect_category(message: str) -> str:
    msg = message.lower()
    for category, patterns in CATEGORY_KEYWORDS:
        for pattern in patterns:
            if re.search(pattern, msg):
                return category
    return "general"


def _detect_tools(message: str) -> list[str]:
    msg = message.lower()
    triggered = []
    for keywords, tool_name in TOOL_TRIGGERS:
        if any(kw in msg for kw in keywords):
            triggered.append(tool_name)
            if len(triggered) >= 2:
                break
    # Always show at least one tool call to make it feel alive
    if not triggered:
        triggered = [random.choice(["analyze_portfolio_risk", "get_agent_decision"])]
    return triggered


def _fill_placeholders(text: str, context: dict) -> str:
    """Replace {placeholder} tokens with realistic demo values."""
    portfolio = context.get("portfolio_analytics") or {}
    decision = context.get("decision") or {}

    beta = portfolio.get("beta", round(random.uniform(0.85, 1.45), 2))
    sharpe = portfolio.get("sharpe_ratio", round(random.uniform(0.6, 1.4), 2))
    health = portfolio.get("health_score", round(random.uniform(55, 82), 1))
    total_val = portfolio.get("total_value", round(random.uniform(80000, 250000), 0))
    pnl_pct = abs(portfolio.get("unrealized_pnl_percent", round(random.uniform(2, 12), 2)))
    holdings = portfolio.get("sector_exposure", {})
    n_holdings = len(holdings) or random.randint(6, 14)

    sharpe_assessment = (
        "excellent" if sharpe > 1.5 else
        "good" if sharpe > 1.0 else
        "below the institutional benchmark of 1.0" if sharpe > 0.5 else
        "poor — significant optimisation required"
    )
    beta_assessment = "high" if beta > 1.3 else "moderate" if beta > 0.9 else "low"
    vol = round(random.uniform(14, 28), 1)
    vol_assessment = "elevated" if vol > 22 else "normal" if vol > 14 else "low"

    replacements = {
        "{pct}": f"{pnl_pct:.1f}",
        "{pct2}": f"{pnl_pct * 1.4:.1f}",
        "{pct3}": f"{pnl_pct * 2.1:.1f}",
        "{pct4}": f"{pnl_pct * 0.7:.1f}",
        "{sharpe}": f"{sharpe:.2f}",
        "{beta}": f"{beta:.2f}",
        "{assessment}": sharpe_assessment,
        "{beta_assessment}": beta_assessment,
        "{systematic}": f"{random.randint(55, 72)}",
        "{idiosyncratic}": f"{random.randint(18, 35)}",
        "{div_ratio}": f"{round(random.uniform(0.55, 0.78), 2)}",
        "{var}": f"{round(random.uniform(1.8, 3.5), 1)}",
        "{es}": f"{round(random.uniform(3.2, 5.8), 1)}",
        "{drawdown}": f"{round(random.uniform(8, 22), 1)}",
        "{vol}": f"{vol}",
        "{vol_assessment}": vol_assessment,
        "{sys_vol}": f"{round(vol * random.uniform(0.55, 0.68), 1)}",
        "{idio_vol}": f"{round(vol * random.uniform(0.22, 0.35), 1)}",
        "{corr_vol}": f"{round(vol * random.uniform(0.08, 0.18), 1)}",
        "{n_holdings}": str(n_holdings),
    }
    for placeholder, value in replacements.items():
        text = text.replace(placeholder, value)
    return text


# ─── Streaming generator ──────────────────────────────────────────────────────

async def stream_mock_response(
    message: str,
    history: list[dict],
    context: dict,
) -> AsyncGenerator[str, None]:
    """
    Async generator that streams mock AI responses token-by-token.
    Yields SSE-compatible JSON strings matching the real copilot format.
    """
    category = _detect_category(message)
    tools = _detect_tools(message)
    response_pool = RESPONSES.get(category, RESPONSES["general"])
    raw_response = random.choice(response_pool)
    response_text = _fill_placeholders(raw_response, context)

    # Emit tool calls first (with realistic delay)
    for tool in tools:
        await asyncio.sleep(random.uniform(0.3, 0.7))
        yield json.dumps({"type": "tool_call", "name": tool})

    # Pause after tool calls — simulates AI "thinking"
    await asyncio.sleep(random.uniform(0.4, 0.9))

    # Stream response word by word with variable delay
    words = response_text.split(" ")
    chunk_buffer = ""

    for i, word in enumerate(words):
        chunk_buffer += word + " "

        # Emit in small chunks of 1–4 words for natural feel
        chunk_size = random.randint(1, 4)
        if (i + 1) % chunk_size == 0 or i == len(words) - 1:
            yield json.dumps({"type": "delta", "text": chunk_buffer})
            chunk_buffer = ""

            # Variable delay: slower at start, faster mid-response, slight pause at punctuation
            if i < 8:
                delay = random.uniform(0.04, 0.09)
            elif word.endswith((".", "!", "?", "\n")):
                delay = random.uniform(0.08, 0.18)
            else:
                delay = random.uniform(0.02, 0.055)
            await asyncio.sleep(delay)

    yield json.dumps({"type": "done"})
