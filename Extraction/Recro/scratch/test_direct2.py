import json
import requests

login_data = {
    "email": "test@example.com",
    "password": "password123"
}
res = requests.post("http://localhost:8001/api/candidate/login", json=login_data)
token = res.json().get('data', {}).get('access_token')

payload = {
    "first_name": "Jane",
    "last_name": "Doe",
    "mobile": "1234567890",
    "profile_details": {"gender":"", "city":"", "state":"", "permanent_address":"", "pincode":"", "nationality":"", "linkedin_url":""},
    "education": [
        {"highest_qualification": "BS", "degree_name": "BSc CS", "university": "MIT", "start_month": 1, "end_month": 12, "start_year": 2020, "end_year": 2024, "score": 85.0}
    ],
    "certificates": [
        {"name": "AWS", "provider": "Amazon", "year": 2024}
    ],
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
    res = requests.post("http://localhost:8001/api/candidate/apply/1774009c", headers={"Authorization": f"Bearer {token}"}, files={"payload": (None, json.dumps(payload)), 'resume': ('dummy.pdf', b'hello', 'application/pdf'), 'certificates': ('dummy2.pdf', b'cert', 'application/pdf')})
    print(res.status_code, res.text)
except Exception as e:
    import traceback
    traceback.print_exc()

