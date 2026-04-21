import json
from fastapi.testclient import TestClient
from main_api import app

client = TestClient(app)

login_data = {
    "email": "test@example.com",
    "password": "password123"
}
res = client.post("/api/candidate/login", json=login_data)
token = res.json().get('data', {}).get('access_token')

payload = {
    "first_name": "Jane",
    "last_name": "Doe",
    "mobile": "1234567890",
    "profile_details": {"gender":"", "city":"", "state":"", "permanent_address":"", "pincode":"", "nationality":"", "linkedin_url":""},
    "education": [],
    "certificates": [],
    "experiences": [{
        "total_experience": 0,
        "relevent_experience": 0,
        "current_company": "N/A",
        "current_job_title": "N/A",
        "notice_period": "",
        "current_ctc": 0,
        "expected_ctc": 0,
        "location_preference": "",
        "open_to_relocate": True
    }]
}

try:
    res = client.post("/api/candidate/apply/1774009c", headers={"Authorization": f"Bearer {token}"}, files={"payload": (None, json.dumps(payload))})
    print(res.status_code, res.text)
except Exception as e:
    import traceback
    traceback.print_exc()
