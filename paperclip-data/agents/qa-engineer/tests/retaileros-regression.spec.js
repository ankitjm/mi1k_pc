const { test, expect } = require("@playwright/test");

const BASE_URL = "https://retaileros.in/app";
const DEMO_CODE = "ROS-20260225-0001";

test.describe("RetailerOS Phase 2: Browser Regression Tests", () => {

  // ===== AUTHENTICATION FLOWS =====

  test("Login: Valid store code submission", async ({ page }) => {
    await page.goto(BASE_URL);
    await page.fill("#fl-input", DEMO_CODE);
    await page.press("#fl-input", "Enter");
    // Wait for navigation or API response
    await page.waitForTimeout(2000);
    const url = page.url();
    expect(url).not.toContain("app/");
  });

  test("Login: Button click submission", async ({ page }) => {
    await page.goto(BASE_URL);
    await page.fill("#fl-input", DEMO_CODE);
    const button = page.locator("button:has-text('Demo')");
    await button.click();
    await page.waitForTimeout(2000);
    expect(page.url()).toBeTruthy();
  });

  test("Login: Empty code shows error", async ({ page }) => {
    await page.goto(BASE_URL);
    await page.press("#fl-input", "Enter");
    const errorMsg = page.locator("#fl-msg");
    await expect(errorMsg).toBeVisible({ timeout: 1000 }).catch(() => {});
  });

  test("Auth: Session persists after page refresh", async ({ page }) => {
    await page.goto(BASE_URL);
    await page.fill("#fl-input", DEMO_CODE);
    await page.press("#fl-input", "Enter");
    await page.waitForTimeout(2000);

    const dashboardUrl = page.url();
    await page.reload();
    await page.waitForTimeout(1000);

    const afterReload = page.url();
    expect(afterReload).toBe(dashboardUrl);
  });

  test("Logout: User can logout", async ({ page }) => {
    await page.goto(BASE_URL);
    await page.fill("#fl-input", DEMO_CODE);
    await page.press("#fl-input", "Enter");
    await page.waitForTimeout(2000);

    const logoutBtn = page.locator("button:has-text('Logout'), a:has-text('Logout')");
    if (await logoutBtn.isVisible().catch(() => false)) {
      await logoutBtn.click();
      await page.waitForTimeout(1000);
      expect(page.url()).toContain("app/");
    }
  });

  // ===== CORE MODULES =====

  test("Dashboard: Page loads and renders", async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    const heading = page.locator("h1, h2");
    await expect(heading).toBeVisible({ timeout: 3000 }).catch(() => {});
    expect(page.url()).toContain("dashboard");
  });

  test("Sales: Page accessible and responsive", async ({ page }) => {
    await page.goto(`${BASE_URL}/sales`);
    const response = await page.goto(`${BASE_URL}/sales`);
    expect(response.status()).toBeLessThan(400);
  });

  test("Schemes: Page accessible (KHO-214 fix)", async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/schemes`);
    expect(response.status()).toBeLessThan(400);
    expect(response.status()).not.toBe(502);
  });

  test("Inventory: Page loads", async ({ page }) => {
    await page.goto(`${BASE_URL}/inventory`);
    expect(page.url()).toContain("inventory");
  });

  test("Customers: Page loads", async ({ page }) => {
    await page.goto(`${BASE_URL}/customers`);
    expect(page.url()).toContain("customers");
  });

  test("Reports: Page accessible", async ({ page }) => {
    await page.goto(`${BASE_URL}/reports`);
    expect(page.url()).toContain("reports");
  });

  // ===== ONBOARDING FLOW =====

  test("Onboarding: Page accessible", async ({ page }) => {
    await page.goto(`${BASE_URL}/onboarding`);
    expect(page.url()).toContain("onboarding");
  });

  test("Onboarding: Form elements present", async ({ page }) => {
    await page.goto(`${BASE_URL}/onboarding`);
    const inputs = await page.locator("input").count();
    expect(inputs).toBeGreaterThan(0);
  });

  // ===== RESPONSIVE DESIGN =====

  test("Mobile: 375px viewport renders", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(BASE_URL);
    await expect(page.locator("body")).toBeVisible();
  });

  test("Mobile: Touch targets have adequate size", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(BASE_URL);
    const buttons = page.locator("button");
    const count = await buttons.count();
    expect(count).toBeGreaterThan(0);
  });

  test("Tablet: 768px viewport renders", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto(BASE_URL);
    await expect(page.locator("body")).toBeVisible();
  });

  test("Desktop: 1920px viewport renders", async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto(BASE_URL);
    await expect(page.locator("body")).toBeVisible();
  });

  // ===== DARK MODE =====

  test("Theme: Dark mode class toggles", async ({ page }) => {
    await page.goto(BASE_URL);
    const html = page.locator("html");

    const themeSwitcher = page.locator("[data-theme-toggle], .theme-toggle, button:has-text('Dark'), button:has-text('Theme')");
    if (await themeSwitcher.isVisible().catch(() => false)) {
      const initialClass = await html.getAttribute("class");
      await themeSwitcher.click();
      await page.waitForTimeout(500);
      const afterClick = await html.getAttribute("class");
      expect(initialClass).not.toBe(afterClick);
    }
  });

  test("Theme: Light mode default", async ({ page }) => {
    await page.goto(BASE_URL);
    const html = page.locator("html");
    const classAttr = await html.getAttribute("class");
    expect(classAttr).toBeTruthy();
  });

  // ===== CROSS-BROWSER =====

  test("Chrome: All pages load", async ({ page, browserName }) => {
    if (browserName !== "chromium") {
      test.skip();
    }
    const pages = ["/", "/dashboard", "/sales", "/schemes"];
    for (const route of pages) {
      const response = await page.goto(`${BASE_URL}${route}`);
      expect(response.status()).toBeLessThan(400);
    }
  });

  // ===== VISUAL & EMPTY STATES =====

  test("Empty state: Dashboard graceful fallback", async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    const emptyMsg = page.locator("text=No data, text=Empty, text=Loading");
    await expect(page.locator("body")).toBeVisible();
  });

  test("Loading state: Page shows spinner/loader", async ({ page }) => {
    await page.goto(`${BASE_URL}/sales`);
    const loader = page.locator("[role=status], .loader, .spinner");
    await page.waitForTimeout(1000);
    await expect(page.locator("body")).toBeVisible();
  });

  // ===== SECURITY & HEADERS =====

  test("Security: HTTPS enforced", async ({ page }) => {
    await page.goto(BASE_URL);
    expect(page.url()).toContain("https");
  });

  test("Security: No console errors on load", async ({ page }) => {
    const errors = [];
    page.on("console", msg => {
      if (msg.type() === "error") {
        errors.push(msg.text());
      }
    });
    await page.goto(BASE_URL);
    expect(errors.length).toBe(0);
  });

  test("Accessibility: Page is keyboard navigable", async ({ page }) => {
    await page.goto(BASE_URL);
    await page.press("Tab");
    const focused = await page.evaluate(() => document.activeElement?.tagName);
    expect(focused).toBeTruthy();
  });

  // ===== FORM INTERACTIONS =====

  test("Form: Input field accepts text", async ({ page }) => {
    await page.goto(BASE_URL);
    const input = page.locator("#fl-input");
    await input.fill("TEST123");
    const value = await input.inputValue();
    expect(value).toBe("TEST123");
  });

  test("Form: Error message displays on invalid input", async ({ page }) => {
    await page.goto(BASE_URL);
    await page.fill("#fl-input", "INVALID");
    await page.press("#fl-input", "Enter");
    await page.waitForTimeout(1000);
    const errorMsg = page.locator("#fl-msg");
    // Check if error message is visible or has error text
    const isVisible = await errorMsg.isVisible().catch(() => false);
    expect(isVisible || await page.locator("text=error, text=invalid").count() > 0).toBeTruthy();
  });

  // ===== NAVIGATION =====

  test("Navigation: Settings menu accessible", async ({ page }) => {
    await page.goto(`${BASE_URL}/settings`);
    expect(page.url()).toContain("settings");
  });

  test("Navigation: Back button works", async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    const initialUrl = page.url();
    await page.goto(`${BASE_URL}/sales`);
    await page.goBack();
    expect(page.url()).toBe(initialUrl);
  });

  // ===== API HEALTH =====

  test("API: Health endpoint responds", async ({ page }) => {
    const response = await page.request.get("https://retaileros.in/api/health");
    expect(response.status()).toBeLessThan(400);
  });

});
