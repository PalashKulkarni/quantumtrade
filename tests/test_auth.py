"""Auth router tests."""
import pytest

pytestmark = pytest.mark.asyncio


async def test_register_success(client):
    r = await client.post("/api/auth/register", json={
        "email": "new@test.com", "name": "New User", "password": "password123"
    })
    assert r.status_code == 201
    data = r.json()
    assert "access_token" in data
    assert data["user"]["email"] == "new@test.com"
    assert data["user"]["plan"] == "free"


async def test_register_duplicate_email(client):
    payload = {"email": "dup@test.com", "name": "Dup", "password": "password123"}
    await client.post("/api/auth/register", json=payload)
    r = await client.post("/api/auth/register", json=payload)
    assert r.status_code == 409


async def test_register_weak_password(client):
    r = await client.post("/api/auth/register", json={
        "email": "weak@test.com", "name": "Weak", "password": "short"
    })
    assert r.status_code == 422


async def test_login_success(auth_client):
    client, user = auth_client
    # Remove auth header to test login fresh
    r = await client.post("/api/auth/login", json={
        "email": user["email"], "password": "testpass123"
    }, headers={})
    assert r.status_code == 200
    assert "access_token" in r.json()


async def test_login_wrong_password(client):
    await client.post("/api/auth/register", json={
        "email": "lp@test.com", "name": "LP", "password": "correctpass"
    })
    r = await client.post("/api/auth/login", json={
        "email": "lp@test.com", "password": "wrongpass"
    })
    assert r.status_code == 401


async def test_me_authenticated(auth_client):
    client, user = auth_client
    r = await client.get("/api/auth/me")
    assert r.status_code == 200
    assert r.json()["email"] == user["email"]


async def test_me_unauthenticated(client):
    r = await client.get("/api/auth/me")
    assert r.status_code == 401


async def test_onboarding(auth_client):
    client, _ = auth_client
    r = await client.post("/api/auth/onboarding", json={
        "risk_tolerance": "moderate",
        "investment_experience": "intermediate",
        "preferred_currency": "INR",
        "preferred_markets": "NSE,NASDAQ"
    })
    assert r.status_code == 200
    assert r.json()["user"]["onboarding_complete"] is True
    assert r.json()["user"]["risk_tolerance"] == "moderate"


async def test_refresh_token(auth_client):
    client, _ = auth_client
    r = await client.post("/api/auth/refresh")
    assert r.status_code == 200
    assert "access_token" in r.json()
