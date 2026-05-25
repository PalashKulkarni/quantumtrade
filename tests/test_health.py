"""Health + smoke tests."""
import pytest

pytestmark = pytest.mark.asyncio


async def test_health(client):
    r = await client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"
    assert r.json()["version"] == "0.3.0"


async def test_protected_routes_require_auth(client):
    for route in ["/api/portfolio", "/api/alerts", "/api/chat/history"]:
        r = await client.get(route)
        assert r.status_code == 401, f"{route} should require auth"
