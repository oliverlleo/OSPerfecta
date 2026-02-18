import requests
import json

PROJECT_REF = "wlfwtwhojwckhqwcrujg"
TOKEN = "sbp_c0f84aac195663e7c26ec424f9c69c6bd231251f"
SQL_FILE = "supabase/migrations/provider_session_auth.sql"

def execute_final():
    try:
        with open(SQL_FILE, 'r') as f:
            sql_content = f.read()
    except FileNotFoundError:
        print("SQL file not found.")
        return

    # Try standard management API endpoints
    endpoints = [
        f"https://api.supabase.com/v1/projects/{PROJECT_REF}/query",
        f"https://api.supabase.com/v1/projects/{PROJECT_REF}/sql",
        f"https://api.supabase.io/v1/projects/{PROJECT_REF}/query",
        f"https://api.supabase.io/v1/projects/{PROJECT_REF}/sql"
    ]

    headers = {
        "Authorization": f"Bearer {TOKEN}",
        "Content-Type": "application/json"
    }

    payload = {"query": sql_content}

    success = False
    for url in endpoints:
        print(f"Trying {url}...")
        try:
            response = requests.post(url, headers=headers, json=payload, timeout=10)
            if response.status_code in [200, 201]:
                print("SUCCESS! SQL Executed.")
                print(response.text)
                success = True
                break
            else:
                print(f"Failed: {response.status_code}")
                # print(response.text)
        except Exception as e:
            print(f"Error connecting to {url}: {e}")

    if not success:
        print("\nAll HTTP attempts failed.")

if __name__ == "__main__":
    execute_final()
