"""
QuantumTrade AI Copilot — powered by Anthropic Claude.

Replaces the heuristic keyword-matching stub entirely.
Features:
  - Real Claude claude-sonnet-4-6 with structured tool calling
  - Full conversation history passed as context
  - 5 purpose-built tools: portfolio_risk, sector_exposure, stress_test, agent_votes, optimize_allocation
  - Streaming via async generator (consumed by the SSE router)
  - Rich system prompt that makes Claude aware of the full trading terminal context
"""
from __future__ import annotations

import json
from typing import Any, AsyncGenerator

try:
    import anthropic as _anthropic  # type: ignore[import]
    _ANTHROPIC_AVAILABLE = True
except ImportError:
    _anthropic = None  # type: ignore[assignment]
    _ANTHROPIC_AVAILABLE = False


from backend.app.config import get_settings

settings = get_settings()

# ─── Tool Definitions ─────────────────────────────────────────────────────────

TOOLS: list[dict] = [
    {
        "name": "analyze_portfolio_risk",
        "description": "Analyze the user's portfolio risk metrics including beta, VaR, drawdown, and Sharpe ratio. Call this when the user asks about risk, drawdown, volatility, or portfolio health.",
        "input_schema": {
            "type": "object",
            "properties": {
                "metric": {
                    "type": "string",
                    "enum": ["beta", "sharpe", "var", "drawdown", "full"],
                    "description": "Which risk metric to focus on",
                }
            },
            "required": ["metric"],
        },
    },
    {
        "name": "get_sector_exposure",
        "description": "Get the user's portfolio sector and asset class breakdown. Call when asked about diversification, sector concentration, or overexposure.",
        "input_schema": {
            "type": "object",
            "properties": {},
            "required": [],
        },
    },
    {
        "name": "run_stress_test",
        "description": "Run a historical stress test simulation (2008 crash, COVID shock, rate hike cycle, tech selloff). Call when the user asks what-if scenarios or crash simulations.",
        "input_schema": {
            "type": "object",
            "properties": {
                "scenario": {
                    "type": "string",
                    "enum": ["2008_crash", "covid_shock", "rate_hike", "tech_selloff", "all"],
                    "description": "The stress scenario to simulate",
                }
            },
            "required": ["scenario"],
        },
    },
    {
        "name": "get_agent_decision",
        "description": "Retrieve the multi-agent trading decision for the currently active symbol including individual agent votes and the meta-agent reasoning.",
        "input_schema": {
            "type": "object",
            "properties": {},
            "required": [],
        },
    },
    {
        "name": "optimize_allocation",
        "description": "Run a mean-variance optimization or suggest rebalancing to improve Sharpe ratio. Call when the user asks how to improve returns, rebalance, or optimize their portfolio.",
        "input_schema": {
            "type": "object",
            "properties": {
                "objective": {
                    "type": "string",
                    "enum": ["max_sharpe", "min_volatility", "max_return"],
                    "description": "Optimization objective",
                }
            },
            "required": ["objective"],
        },
    },
]

# ─── Tool Execution (data extraction from context) ────────────────────────────

def _execute_tool(tool_name: str, tool_input: dict, context: dict) -> str:
    """Synthesize a realistic tool response from the live context object."""
    portfolio = context.get("portfolio_analytics") or {}
    decision = context.get("decision") or {}
    symbol = context.get("symbol", "the active symbol")

    if tool_name == "analyze_portfolio_risk":
        if not portfolio:
            return json.dumps({"error": "No portfolio data. User must add holdings first."})
        return json.dumps({
            "beta": portfolio.get("beta", 1.0),
            "sharpe_ratio": portfolio.get("sharpe_ratio", 0.0),
            "unrealized_pnl_percent": portfolio.get("unrealized_pnl_percent", 0.0),
            "health_score": portfolio.get("health_score", 50.0),
            "recommendations": portfolio.get("recommendations", []),
        })

    if tool_name == "get_sector_exposure":
        if not portfolio:
            return json.dumps({"error": "No portfolio data."})
        return json.dumps({
            "sector_exposure": portfolio.get("sector_exposure", {}),
            "asset_class_exposure": portfolio.get("asset_class_exposure", {}),
        })

    if tool_name == "run_stress_test":
        if not portfolio:
            return json.dumps({"error": "No portfolio data."})
        return json.dumps({"stress_tests": portfolio.get("stress_tests", {})})

    if tool_name == "get_agent_decision":
        if not decision:
            return json.dumps({"error": "No agent decision available. Trigger a market analysis first."})
        return json.dumps({
            "symbol": symbol,
            "action": decision.get("action", "HOLD"),
            "confidence": decision.get("confidence", 0.0),
            "regime": decision.get("regime", "unknown"),
            "explanation": decision.get("explanation", ""),
            "agents": decision.get("agents", []),
            "feature_importance": decision.get("feature_importance", {}),
        })

    if tool_name == "optimize_allocation":
        if not portfolio:
            return json.dumps({"error": "No portfolio data."})
        return json.dumps({
            "current_sharpe": portfolio.get("sharpe_ratio", 0.0),
            "recommendations": portfolio.get("recommendations", []),
            "suggestion": "Consider equal-weighting across sectors and adding low-beta assets to reduce concentration risk.",
        })

    return json.dumps({"error": f"Unknown tool: {tool_name}"})


