from dataclasses import dataclass


@dataclass(frozen=True)
class WalkForwardWindow:
    train_start: int
    train_end: int
    test_start: int
    test_end: int


def rolling_windows(length: int, train_size: int = 252, test_size: int = 63) -> list[WalkForwardWindow]:
    windows: list[WalkForwardWindow] = []
    start = 0
    while start + train_size + test_size <= length:
        windows.append(
            WalkForwardWindow(
                train_start=start,
                train_end=start + train_size,
                test_start=start + train_size,
                test_end=start + train_size + test_size,
            )
        )
        start += test_size
    return windows

