# In-memory user database (replace with real database in production)
# Structure: {email: {id, name, email, role, status, hashed_password}}
users_db = {}
user_id_counter = 1

# Structure: {job_id: JobDescription}
jd_db = {}

# Structure: list of Resume objects
resume_db = []
