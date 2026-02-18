import socket
import psycopg2

HOST = "db.wlfwtwhojwckhqwcrujg.supabase.co"
PORTS = [5432, 6543]
PASS = "SpyDD@246819"

def test_tcp():
    print(f"Resolving {HOST}...")
    try:
        # Get address info (IPv4/IPv6)
        addr_info = socket.getaddrinfo(HOST, 5432)
        print(f"Address info: {addr_info}")
    except Exception as e:
        print(f"DNS Error: {e}")
        return

    for port in PORTS:
        print(f"\nTesting TCP connection to {HOST}:{port}...")
        try:
            # Try to connect (socket.create_connection handles IPv6 if supported)
            sock = socket.create_connection((HOST, port), timeout=5)
            print(f"SUCCESS: TCP connection established to port {port}!")
            sock.close()
            return port # Return the first working port
        except Exception as e:
            print(f"TCP Connect Failed to port {port}: {e}")
    return None

def run_sql(port):
    print(f"\nAttempting Postgres authentication on port {port}...")
    try:
        conn = psycopg2.connect(
            host=HOST,
            user="postgres",
            password=PASS,
            dbname="postgres",
            port=port,
            connect_timeout=10,
            sslmode="require"
        )
        print("AUTH SUCCESS! Connected to DB.")

        with open("supabase/migrations/provider_session_auth.sql", "r") as f:
            sql = f.read()

        with conn.cursor() as cur:
            cur.execute(sql)
            conn.commit()
            print("SQL EXECUTION SUCCESS!")
        conn.close()

    except Exception as e:
        print(f"Postgres Error: {e}")

if __name__ == "__main__":
    working_port = test_tcp()
    if working_port:
        run_sql(working_port)
    else:
        print("Could not establish TCP connection to any port.")
