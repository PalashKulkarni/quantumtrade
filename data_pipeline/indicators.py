import numpy as np
import pandas as pd


def add_technical_indicators(frame: pd.DataFrame) -> pd.DataFrame:
    data = frame.copy()
    close = data["close"]
    high = data["high"]
    low = data["low"]
    volume = data["volume"]

    data["sma_20"] = close.rolling(20).mean()
    data["sma_50"] = close.rolling(50).mean()
    data["ema_12"] = close.ewm(span=12, adjust=False).mean()
    data["ema_20"] = close.ewm(span=20, adjust=False).mean()
    data["ema_26"] = close.ewm(span=26, adjust=False).mean()
    data["macd"] = data["ema_12"] - data["ema_26"]
    data["macd_signal"] = data["macd"].ewm(span=9, adjust=False).mean()
    data["rsi"] = rsi(close)
    rolling_std = close.rolling(20).std()
    data["bb_upper"] = data["sma_20"] + 2 * rolling_std
    data["bb_lower"] = data["sma_20"] - 2 * rolling_std
    data["vwap"] = (close * volume).cumsum() / volume.replace(0, np.nan).cumsum()
    data["atr"] = atr(high, low, close)
    data["obv"] = (np.sign(close.diff()).fillna(0) * volume).cumsum()
    data["stoch_rsi"] = stochastic_rsi(data["rsi"])
    data["momentum_10"] = close.pct_change(10)
    data["volatility_20"] = close.pct_change().rolling(20).std() * np.sqrt(252)
    data["fib_382"] = close.rolling(60).max() - 0.382 * (close.rolling(60).max() - close.rolling(60).min())
    data["fib_618"] = close.rolling(60).max() - 0.618 * (close.rolling(60).max() - close.rolling(60).min())
    return data.ffill().bfill()


def rsi(series: pd.Series, period: int = 14) -> pd.Series:
    delta = series.diff()
    gain = delta.clip(lower=0).rolling(period).mean()
    loss = -delta.clip(upper=0).rolling(period).mean()
    rs = gain / loss.replace(0, np.nan)
    return 100 - (100 / (1 + rs))


def atr(high: pd.Series, low: pd.Series, close: pd.Series, period: int = 14) -> pd.Series:
    previous_close = close.shift(1)
    true_range = pd.concat(
        [(high - low), (high - previous_close).abs(), (low - previous_close).abs()],
        axis=1,
    ).max(axis=1)
    return true_range.rolling(period).mean()


def stochastic_rsi(rsi_values: pd.Series, period: int = 14) -> pd.Series:
    lowest = rsi_values.rolling(period).min()
    highest = rsi_values.rolling(period).max()
    return (rsi_values - lowest) / (highest - lowest).replace(0, np.nan)

