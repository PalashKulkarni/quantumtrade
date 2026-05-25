"""Portfolio router tests."""
import pytest

pytestmark = pytest.mark.asyncio


async def test_get_empty_portfolio(auth_client):
    client, _ = auth_client
    r = await client.get("/api/portfolio")
    assert r.status_code == 200
    data = r.json()
    assert "holdings" in data
    assert "cash_balance" in data


async def test_set_and_get_holdings(auth_client):
    client, _ = auth_client
    holdings = [
        {"ticker": "RELIANCE.NS", "quantity": 10, "average_price": 2800.0, "sector": "Energy"},
        {"ticker": "TCS.NS", "quantity": 5, "average_price": 3500.0, "sector": "Technology"},
    ]
    r = await client.post("/api/portfolio/holdings", json=holdings)
    assert r.status_code == 200
    data = r.json()
    assert len(data["holdings"]) == 2
    tickers = [h["ticker"] for h in data["holdings"]]
    assert "RELIANCE.NS" in tickers
    assert "TCS.NS" in tickers


async def test_portfolio_requires_auth(client):
    r = await client.get("/api/portfolio")
    assert r.status_code == 401


async def test_set_holdings_replaces_all(auth_client):
    client, _ = auth_client
    await client.post("/api/portfolio/holdings", json=[
        {"ticker": "AAPL", "quantity": 10, "average_price": 180.0}
    ])
    r = await client.post("/api/portfolio/holdings", json=[
        {"ticker": "MSFT", "quantity": 5, "average_price": 400.0}
    ])
    assert r.status_code == 200
    tickers = [h["ticker"] for h in r.json()["holdings"]]
    assert "AAPL" not in tickers
    assert "MSFT" in tickers
