import logging
import sys


def configure_logging():
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        handlers=[logging.StreamHandler(sys.stdout)],
    )
    # Quiet noisy libs
    for noisy in ("uvicorn.access", "httpx", "yfinance", "peewee"):
        logging.getLogger(noisy).setLevel(logging.WARNING)
