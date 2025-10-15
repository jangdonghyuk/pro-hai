import { test, expect } from "@playwright/test";

test.describe("회원가입 및 로그인", () => {
  const timestamp = Date.now();
  const testUser = {
    name: `테스트유저${timestamp}`,
    email: `test${timestamp}@example.com`,
    password: "password123",
  };

  test("회원가입부터 대시보드까지 전체 플로우", async ({ page }) => {
    // 1. 회원가입
    await page.goto("/register");
    await page.fill('[name="name"]', testUser.name);
    await page.fill('[name="email"]', testUser.email);
    await page.fill('[name="password"]', testUser.password);
    await page.fill('[name="confirmPassword"]', testUser.password);
    await page.click('button[type="submit"]');

    // 성공 페이지 확인
    await expect(page.locator("text=회원가입 완료!")).toBeVisible();
    await page.waitForURL("/login");

    // 2. 로그인
    await page.fill('[name="email"]', testUser.email);
    await page.fill('[name="password"]', testUser.password);
    await page.click('button[type="submit"]');
    await page.waitForURL("/dashboard");

    // 3. 대시보드 확인
    await expect(page.locator(`text=${testUser.name}`)).toBeVisible();
  });
});
