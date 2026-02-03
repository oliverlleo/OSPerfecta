from playwright.sync_api import sync_playwright, expect
import json

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()

    # Scenario 1: Access Public Link -> Expect Login Modal (Data Hidden)
    mock_token = "token-123"
    url = f"http://localhost:8080/relatorio.html?slug={mock_token}"

    # Mock RPC for validation
    def handle_rpc(route):
        url = route.request.url
        print(f"Intercepted RPC: {url}")
        if "validar_credenciais_prestador" in url:
            # Check payload
            data = route.request.post_data_json
            if data.get('p_login') == "valid_user" and data.get('p_senha') == "1234":
                route.fulfill(status=200, content_type="application/json", body="true")
            else:
                route.fulfill(status=200, content_type="application/json", body="false")
        elif "get_work_order_by_token" in url:
             route.fulfill(
                status=200,
                content_type="application/json",
                body=json.dumps({
                    "work_order": {"os_number": 555},
                    "client": {"name": "Secret Client"},
                    "location": {"name": "Secret Loc"},
                    "responsible": {"name": "Secret Resp"},
                    "service_type": {"name": "Secret Type"}
                })
            )
        else:
            route.continue_()

    page.route("**/rpc/*", handle_rpc)

    # We navigate to 'about:blank' first to access localStorage/sessionStorage of the domain if needed
    # But localhost is distinct. We can just navigate to the page, wait for load, THEN clear storage if we want to simulate fresh start.
    # However, incognito/new_page starts empty.

    print("Step 1: Navigating to Public Link without session...")
    page.goto(url)

    # Verify Modal is Visible
    expect(page.locator("#modalLoginPrestador")).to_be_visible()

    # Verify Data is NOT Visible (or at least empty)
    # The container 'dadosOS' might be visible but empty, or 'numeroOS' empty.
    expect(page.locator("#numeroOS")).to_be_empty()

    print("Step 2: Entering Invalid Credentials...")
    page.fill("#prestadorLogin", "wrong")
    page.fill("#prestadorSenha", "0000")
    page.click("#btnEntrarPrestador")

    expect(page.locator("#erroLoginPrestador")).to_be_visible()
    expect(page.locator("#modalLoginPrestador")).to_be_visible()

    print("Step 3: Entering Valid Credentials...")
    page.fill("#prestadorLogin", "valid_user")
    page.fill("#prestadorSenha", "1234")
    page.click("#btnEntrarPrestador")

    # Verify Modal Disappears
    expect(page.locator("#modalLoginPrestador")).not_to_be_visible()

    # Verify Data Loaded
    # Wait for the text to appear. Using expect() with to_contain_text handles waiting.
    print("Waiting for data to load...")
    expect(page.locator("#numeroOS")).to_contain_text("#555")
    expect(page.locator("#clienteOS")).to_contain_text("Secret Client")

    print("Verification Successful!")
    page.screenshot(path="verification/provider_login_flow.png")
    browser.close()

with sync_playwright() as p:
    run(p)