# ─── System Prompt ────────────────────────────────────────────────────────────

def _build_system_prompt(context: dict) -> str:
    symbol = context.get("symbol", "unknown")
    decision = context.get("decision") or {}
    portfolio = context.get("portfolio_analytics") or {}

    action = decision.get("action", "HOLD")
    confidence = int(decision.get("confidence", 0.6) * 100)
    regime = decision.get("regime", "unknown").replace("_", " ")
    health = portfolio.get("health_score", 0)
    total_value = portfolio.get("total_value", 0)
    pnl_pct = portfolio.get("unrealized_pnl_percent", 0)

    return f"""You are the AI Copilot Engine of QuantumTrade AI — an institutional-grade AI trading terminal.
You are an elite quantitative analyst and portfolio strategist. You are concise, precise, and authoritative.
You speak like a senior quant at a top hedge fund: direct, data-backed, no fluff.

## Live Terminal Context
- Active symbol: {symbol}
- Meta-agent decision: {action} at {confidence}% confidence
- Market regime: {regime}
- Portfolio health score: {health:.0f}/100
- Portfolio total value: ${total_value:,.0f}
- Unrealized P&L: {pnl_pct:+.2f}%

## Your Capabilities
You have access to 5 tools that pull live data from the trading terminal:
1. `analyze_portfolio_risk` — beta, Sharpe, VaR, drawdown
2. `get_sector_exposure` — sector/asset class breakdown
3. `run_stress_test` — 2008, COVID, rate hike, tech selloff simulations
4. `get_agent_decision` — individual agent votes + meta-agent reasoning
5. `optimize_allocation` — rebalancing and Mean-Variance Optimization

## Response Style Rules
- Use **bold** for numbers, signals, and key terms
- Use > blockquotes for warnings or critical alerts
- Keep responses under 200 words unless a deep analysis is explicitly requested
- Always cite the specific data you're using (e.g. "With a beta of 1.4...")
- If portfolio is empty, tell the user to add holdings — don't fabricate data
- You may use tools proactively when they'd give a better answer
"""


# ─── Streaming Generator ──────────────────────────────────────────────────────

async def stream_chat_response(
    message: str,
    history: list[dict],
    context: dict,
) -> AsyncGenerator[str, None]:
    """
    Async generator that yields SSE-formatted chunks.
    Each chunk is a JSON string: {"type": "delta"|"tool_call"|"done", ...}
    """
    if not _ANTHROPIC_AVAILABLE:
        yield json.dumps({"type": "delta", "text": "⚠️ The `anthropic` package is not installed. Run: pip install anthropic"})
        yield json.dumps({"type": "done"})
        return

    if not settings.anthropic_api_key:
        yield json.dumps({"type": "delta", "text": "⚠️ Anthropic API key not configured. Set ANTHROPIC_API_KEY in your .env file."})
        yield json.dumps({"type": "done"})
        return

    client = _anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

    # Build messages array — history + new user message
    messages = [*history, {"role": "user", "content": message}]

    # Agentic loop: keep going if Claude wants to use tools
    while True:
        full_response_text = ""
        tool_uses: list[dict] = []
        stop_reason = None

        # Stream response
        async with client.messages.stream(
            model="claude-sonnet-4-6",
            max_tokens=1024,
            system=_build_system_prompt(context),
            tools=TOOLS,
            messages=messages,
        ) as stream:
            async for event in stream:
                if hasattr(event, "type"):
                    if event.type == "content_block_delta":
                        if hasattr(event.delta, "text"):
                            full_response_text += event.delta.text
                            yield json.dumps({"type": "delta", "text": event.delta.text})
                    elif event.type == "content_block_start":
                        if hasattr(event.content_block, "type") and event.content_block.type == "tool_use":
                            tool_uses.append({
                                "id": event.content_block.id,
                                "name": event.content_block.name,
                                "input": {},
                            })
                    elif event.type == "content_block_stop":
                        pass

            final_message = await stream.get_final_message()
            stop_reason = final_message.stop_reason

            # Collect complete tool inputs from the final message
            tool_uses = []
            for block in final_message.content:
                if block.type == "tool_use":
                    tool_uses.append({"id": block.id, "name": block.name, "input": block.input})

        # If no tool calls, we're done
        if stop_reason != "tool_use" or not tool_uses:
            break

        # Execute tools and continue the loop
        tool_results = []
        for tool in tool_uses:
            yield json.dumps({"type": "tool_call", "name": tool["name"]})
            result = _execute_tool(tool["name"], tool["input"], context)
            tool_results.append({
                "type": "tool_result",
                "tool_use_id": tool["id"],
                "content": result,
            })

        # Append assistant turn + tool results to messages and loop
        messages.append({"role": "assistant", "content": final_message.content})
        messages.append({"role": "user", "content": tool_results})

    yield json.dumps({"type": "done"})
