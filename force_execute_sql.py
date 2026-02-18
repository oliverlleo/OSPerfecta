import psycopg2
import sys

DB_HOST = "db.wlfwtwhojwckhqwcrujg.supabase.co"
DB_USER = "postgres"
DB_PASS = "sbp_c0f84aac195663e7c26ec424f9c69c6bd231251f"
DB_NAME = "postgres"
DB_PORT = "5432"

SQL_FILE = "supabase/migrations/provider_session_auth.sql"

def execute():
    try:
        print(f"Connecting to {DB_HOST}:{DB_PORT} as {DB_USER}...")

        # Connect directly to Postgres
        conn = psycopg2.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASS,
            dbname=DB_NAME,
            port=DB_PORT,
            connect_timeout=15,
            sslmode='require' # Supabase requires SSL
        )

        print("Connected successfully!")

        with open(SQL_FILE, 'r') as f:
            sql_content = f.read()

        with conn.cursor() as cur:
            print("Executing SQL migration...")
            cur.execute(sql_content)
            conn.commit()
            print("Migration executed successfully!")

        conn.close()

    except Exception as e:
        print(f"FAILED to execute SQL: {e}")
        # Try Transaction Pooler port if direct fails (6543)
        if str(DB_PORT) == "5432":
             print("\nRetrying with port 6543 (Transaction Pooler)...")
             try:
                 conn = psycopg2.connect(
                    host=DB_HOST,
                    user=DB_USER,
                    password=DB_PASS,
                    dbname=DB_NAME,
                    port="6543",
                    connect_timeout=15,
                    sslmode='require'
                )
                 print("Connected successfully on port 6543!")
                 with open(SQL_FILE, 'r') as f:
                    sql_content = f.read()
                 with conn.cursor() as cur:
                     cur.execute(sql_content)
                     conn.commit()
                     print("Migration executed successfully via pooler!")
                 conn.close()
             except Exception as e2:
                 print(f"FAILED on port 6543 too: {e2}")

if __name__ == "__main__":
    execute()
