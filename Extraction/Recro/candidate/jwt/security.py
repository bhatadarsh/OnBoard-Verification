import os
from datetime import datetime, timedelta
from jose import jwt

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 # Token valid for 1 hour

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, "d2990fe34e25e0012e8312ea7aecd2202eae59a896410667612021fc60a018b5", algorithm=ALGORITHM)
    return encoded_jwt