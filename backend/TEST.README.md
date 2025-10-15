# NestJS E2E 테스트 작성 가이드

## 필수 Mock 처리 항목

### 1. CloudWatchLogger Mock (필수)

```typescript
const mockCloudWatchLogger = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn(),
  sendLog: jest.fn().mockResolvedValue(undefined),
  sendToCloudWatch: jest.fn(),
  onModuleDestroy: jest.fn(),
};
```

### 2. JWT AuthGuard Mock (JWT 인증이 있는 경우)

```typescript
import { AuthGuard } from '@nestjs/passport';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';

.overrideGuard(AuthGuard('jwt'))
.useValue({
  canActivate: (context: ExecutionContext) => {
    const req = context.switchToHttp().getRequest();
    const authHeader = req.headers.authorization;

    // Authorization 헤더가 없으면 401 에러
    if (!authHeader) {
      throw new UnauthorizedException();
    }

    // 있으면 인증 통과
    req.user = {
      id: userId,
      email: 'test@example.com',
      name: 'Test User'
    };
    return true;
  },
})
```

**중요:** `false`를 반환하면 403 Forbidden이 발생합니다. 401을 원하면 `UnauthorizedException`을 throw 해야 합니다.

## 테스트 작성 체크리스트

### 시작 전 확인사항

- [ ] Prisma Schema 확인 (필수 필드 파악)
- [ ] DTO 파일 확인 (RegisterDto, LoginDto 등)
- [ ] Service 메서드 반환값 확인
- [ ] 컨트롤러의 인증 요구사항 확인 (`@UseGuards(AuthGuard('jwt'))`)

### 테스트 구조

```typescript
describe('ControllerName (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let authToken: string; // JWT 인증이 필요한 경우
  let userId: string;

  beforeAll(async () => {
    // 1. 모듈 생성
    // 2. Mock 설정 (CloudWatchLogger, AuthGuard)
    // 3. 앱 초기화
    // 4. 필요시 테스트용 사용자 생성 및 로그인
  });

  afterAll(async () => {
    // 테스트 데이터 정리
    await prisma.관련테이블.deleteMany({});
    await prisma.user.deleteMany({});
    await app.close();
  });
});
```

## 일반적인 실수와 해결책

### 1. 이메일 중복 문제

**문제:** 여러 테스트에서 같은 이메일 사용

```typescript
// ❌ 나쁜 예
email: 'test@example.com'; // 모든 테스트에서 동일
```

**해결:**

```typescript
// ✅ 좋은 예
email: 'auth-test@example.com'; // Auth 테스트
email: 'activity-log-test@example.com'; // Activity-log 테스트
email: 'health-test@example.com'; // Health 테스트
```

### 2. beforeEach vs beforeAll

**문제:** `beforeEach`가 다른 describe 블록에 영향

```typescript
// ❌ 나쁜 예 - 전역 beforeEach
beforeEach(async () => {
  await prisma.user.deleteMany({}); // 모든 테스트에 영향
});
```

**해결:**

```typescript
// ✅ 좋은 예 - describe 블록 내부에만 적용
describe('POST /auth/register', () => {
  beforeEach(async () => {
    await prisma.user.deleteMany({}); // 이 describe 블록에만 적용
  });
});

describe('POST /auth/login', () => {
  beforeEach(async () => {
    // 매번 사용자 생성
    await request.post('/auth/register').send(testUser);
  });
});
```

### 3. JWT 토큰 401 에러

**문제:** 세션 검증 로직이 있어서 Mock 토큰이 실패

```typescript
// ❌ 에러 발생
const loginResponse = await request.post('/auth/login').send(...);
authToken = loginResponse.body.access_token; // 세션 검증 실패로 401
```

**해결:** AuthGuard를 Mock으로 처리

### 4. Prisma 필수 필드 누락

**문제:** 테스트 데이터에 필수 필드가 없음

```typescript
// ❌ 에러: pagePath is missing
.send({
  eventName: 'test',
  eventType: 'USER_ACTION',
  pageUrl: 'https://example.com'
  // pagePath 누락!
})
```

**해결:** Prisma Schema를 확인하고 필수 필드 모두 포함

### 5. HTTP 상태 코드 불일치

**문제:** 실제 API는 201을 반환하는데 200을 expect

```typescript
// ❌ 에러: expected 200, got 201
.expect(200) // 실제로는 201 반환
```

**해결:** 실제 API 응답에 맞춰 수정

```typescript
// ✅ 올바른 상태 코드
POST /auth/register → 201
POST /auth/login → 201 (또는 200, API에 따라)
POST /auth/kakao → 201
GET /auth/profile → 200
```

## 테스트 실행 및 디버깅

### 실행 명령어

```bash
npm run test:e2e
```

### 에러 로그 해석

E2E 테스트에서 나오는 `[Nest] ERROR` 로그들은:

- ✅ **의도적인 에러 케이스 테스트** → 정상
- ❌ **예상치 못한 에러** → 수정 필요

예상된 에러 예시:

```
Error: 필수 데이터가 누락되었습니다  ← 검증 테스트
Error: 카카오 사용자 정보가 누락되었습니다  ← 검증 테스트
PrismaClientKnownRequestError: duplicate  ← 중복 테스트
```

### 성공 확인

```
Test Suites: X passed, X total
Tests:       Y passed, Y total
```

모든 테스트가 passed면 성공! 🎉

## 파일 구조

```
test/
├── app.e2e-spec.ts           # 기본 앱 테스트
├── auth.e2e-spec.ts          # 인증 관련
├── activity-log.e2e-spec.ts  # 활동 로그
├── health.e2e-spec.ts        # 헬스체크
└── jest-e2e.json             # Jest 설정
```

## jest-e2e.json 필수 설정

```json
{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": ".",
  "testEnvironment": "node",
  "testRegex": ".e2e-spec.ts$",
  "transform": {
    "^.+\\.(t|j)s$": "ts-jest"
  },
  "moduleNameMapper": {
    "^src/(.*)$": "<rootDir>/../src/$1"
  },
  "testTimeout": 30000
}
```

## 다음 E2E 테스트 작성 시 프롬프트

```
NestJS E2E 테스트를 작성해줘.

필수 정보:
1. 컨트롤러 파일 제공
2. Prisma Schema 제공 (필수 필드 확인용)
3. DTO 파일 제공 (있는 경우)
4. Service 파일 제공 (반환값 확인용)

주의사항:
- CloudWatchLogger는 항상 Mock 처리
- JWT 인증이 있으면 AuthGuard Mock 처리
- 각 테스트 파일마다 고유한 이메일 사용
- Prisma 필수 필드 모두 포함
- 실제 API 상태 코드 확인 후 작성
- beforeEach/beforeAll 범위 주의
```

## 참고사항

- E2E 테스트는 **실제 API 동작**을 테스트
- **실제 외부 서비스 호출은 Mock 처리** (CloudWatch, Gmail 등)
- **JWT 검증, 세션 검증 등은 Mock으로 우회**
- 상세한 로직 검증은 **Unit 테스트**에서 수행
