from fastapi.testclient import TestClient


def get_authenticated_token(client: TestClient, email: str) -> str:
    payload = {"email": email, "password": "Password123!"}
    client.post("/api/v1/auth/register", json=payload)
    login_resp = client.post("/api/v1/auth/login", json=payload)
    return login_resp.json()["token"]["access_token"]


def test_profile_crud(client: TestClient):
    token = get_authenticated_token(client, "profile_dev@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Profile should initially be 404
    r_empty = client.get("/api/v1/profile", headers=headers)
    assert r_empty.status_code == 404

    # 2. Create profile
    create_payload = {
        "full_name": "Alex Mercer",
        "headline": "Full-Stack AI Engineer",
        "skills": ["Python", "FastAPI", "React", "TypeScript", "PostgreSQL"],
        "education": "B.S. in Computer Science, Stanford University",
        "experience_summary": "3 years building distributed AI and cloud platforms.",
        "links": {"github": "https://github.com/alexmercer", "linkedin": "https://linkedin.com/in/alexmercer"},
        "location": "San Francisco, CA",
        "remote_ok": True,
        "min_stipend": 4000.0,
        "min_freelance_budget": 5000.0,
        "opportunity_types": ["internship", "job", "freelance"],
        "keywords_include": ["ai agent", "fastapi", "react"],
        "keywords_exclude": ["php", "wordpress"],
        "match_threshold": 75,
    }
    r_create = client.post("/api/v1/profile", json=create_payload, headers=headers)
    assert r_create.status_code == 201
    data = r_create.json()
    assert data["full_name"] == "Alex Mercer"
    assert data["match_threshold"] == 75
    assert "FastAPI" in data["skills"]

    # 3. Get profile
    r_get = client.get("/api/v1/profile", headers=headers)
    assert r_get.status_code == 200
    assert r_get.json()["headline"] == "Full-Stack AI Engineer"

    # 4. Update profile
    update_payload = {
        "headline": "Lead AI Systems Architect",
        "match_threshold": 80,
    }
    r_update = client.put("/api/v1/profile", json=update_payload, headers=headers)
    assert r_update.status_code == 200
    assert r_update.json()["headline"] == "Lead AI Systems Architect"
    assert r_update.json()["match_threshold"] == 80


def test_resume_upload_and_onboarding(client: TestClient):
    token = get_authenticated_token(client, "onboarding_candidate@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    # Test raw text resume upload
    sample_resume = """
    Jane Doe
    Senior Backend & ML Engineer
    Email: jane@example.com | San Francisco, CA

    Skills: Python, FastAPI, Docker, PostgreSQL, React, Machine Learning, PyTorch, LangChain

    Experience:
    Software Engineer at TechCorp (2022 - Present)
    - Architected real-time indexing pipeline with PostgreSQL and vector search.
    - Built FastAPI microservices processing 1M events daily.

    Education:
    M.S. in Computer Science - University of California, Berkeley
    """
    
    r_parse = client.post(
        "/api/v1/onboarding/upload-resume",
        data={"raw_text": sample_resume},
        headers=headers,
    )
    assert r_parse.status_code == 200
    extracted = r_parse.json()
    assert "skills" in extracted
    assert len(extracted["skills"]) > 0
    assert "suggested_keywords" in extracted

    # Test completing onboarding
    complete_payload = {
        "full_name": extracted.get("full_name") or "Jane Doe",
        "headline": extracted.get("headline") or "Senior Backend & ML Engineer",
        "skills": extracted.get("skills", ["Python", "FastAPI"]),
        "education": extracted.get("education") or "UC Berkeley",
        "experience_summary": extracted.get("experience_summary") or "Built real-time pipelines",
        "links": {"github": "https://github.com/janedoe"},
        "location": "San Francisco, CA",
        "remote_ok": True,
        "opportunity_types": ["internship", "job", "freelance"],
        "keywords_include": ["backend", "fastapi"],
        "keywords_exclude": [],
        "match_threshold": 75,
    }
    r_complete = client.post(
        "/api/v1/onboarding/complete",
        json=complete_payload,
        headers=headers,
    )
    assert r_complete.status_code == 201
    assert r_complete.json()["full_name"] == complete_payload["full_name"]

    # Verify /me now reflects has_profile = True
    me_resp = client.get("/api/v1/auth/me", headers=headers)
    assert me_resp.json()["has_profile"] is True
