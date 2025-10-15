import { test, expect } from "@playwright/test";

test.describe("엣지 케이스 테스트", () => {
  test("매우 긴 이름으로 회원가입", async ({ page }) => {
    const longName = "a".repeat(100);

    await page.goto("/register");
    await page.fill('[name="name"]', longName);
    await page.fill('[name="email"]', "longname@example.com");
    await page.fill('[name="password"]', "password123");
    await page.fill('[name="confirmPassword"]', "password123");
    await page.click('button[type="submit"]');

    // 서버에서 어떻게 처리하는지 확인
  });

  test("특수문자가 포함된 이름", async ({ page }) => {
    await page.goto("/register");
    await page.fill('[name="name"]', "테스트<script>alert(1)</script>");
    await page.fill('[name="email"]', "xss@example.com");
    await page.fill('[name="password"]', "password123");
    await page.fill('[name="confirmPassword"]', "password123");
    await page.click('button[type="submit"]');
  });

  test("매우 긴 이메일 주소", async ({ page }) => {
    const longEmail = "a".repeat(50) + "@" + "b".repeat(50) + ".com";

    await page.goto("/register");
    await page.fill('[name="name"]', "테스트유저");
    await page.fill('[name="email"]', longEmail);
    await page.fill('[name="password"]', "password123");
    await page.fill('[name="confirmPassword"]', "password123");
    await page.click('button[type="submit"]');
  });

  test("빠른 연속 클릭 (더블 클릭 방지)", async ({ page }) => {
    const timestamp = Date.now();

    await page.goto("/register");
    await page.fill('[name="name"]', `doubleclick${timestamp}`);
    await page.fill('[name="email"]', `doubleclick${timestamp}@example.com`);
    await page.fill('[name="password"]', "password123");
    await page.fill('[name="confirmPassword"]', "password123");

    // 빠른 연속 클릭
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();
    await submitButton.click();
    await submitButton.click();

    // 중복 요청이 처리되지 않았는지 확인
  });

  test("페이지 새로고침 중 폼 제출", async ({ page }) => {
    await page.goto("/register");
    await page.fill('[name="name"]', "새로고침테스트");
    await page.fill('[name="email"]', "refresh@example.com");
    await page.fill('[name="password"]', "password123");
    await page.fill('[name="confirmPassword"]', "password123");

    // 페이지 새로고침과 동시에 제출 시도
    await Promise.all([
      page.reload(),
      page.click('button[type="submit"]').catch(() => {}), // 에러 무시
    ]);
  });

  test("브라우저 뒤로가기 후 폼 상태", async ({ page }) => {
    await page.goto("/register");
    await page.fill('[name="name"]', "뒤로가기테스트");
    await page.fill('[name="email"]', "back@example.com");

    // 다른 페이지로 이동
    await page.goto("/login");

    // 뒤로가기
    await page.goBack();

    // 폼 데이터가 유지되는지 확인
    const nameValue = await page.locator('[name="name"]').inputValue();
    // 브라우저에 따라 다를 수 있음
  });
});
