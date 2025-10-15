import { test, expect } from "@playwright/test";

test.describe("에러 처리 테스트", () => {
  test("중복 이메일 회원가입", async ({ page }) => {
    const timestamp = Date.now();
    const email = `duplicate${timestamp}@example.com`;

    // 첫 번째 사용자 가입
    await page.goto("/register");
    await page.fill('[name="name"]', "첫번째유저");
    await page.fill('[name="email"]', email);
    await page.fill('[name="password"]', "password123");
    await page.fill('[name="confirmPassword"]', "password123");
    await page.click('button[type="submit"]');
    await page.waitForURL("/login");

    // 같은 이메일로 두 번째 가입 시도
    await page.goto("/register");
    await page.fill('[name="name"]', "두번째유저");
    await page.fill('[name="email"]', email);
    await page.fill('[name="password"]', "password456");
    await page.fill('[name="confirmPassword"]', "password456");
    await page.click('button[type="submit"]');

    // 페이지가 여전히 회원가입 페이지에 있는지 확인 (중복 이메일로 인한 실패)
    await page.waitForTimeout(3000);
    await expect(page).toHaveURL("/register");
  });

  test("존재하지 않는 사용자 로그인", async ({ page }) => {
    await page.goto("/login");
    await page.fill('[name="email"]', "nonexistent@example.com");
    await page.fill('[name="password"]', "password123");
    await page.click('button[type="submit"]');

    await page.waitForTimeout(2000);
    await expect(page).toHaveURL("/login");
  });

  test("잘못된 비밀번호 로그인", async ({ page }) => {
    // 먼저 정상 사용자 생성
    const timestamp = Date.now();
    const testUser = {
      email: `wrongpw${timestamp}@example.com`,
      password: "correctpassword",
    };

    await page.goto("/register");
    await page.fill('[name="name"]', "테스트유저");
    await page.fill('[name="email"]', testUser.email);
    await page.fill('[name="password"]', testUser.password);
    await page.fill('[name="confirmPassword"]', testUser.password);
    await page.click('button[type="submit"]');
    await page.waitForURL("/login");

    // 틀린 비밀번호로 로그인 시도
    await page.fill('[name="email"]', testUser.email);
    await page.fill('[name="password"]', "wrongpassword");
    await page.click('button[type="submit"]');

    await page.waitForTimeout(2000);
    await expect(page).toHaveURL("/login");
  });

  test("비로그인 상태에서 대시보드 접근", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForURL("/login");
    await expect(page.locator('h2:has-text("로그인")')).toBeVisible();
  });

  test("비로그인 상태에서 관리자 페이지 접근", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.locator('h1:has-text("활동 로그 관리")')).toBeVisible();
  });

  test("세션 만료 후 페이지 접근", async ({ page }) => {
    // 먼저 로그인
    const timestamp = Date.now();
    const testUser = {
      name: `session${timestamp}`,
      email: `session${timestamp}@example.com`,
      password: "password123",
    };

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

    // 세션 쿠키 삭제 (세션 만료 시뮬레이션)
    await page.context().clearCookies();

    // 대시보드 새로고침
    await page.reload();
    await page.waitForURL("/login");
  });
});
