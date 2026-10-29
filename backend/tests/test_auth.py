from fastapi.testclient import TestClient


def test_health_check(client: TestClient):
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "opportunity-radar-api"


def test_register_success(client: TestClient):
    payload = {
        "email": "engineer@example.com",
        "password": "SecurePassword123!",
    }
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["user"]["email"] == "engineer@example.com"
    assert "access_token" in data["token"]
    assert data["token"]["token_type"] == "bearer"


def test_register_duplicate_email(client: TestClient):
    payload = {
        "email": "duplicate@example.com",
        "password": "SecurePassword123!",
    }
    # First registration
    r1 = client.post("/api/v1/auth/register", json=payload)
    assert r1.status_code == 201

    # Second registration with same email
    r2 = client.post("/api/v1/auth/register", json=payload)
    assert r2.status_code == 400
    assert "already exists" in r2.json()["detail"].lower()


def test_login_success_and_me(client: TestClient):
    # Register
    reg_payload = {
        "email": "login_user@example.com",
        "password": "ValidPassword99#",
    }
    client.post("/api/v1/auth/register", json=reg_payload)

    # Login
    login_resp = client.post(
        "/api/v1/auth/login",
        json={"email": "login_user@example.com", "password": "ValidPassword99#"},
    )
    assert login_resp.status_code == 200
    token = login_resp.json()["token"]["access_token"]
    assert token is not None

    # Get /me
    me_resp = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_resp.status_code == 200
    assert me_resp.json()["email"] == "login_user@example.com"
    assert me_resp.json()["has_profile"] is False


def test_login_invalid_password(client: TestClient):
    reg_payload = {
        "email": "auth_test@example.com",
        "password": "Password123!",
    }
    client.post("/api/v1/auth/register", json=reg_payload)

    # Attempt with wrong password
    login_resp = client.post(
        "/api/v1/auth/login",
        json={"email": "auth_test@example.com", "password": "WrongPassword!"},
    )
    assert login_resp.status_code == 401
