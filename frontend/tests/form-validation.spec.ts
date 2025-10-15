import { test, expect } from "@playwright/test";

test.describe("폼 검증 테스트", () => {
  test("회원가입 - 비밀번호 불일치", async ({ page }) => {
    await page.goto("/register");
    await page.fill('[name="name"]', "테스트유저");
    await page.fill('[name="email"]', "test@example.com");
    await page.fill('[name="password"]', "password123");
    await page.fill('[name="confirmPassword"]', "different_password");
    await page.click('button[type="submit"]');

    await expect(
      page.locator("text=비밀번호가 일치하지 않습니다")
    ).toBeVisible();
    await expect(page).toHaveURL("/register"); // 여전히 회원가입 페이지
  });

  test("회원가입 - 필수 필드 누락", async ({ page }) => {
    await page.goto("/register");
    // 이름만 입력하고 나머지는 빈 상태로 제출
    await page.fill('[name="name"]', "테스트유저");
    await page.click('button[type="submit"]');

    // HTML5 validation 확인
    const emailInput = page.locator('[name="email"]');
    await expect(emailInput).toHaveAttribute("required");
  });

  test("회원가입 - 잘못된 이메일 형식", async ({ page }) => {
    await page.goto("/register");
    await page.fill('[name="name"]', "테스트유저");
    await page.fill('[name="email"]', "invalid-email");
    await page.fill('[name="password"]', "password123");
    await page.fill('[name="confirmPassword"]', "password123");
    await page.click('button[type="submit"]');

    // 브라우저 자체 이메일 검증 확인
    const emailInput = page.locator('[name="email"]');
    const validationMessage = await emailInput.evaluate(
      (el: HTMLInputElement) => el.validationMessage
    );
    expect(validationMessage).toBeTruthy();
  });

  test("회원가입 - 비밀번호 최소 길이 미달", async ({ page }) => {
    await page.goto("/register");
    await page.fill('[name="name"]', "테스트유저");
    await page.fill('[name="email"]', "test@example.com");
    await page.fill('[name="password"]', "123"); // 3자리
    await page.fill('[name="confirmPassword"]', "123");
    await page.click('button[type="submit"]');

    // minLength 검증 확인
    const passwordInput = page.locator('[name="password"]');
    await expect(passwordInput).toHaveAttribute("minLength", "6");
  });

  test("로그인 - 빈 폼 제출", async ({ page }) => {
    await page.goto("/login");
    await page.click('button[type="submit"]');

    // 필수 필드 검증
    const emailInput = page.locator('[name="email"]');
    const passwordInput = page.locator('[name="password"]');
    await expect(emailInput).toHaveAttribute("required");
    await expect(passwordInput).toHaveAttribute("required");
  });
});
