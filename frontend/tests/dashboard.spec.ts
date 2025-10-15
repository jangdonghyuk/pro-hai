// tests/dashboard.spec.ts
import { test, expect } from "@playwright/test";

test.describe("대시보드 기능", () => {
  let testUser: any;

  test.beforeEach(async ({ page }) => {
    // 매번 새 사용자로 로그인
    const timestamp = Date.now();
    testUser = {
      name: `테스트유저${timestamp}`,
      email: `test${timestamp}@example.com`,
      password: "password123",
    };

    // 회원가입 후 로그인
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

  test("사용자 정보 표시 확인", async ({ page }) => {
    await expect(page.locator(`text=${testUser.name}`)).toBeVisible();
    await expect(page.locator(`text=${testUser.email}`)).toBeVisible();
  });

  test("헬스체크 기능", async ({ page }) => {
    await page.click('button:has-text("헬스체크 실행")');

    // 성공 또는 실패 메시지 확인
    await expect(page.locator(".bg-green-50, .bg-red-50")).toBeVisible();
  });
});
