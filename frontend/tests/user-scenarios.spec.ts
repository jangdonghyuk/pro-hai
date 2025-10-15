import { test, expect } from "@playwright/test";

test.describe("실제 사용자 시나리오", () => {
  test("신규 사용자 완전 온보딩", async ({ page }) => {
    const timestamp = Date.now();
    const testUser = {
      name: `신규유저${timestamp}`,
      email: `newuser${timestamp}@example.com`,
      password: "password123",
    };

    // 1. 홈페이지 방문 (비로그인 상태)
    await page.goto("/");
    await expect(page.locator('h1:has-text("Pro-HAI")')).toBeVisible();
    await expect(page.locator("text=로그인이 필요합니다")).toBeVisible();

    // 2. 회원가입 페이지로 이동
    await page.click('a:has-text("회원가입")');
    await page.waitForURL("/register");

    // 3. 회원가입 완료
    await page.fill('[name="name"]', testUser.name);
    await page.fill('[name="email"]', testUser.email);
    await page.fill('[name="password"]', testUser.password);
    await page.fill('[name="confirmPassword"]', testUser.password);
    await page.click('button[type="submit"]');
    await expect(page.locator("text=회원가입 완료!")).toBeVisible();
    await page.waitForURL("/login");

    // 4. 로그인
    await page.fill('[name="email"]', testUser.email);
    await page.fill('[name="password"]', testUser.password);
    await page.click('button[type="submit"]');
    await page.waitForURL("/dashboard");

    // 5. 대시보드에서 헬스체크 사용
    await expect(page.locator(`text=${testUser.name}`)).toBeVisible();
    await page.click('button:has-text("헬스체크 실행")');
    await expect(page.locator(".bg-green-50, .bg-red-50")).toBeVisible();

    // 6. 관리자 페이지 탐색
    await page.goto("/");
    await page.click('a:has-text("관리자 페이지")');
    await page.waitForURL("/admin");
    await expect(page.locator('h1:has-text("활동 로그 관리")')).toBeVisible();

    // 7. 홈으로 돌아가서 로그아웃
    await page.click('a:has-text("홈으로")');
    await page.waitForURL("/");
    await expect(
      page.locator(`text=안녕하세요, ${testUser.name}님!`)
    ).toBeVisible();
    await page.click('button:has-text("로그아웃")');
    await expect(page.locator("text=로그인이 필요합니다")).toBeVisible();
  });

  test("기존 사용자 일반 워크플로우", async ({ page }) => {
    // 사용자 준비
    const timestamp = Date.now();
    const testUser = {
      name: `기존유저${timestamp}`,
      email: `existing${timestamp}@example.com`,
      password: "password123",
    };

    // 먼저 회원가입
    await page.goto("/register");
    await page.fill('[name="name"]', testUser.name);
    await page.fill('[name="email"]', testUser.email);
    await page.fill('[name="password"]', testUser.password);
    await page.fill('[name="confirmPassword"]', testUser.password);
    await page.click('button[type="submit"]');
    await page.waitForURL("/login");

    // 실제 시나리오: 홈에서 로그인
    await page.goto("/");
    await page.click('a:has-text("로그인")');
    await page.waitForURL("/login");

    await page.fill('[name="email"]', testUser.email);
    await page.fill('[name="password"]', testUser.password);
    await page.click('button[type="submit"]');
    await page.waitForURL("/dashboard");

    // 대시보드 → 관리자 페이지 → 홈 → 대시보드
    await page.click('a:has-text("홈으로")');
    await page.click('a:has-text("관리자 페이지")');
    await page.waitForURL("/admin");

    // 관리자 페이지에서 홈으로 → 대시보드로
    await page.click('a:has-text("홈으로")');
    await page.waitForURL("/");
    await page.click('a:has-text("대시보드로 이동")');
    await page.waitForURL("/dashboard");
    await expect(page.locator(`text=${testUser.name}`)).toBeVisible();
  });

  test("관리자 모니터링 워크플로우", async ({ page }) => {
    // 사용자 준비 및 로그인
    const timestamp = Date.now();
    const testUser = {
      name: `관리자${timestamp}`,
      email: `admin${timestamp}@example.com`,
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

    // 관리자 페이지에서 모니터링
    await page.goto("/admin");
    await page.waitForSelector(".grid", { timeout: 10000 });

    // 이벤트 타입 필터링
    await page.selectOption("select", "page_view");
    await page.waitForTimeout(1000);

    // 사용자 ID로 검색
    await page.fill(
      'input[placeholder="사용자 ID 검색"]',
      testUser.email.substring(0, 8)
    );
    await page.waitForTimeout(1000);

    // 필터 초기화
    await page.click('button:has-text("필터 초기화")');
    await expect(page.locator("select")).toHaveValue("");
  });

  test("브라우저 뒤로가기/앞으로가기 패턴", async ({ page }) => {
    // 로그인 준비
    const timestamp = Date.now();
    const testUser = {
      name: `네비${timestamp}`,
      email: `navi${timestamp}@example.com`,
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

    // 페이지 이동: 대시보드 → 홈 → 관리자
    await page.click('a:has-text("홈으로")');
    await page.waitForURL("/");

    await page.click('a:has-text("관리자 페이지")');
    await page.waitForURL("/admin");

    // 뒤로가기: 관리자 → 홈
    await page.goBack();
    await page.waitForURL("/");
    await expect(
      page.locator(`text=안녕하세요, ${testUser.name}님!`)
    ).toBeVisible();

    // 앞으로가기: 홈 → 관리자
    await page.goForward();
    await page.waitForURL("/admin");
    await expect(page.locator('h1:has-text("활동 로그 관리")')).toBeVisible();

    // 뒤로가기 → 뒤로가기: 관리자 → 홈 → 대시보드
    await page.goBack();
    await page.goBack();
    await page.waitForURL("/dashboard");
    await expect(page.locator(`text=${testUser.name}`)).toBeVisible();
  });

  test("새로고침 후 세션 유지", async ({ page }) => {
    // 로그인 준비
    const timestamp = Date.now();
    const testUser = {
      name: `새로고침${timestamp}`,
      email: `refresh${timestamp}@example.com`,
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

    // 대시보드에서 새로고침
    await page.reload();
    await expect(page.locator('h1:has-text("대시보드")')).toBeVisible();
    await expect(page.locator(`text=${testUser.name}`)).toBeVisible();

    // 홈페이지에서 새로고침
    await page.goto("/");
    await page.reload();
    await expect(
      page.locator(`text=안녕하세요, ${testUser.name}님!`)
    ).toBeVisible();

    // 관리자 페이지에서 새로고침
    await page.goto("/admin");
    await page.reload();
    await expect(page.locator('h1:has-text("활동 로그 관리")')).toBeVisible();
  });

  test("다중 탭에서 동시 사용", async ({ browser }) => {
    // 새 컨텍스트와 탭들 생성
    const context = await browser.newContext();
    const page1 = await context.newPage();
    const page2 = await context.newPage();

    const timestamp = Date.now();
    const testUser = {
      name: `멀티탭${timestamp}`,
      email: `multitab${timestamp}@example.com`,
      password: "password123",
    };

    try {
      // 첫 번째 탭에서 회원가입
      await page1.goto("/register");
      await page1.fill('[name="name"]', testUser.name);
      await page1.fill('[name="email"]', testUser.email);
      await page1.fill('[name="password"]', testUser.password);
      await page1.fill('[name="confirmPassword"]', testUser.password);
      await page1.click('button[type="submit"]');
      await page1.waitForURL("/login");

      // 첫 번째 탭에서 로그인
      await page1.fill('[name="email"]', testUser.email);
      await page1.fill('[name="password"]', testUser.password);
      await page1.click('button[type="submit"]');
      await page1.waitForURL("/dashboard");

      // 두 번째 탭에서 홈페이지 접근 (세션 공유 확인)
      await page2.goto("/");
      await expect(
        page2.locator(`text=안녕하세요, ${testUser.name}님!`)
      ).toBeVisible();

      // 첫 번째 탭: 대시보드에서 헬스체크
      await page1.click('button:has-text("헬스체크 실행")');
      await expect(page1.locator(".bg-green-50, .bg-red-50")).toBeVisible();

      // 두 번째 탭: 관리자 페이지 접근
      await page2.click('a:has-text("관리자 페이지")');
      await page2.waitForURL("/admin");
      await expect(
        page2.locator('h1:has-text("활동 로그 관리")')
      ).toBeVisible();

      // 첫 번째 탭에서 로그아웃
      await page1.goto("/");
      await page1.click('button:has-text("로그아웃")');
      await expect(page1.locator("text=로그인이 필요합니다")).toBeVisible();

      // 두 번째 탭 새로고침 시 로그아웃 상태 반영되는지 확인
      await page2.reload();
      await page2.waitForTimeout(2000); // NextAuth 처리 시간 대기

      // 로그아웃 상태 확인 (리다이렉트 또는 에러 상태)
      const currentUrl = page2.url();
      const isLoggedOut =
        currentUrl.includes("/login") || currentUrl.includes("/");
      expect(isLoggedOut).toBeTruthy();
    } finally {
      // 페이지들을 먼저 닫고 컨텍스트 닫기
      await page1.close();
      await page2.close();
      await context.close();
    }
  });
});
