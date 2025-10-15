# NestJS CloudWatch 로깅 가이드

## 📋 라우터 생성 시 필수 규칙

### 1. 기본 구조

모든 라우터는 다음 구조를 따라야 합니다:

- CloudWatchLogger 의존성 주입
- try-catch 블록으로 에러 처리
- 성공/실패 모든 경우에 대한 로깅

### 2. 필수 import

```typescript
import { CloudWatchLogger } from '../utils/cloudwatch-logger';
```

### 3. Constructor에 의존성 주입

```typescript
constructor(
  private cloudWatchLogger: CloudWatchLogger,
  // ... 기타 서비스들
) {}
```

### 4. 모듈에 Provider 등록

```typescript
@Module({
  providers: [CloudWatchLogger],
  // ...
})
```

## 📝 라우터 코드 템플릿

### GET 요청 템플릿

```typescript
@Get('endpoint')
async methodName(@Req() req: any, @Query('param') param?: string) {
  const startTime = Date.now();

  try {
    // 1. 파라미터 검증 (예상 에러)
    if (param && (조건 체크)) {
      const responseTime = Date.now() - startTime;
      await this.cloudWatchLogger.sendLog(
        400,
        'GET',
        '/controller/endpoint',
        req.ip || '0.0.0.0',
        req.user?.name || '비로그인',
        req.headers['user-agent'] || 'Unknown',
        responseTime,
        '구체적인 실패 이유 - 한글 설명 (원본 에러)'
      );
      throw new Error('사용자에게 보여질 메시지');
    }

    // 2. 비즈니스 로직 실행
    const result = await this.service.method();
    const responseTime = Date.now() - startTime;

    // 3. 성공 로그
    await this.cloudWatchLogger.sendLog(
      200,
      'GET',
      '/controller/endpoint',
      req.ip || '0.0.0.0',
      req.user?.name || '비로그인',
      req.headers['user-agent'] || 'Unknown',
      responseTime,
      '성공 메시지 - 구체적인 결과 포함'
    );

    return result;
  } catch (error) {
    const responseTime = Date.now() - startTime;

    // 4. 특정 에러별 처리
    if (error.message?.includes('specific_error')) {
      await this.cloudWatchLogger.sendLog(
        적절한_상태코드,
        'GET',
        '/controller/endpoint',
        req.ip || '0.0.0.0',
        req.user?.name || '비로그인',
        req.headers['user-agent'] || 'Unknown',
        responseTime,
        `구체적 에러 설명 - 한글 (${error.message})`
      );
    } else {
      // 5. 일반 에러 처리
      await this.cloudWatchLogger.sendLog(
        500,
        'GET',
        '/controller/endpoint',
        req.ip || '0.0.0.0',
        req.user?.name || '비로그인',
        req.headers['user-agent'] || 'Unknown',
        responseTime,
        `일반 서버 오류 (${error.message})`
      );
    }

    throw error;
  }
}
```

### POST 요청 템플릿

```typescript
@Post('endpoint')
async methodName(@Body() dto: SomeDto, @Req() req: any) {
  const startTime = Date.now();

  try {
    // 1. DTO 추가 검증
    if (!dto.requiredField) {
      const responseTime = Date.now() - startTime;
      await this.cloudWatchLogger.sendLog(
        400,
        'POST',
        '/controller/endpoint',
        req.ip || '0.0.0.0',
        dto.email || '익명',
        req.headers['user-agent'] || 'Unknown',
        responseTime,
        '필수 데이터 누락 - requiredField 없음'
      );
      throw new Error('필수 데이터가 누락되었습니다');
    }

    // 2. 비즈니스 로직
    const result = await this.service.create(dto);
    const responseTime = Date.now() - startTime;

    // 3. 성공 로그
    await this.cloudWatchLogger.sendLog(
      201,
      'POST',
      '/controller/endpoint',
      req.ip || '0.0.0.0',
      dto.email || '익명',
      req.headers['user-agent'] || 'Unknown',
      responseTime,
      '생성 성공'
    );

    return result;
  } catch (error) {
    const responseTime = Date.now() - startTime;

    // 4. 중복 데이터 에러
    if (error.message?.includes('duplicate') || error.message?.includes('unique')) {
      await this.cloudWatchLogger.sendLog(
        409,
        'POST',
        '/controller/endpoint',
        req.ip || '0.0.0.0',
        dto.email || '익명',
        req.headers['user-agent'] || 'Unknown',
        responseTime,
        `중복 데이터 오류 (${error.message})`
      );
    } else {
      await this.cloudWatchLogger.sendLog(
        500,
        'POST',
        '/controller/endpoint',
        req.ip || '0.0.0.0',
        dto.email || '익명',
        req.headers['user-agent'] || 'Unknown',
        responseTime,
        `서버 오류 (${error.message})`
      );
    }

    throw error;
  }
}
```

## 🎯 로그 메시지 작성 규칙

### 성공 메시지

- **구체적인 결과 포함**: `"사용자별 활동 통계 조회 성공 (7일, 15명 조회)"`
- **의미있는 정보 추가**: `"로그인 성공"`, `"회원가입 성공"`

### 실패 메시지

- **한글 설명 + 원본 에러**: `"회원가입 실패 - 이미 존재하는 이메일 (duplicate key error)"`
- **구체적인 원인**: `"잘못된 limit 값 (abc, 1-1000 범위 필요)"`

