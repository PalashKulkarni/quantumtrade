import numpy as np
import pandas as pd


def performance_metrics(equity: pd.Series, benchmark: pd.Series | None = None) -> dict[str, float]:
    returns = equity.pct_change().dropna()
    cumulative_return = equity.iloc[-1] / equity.iloc[0] - 1
    years = max(len(equity) / 252, 1 / 252)
    cagr = (equity.iloc[-1] / equity.iloc[0]) ** (1 / years) - 1
    volatility = returns.std() * np.sqrt(252)
    downside = returns[returns < 0].std() * np.sqrt(252)
    sharpe = (returns.mean() * 252) / volatility if volatility else 0.0
    sortino = (returns.mean() * 252) / downside if downside else 0.0
    drawdown = equity / equity.cummax() - 1
    win_rate = float((returns > 0).mean())
    beta = 1.0
    alpha = 0.0
    if benchmark is not None and len(benchmark) == len(equity):
        bench_returns = benchmark.pct_change().dropna()
        covariance = returns.cov(bench_returns)
        variance = bench_returns.var()
        beta = covariance / variance if variance else 1.0
        alpha = returns.mean() * 252 - beta * bench_returns.mean() * 252
    return {
        "cumulative_return": float(cumulative_return),
        "cagr": float(cagr),
        "sharpe_ratio": float(sharpe),
        "sortino_ratio": float(sortino),
        "max_drawdown": float(drawdown.min()),
        "alpha": float(alpha),
        "beta": float(beta),
        "volatility": float(volatility),
        "win_rate": win_rate,
        "profit_factor": float(returns[returns > 0].sum() / abs(returns[returns < 0].sum() or 1)),
    }

