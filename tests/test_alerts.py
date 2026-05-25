"""Alerts router tests."""
import pytest

pytestmark = pytest.mark.asyncio


async def test_create_alert(auth_client):
    client, _ = auth_client
    r = await client.post("/api/alerts", json={
        "symbol": "RELIANCE.NS",
        "condition": "above",
        "target_price": 3000.0
    })
    assert r.status_code == 201
    data = r.json()
    assert data["symbol"] == "RELIANCE.NS"
    assert data["is_active"] is True


async def test_create_alert_missing_price(auth_client):
    client, _ = auth_client
    r = await client.post("/api/alerts", json={
        "symbol": "AAPL",
        "condition": "above"
    })
    assert r.status_code == 422


async def test_list_alerts(auth_client):
    client, _ = auth_client
    await client.post("/api/alerts", json={
        "symbol": "TCS.NS", "condition": "below", "target_price": 3000.0
    })
    r = await client.get("/api/alerts")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


async def test_delete_alert(auth_client):
    client, _ = auth_client
    create = await client.post("/api/alerts", json={
        "symbol": "INFY.NS", "condition": "above", "target_price": 2000.0
    })
    alert_id = create.json()["id"]
    r = await client.delete(f"/api/alerts/{alert_id}")
    assert r.status_code == 204
    # Verify gone
    alerts = await client.get("/api/alerts")
    ids = [a["id"] for a in alerts.json()]
    assert alert_id not in ids


async def test_delete_other_users_alert(auth_client, client):
    client1, _ = auth_client
    # Create alert as user1
    create = await client1.post("/api/alerts", json={
        "symbol": "WIPRO.NS", "condition": "above", "target_price": 500.0
    })
    alert_id = create.json()["id"]

    # Register user2 and try to delete
    reg = await client.post("/api/auth/register", json={
        "email": "user2@test.com", "name": "User2", "password": "password123"
    })
    token2 = reg.json()["access_token"]
    r = await client.delete(f"/api/alerts/{alert_id}",
                            headers={"Authorization": f"Bearer {token2}"})
    assert r.status_code == 404


async def test_alerts_require_auth(client):
    r = await client.get("/api/alerts")
    assert r.status_code == 401