## 📊 HTTP 상태코드 가이드

| 상태코드 | 사용 상황       | 예시                      |
| -------- | --------------- | ------------------------- |
| 200      | 조회 성공       | GET 요청 성공             |
| 201      | 생성 성공       | POST로 데이터 생성        |
| 400      | 잘못된 요청     | 파라미터 검증 실패        |
| 401      | 인증 실패       | 로그인 실패, JWT 오류     |
| 403      | 권한 없음       | 관리자 권한 필요          |
| 404      | 리소스 없음     | 사용자/데이터 없음        |
| 409      | 충돌            | 중복 데이터               |
| 423      | 리소스 잠김     | 계정 잠김                 |
| 500      | 서버 오류       | 예상치 못한 에러          |
| 502      | 게이트웨이 오류 | 외부 API 오류             |
| 503      | 서비스 불가     | DB 연결 실패, 리소스 부족 |

## 🔍 예상 에러별 처리 예시

### 인증 관련

```typescript
if (error.message?.includes('jwt') || error.message?.includes('token')) {
  // 401 - JWT 토큰 오류
}
if (error.message?.includes('session') || error.message?.includes('expired')) {
  // 401 - 세션 만료
}
```

### 데이터베이스 관련

```typescript
if (
  error.message?.includes('connection') ||
  error.message?.includes('timeout')
) {
  // 503 - DB 연결 오류
}
if (error.message?.includes('duplicate') || error.message?.includes('unique')) {
  // 409 - 중복 데이터
}
```

### 외부 서비스 관련

```typescript
if (error.message?.includes('kakao') || error.message?.includes('oauth')) {
  // 502 - 외부 API 오류
}
```

## ✅ 체크리스트

라우터 생성 시 다음을 확인하세요:

- [ ] CloudWatchLogger 의존성 주입
- [ ] 모듈에 Provider 등록
- [ ] try-catch 블록 구현
- [ ] 파라미터 검증 추가
- [ ] 성공 시 로그 기록
- [ ] 예상 에러별 구체적 처리
- [ ] 일반 에러 catch 처리
- [ ] 적절한 HTTP 상태코드 사용
- [ ] 한글 메시지 + 원본 에러 포함

## 🚨 주의사항

- **모든 라우터에 적용 필수**
- **CloudWatch 로그 전송 실패 시에도 API는 정상 동작해야 함**
- **에러 로그에는 민감한 정보(비밀번호 등) 포함 금지**
- **사용자 식별 정보는 이메일/이름 사용**

[라우터 학습용 여기까지]

====================================================================

# Pro-Hai Backend - 종합 모니터링 및 보안 시스템

## 시스템 아키텍처

### 로깅 및 모니터링 시스템

- **CloudWatch 통합 로깅**: 모든 API 요청/응답을 CloudWatch Logs에 체계적 기록
- **실시간 에러 알림**: Gmail SMTP를 통한 즉시 이메일 알림 시스템
- **심각도 기반 알림 분류**:
  - Critical (5xx): 서버 오류 - 즉시 이메일 알림
  - Warning (4xx): 클라이언트 오류 - 이메일 알림
  - Info (2xx, 3xx): 정상 응답 - CloudWatch 로그만

### 보안 시스템

- **다층 보안 아키텍처**:
  - IP 기반 차단 (IpFilterGuard)
  - URL 패턴 기반 차단 (SecurityFilterMiddleware)
  - 실시간 해킹 시도 탐지 및 차단
- **보안 로그 분리**: 보안 차단은 CloudWatch만 기록 (이메일 알림 없음으로 과도한 알림 방지)

### 예외 처리 시스템

- **Global Exception Filter**: 모든 예외를 누락 없이 캐치
- **Validation 에러 한국어화**: 사용자 친화적 에러 메시지
- **구조화된 에러 응답**: 일관된 에러 응답 형식

## 기술적 특징

### 모니터링 효율성

```typescript
// 이메일 발송 조건부 처리
private shouldSendEmail(statusCode: number): boolean {
  return this.criticalStatusCodes.includes(statusCode) ||
         this.warningStatusCodes.includes(statusCode);
}
```

### 보안 패턴 분석

- 300+ 악성 URL 패턴 차단 규칙
- 100+ 악성 IP 주소 블랙리스트
- 실시간 해킹 시도 로그 수집 및 분석

### 운영 효율성

- 비용 효율적 모니터링 (Gmail SMTP 활용)
- 과도한 알림 방지 (보안 차단은 로그만)
- 즉시 대응 가능한 에러 알림 시스템

## 구현 성과

### 시스템 안정성

- 모든 API 에러 100% 추적 가능
- 평균 응답 시간 및 에러율 실시간 모니터링
- 해킹 시도 자동 차단으로 서버 부하 감소

### 운영 효율성

- 에러 발생 시 즉시 이메일 알림으로 빠른 대응
- CloudWatch 대시보드를 통한 트렌드 분석
- 보안 위협 패턴 분석을 통한 선제적 대응

## 기술 스택

- **Framework**: NestJS (TypeScript)
- **Monitoring**: AWS CloudWatch Logs
- **Alerting**: Nodemailer (Gmail SMTP)
- **Security**: Custom Guards & Middleware
- **Validation**: class-validator with 한국어 메시지
