import pandas as pd


REQUIRED_COLUMNS = ["open", "high", "low", "close", "volume"]


def validate_ohlcv(frame: pd.DataFrame) -> pd.DataFrame:
    missing = set(REQUIRED_COLUMNS) - set(frame.columns)
    if missing:
        raise ValueError(f"missing OHLCV columns: {sorted(missing)}")
    clean = frame.copy()
    clean.index = pd.to_datetime(clean.index, utc=True)
    clean = clean.sort_index()
    clean = clean[~clean.index.duplicated(keep="last")]
    clean[REQUIRED_COLUMNS] = clean[REQUIRED_COLUMNS].apply(pd.to_numeric, errors="coerce")
    clean = clean.dropna(subset=REQUIRED_COLUMNS)
    clean = clean[(clean["high"] >= clean["low"]) & (clean["volume"] >= 0)]
    return clean

