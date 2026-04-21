import requests

login_data = {
    "email": "test@example.com", 
    "password": "password123"
}
res = requests.post("http://localhost:8001/api/candidate/login", json=login_data)
token = res.json().get('data', {}).get('access_token')

if not token:
    print("Login failed")
    exit(1)

res = requests.get("http://localhost:8001/api/candidate/profile", headers={"Authorization": f"Bearer {token}"})
print(f"Status: {res.status_code}")
if res.status_code == 200:
    print("Profile fetch successful!")
    data = res.json()
    print(f"Keys in response: {list(data.keys())}")
    if 'candidate_data' in data:
        cd = data['candidate_data']
        print(f"Candidate Name: {cd['first_name']} {cd['last_name']}")
        print(f"Experience count: {len(cd.get('experience', []))}")
else:
    print(res.text)
