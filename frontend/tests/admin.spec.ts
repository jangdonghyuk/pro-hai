// tests/admin.spec.ts
import { test, expect } from "@playwright/test";

test.describe("관리자 페이지", () => {
  let testUser: any;

  test.beforeEach(async ({ page }) => {
    // 로그인 준비
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

  test("관리자 페이지 접근 및 데이터 로딩", async ({ page }) => {
    await page.goto("/");
    await page.click('a:has-text("관리자 페이지")');
    await page.waitForURL("/admin");

    await expect(page.locator('h1:has-text("활동 로그 관리")')).toBeVisible();

    // 통계 카드 로딩 확인
    await page.waitForSelector(".grid", { timeout: 10000 });
  });

  test("필터 기능", async ({ page }) => {
    await page.goto("/admin");

    // 이벤트 타입 필터
    await page.selectOption("select", "page_view");

    // 필터 초기화
    await page.click('button:has-text("필터 초기화")');
    await expect(page.locator("select")).toHaveValue("");
  });
});
