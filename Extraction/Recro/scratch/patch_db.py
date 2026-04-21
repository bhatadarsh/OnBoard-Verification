import sys
import os
sys.path.append(os.path.abspath('.'))

from config.settings import settings
from sqlalchemy import create_engine, text

def run():
    print("Database URL:", settings.postgres_uri)
    engine = create_engine(settings.postgres_uri)
    with engine.begin() as conn:
        try:
            conn.execute(text("ALTER TABLE applications ADD COLUMN ai_intelligence JSON;"))
            print("Successfully added ai_intelligence to applications table.")
        except Exception as e:
            print(f"Error (maybe already exists?): {e}")

if __name__ == '__main__':
    run()
