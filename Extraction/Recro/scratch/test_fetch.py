import requests

login_data = {
    "email": "test@example.com",
    "password": "password123"
}
res = requests.post("http://localhost:8001/api/candidate/login", json=login_data)
token = res.json().get('data', {}).get('access_token')

jd_id = "1774009c"
res = requests.get(f"http://localhost:8001/api/candidate/application/{jd_id}", headers={"Authorization": f"Bearer {token}"})
print(res.status_code)
if res.status_code == 200:
    print("Fetch successful!")
    import json
    # print(json.dumps(res.json(), indent=2))
else:
    print(res.text)
