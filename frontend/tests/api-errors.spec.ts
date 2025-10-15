import { test, expect } from "@playwright/test";

test.describe("API 에러 테스트", () => {
  let testUser: any;

  test.beforeEach(async ({ page }) => {
    const timestamp = Date.now();
    testUser = {
      name: `api${timestamp}`,
      email: `api${timestamp}@example.com`,
      password: "password123",
    };

    // 로그인 준비
    await page.goto("/register");
    await page.fill('[name="name"]', testUser.name);
    await page.fill('[name="email"]', testUser.email);
    await page.fill('[name="password"]', testUser.password);
    await page.fill('[name="confirmPassword"]', testUser.password);
    await page.click('button[type="submit"]');
    await page.waitForURL("/login");

    await page.fill('[name="email"]', testUser.email);
    await page.fill('[name="password"]', testUser.password);
    await page.click('button[type="submit"]');
    await page.waitForURL("/dashboard");
  });

  test("헬스체크 API 서버 에러", async ({ page }) => {
    // API 500 에러 시뮬레이션
    await page.route("**/health", (route) => {
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Internal Server Error" }),
      });
    });

    await page.click('button:has-text("헬스체크 실행")');
    await expect(page.locator(".bg-red-50")).toBeVisible();
    await expect(page.locator("text=에러:")).toBeVisible();
  });

  test("헬스체크 API 네트워크 에러", async ({ page }) => {
    // 네트워크 연결 실패 시뮬레이션
    await page.route("**/health", (route) => {
      route.abort("failed");
    });

    await page.click('button:has-text("헬스체크 실행")');
    await expect(page.locator(".bg-red-50")).toBeVisible();
  });

  test("관리자 페이지 API 로딩 실패", async ({ page }) => {
    // 관리자 API 에러 시뮬레이션
    await page.route("**/activity-log/admin/**", (route) => {
      route.fulfill({
        status: 403,
        contentType: "application/json",
        body: JSON.stringify({ error: "Forbidden" }),
      });
    });

    await page.goto("/admin");
    // 에러 상태 확인 (구체적인 에러 표시 방식에 따라 조정)
    await page.waitForTimeout(2000);
  });
});
