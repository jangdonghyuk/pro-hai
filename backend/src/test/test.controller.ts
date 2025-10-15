import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Req,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { CloudWatchLogger } from '../utils/cloudwatch-logger';

@Controller('test')
export class TestController {
  constructor(private cloudWatchLogger: CloudWatchLogger) {}

  // 1. 특정 상태코드 에러 테스트
  @Get('error/:statusCode')
  async testSpecificError(
    @Param('statusCode') statusCode: string,
    @Query('message') customMessage: string,
    @Req() req: any,
  ) {
    const startTime = Date.now();
    const code = parseInt(statusCode) || 500;
    const message = customMessage || `테스트 에러 - ${code}`;

    try {
      // 의도적으로 에러 발생
      throw new Error(message);
    } catch (error) {
      const responseTime = Date.now() - startTime;

      await this.cloudWatchLogger.sendLog(
        code,
        'GET',
        `/test/error/${statusCode}`,
        req.ip || '0.0.0.0',
        '테스트사용자',
        req.headers['user-agent'] || 'Unknown',
        responseTime,
        `에러 테스트 - ${message}`,
      );

      throw new HttpException(message, code);
    }
  }

  // 2. Critical 에러들 (5xx) 테스트
  @Get('critical/server-error')
  async testServerError(@Req() req: any) {
    const startTime = Date.now();
    try {
      throw new Error('서버 내부 오류 발생');
    } catch (error) {
      const responseTime = Date.now() - startTime;
      await this.cloudWatchLogger.sendLog(
        500,
        'GET',
        '/test/critical/server-error',
        req.ip || '0.0.0.0',
        '테스트사용자',
        req.headers['user-agent'] || 'Unknown',
        responseTime,
        '테스트: 서버 내부 오류 - 데이터베이스 연결 실패',
      );
      throw new HttpException(
        '서버 내부 오류',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('critical/bad-gateway')
  async testBadGateway(@Req() req: any) {
    const startTime = Date.now();
    try {
      throw new Error('외부 서비스 연결 실패');
    } catch (error) {
      const responseTime = Date.now() - startTime;
      await this.cloudWatchLogger.sendLog(
        502,
        'GET',
        '/test/critical/bad-gateway',
        req.ip || '0.0.0.0',
        '테스트사용자',
        req.headers['user-agent'] || 'Unknown',
        responseTime,
        '테스트: Bad Gateway - 카카오 API 서버 연결 실패',
      );
      throw new HttpException('외부 서비스 연결 실패', HttpStatus.BAD_GATEWAY);
    }
  }

  @Get('critical/service-unavailable')
  async testServiceUnavailable(@Req() req: any) {
    const startTime = Date.now();
    try {
      throw new Error('서비스 일시적 중단');
    } catch (error) {
      const responseTime = Date.now() - startTime;
      await this.cloudWatchLogger.sendLog(
        503,
        'GET',
        '/test/critical/service-unavailable',
        req.ip || '0.0.0.0',
        '테스트사용자',
        req.headers['user-agent'] || 'Unknown',
        responseTime,
        '테스트: Service Unavailable - 서버 과부하로 인한 일시적 서비스 중단',
      );
      throw new HttpException(
        '서비스 일시적 중단',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  // 3. Warning 에러들 (4xx) 테스트
  @Get('warning/unauthorized')
  async testUnauthorized(@Req() req: any) {
    const startTime = Date.now();
    try {
      throw new Error('인증 실패');
    } catch (error) {
      const responseTime = Date.now() - startTime;
      await this.cloudWatchLogger.sendLog(
        401,
        'GET',
        '/test/warning/unauthorized',
        req.ip || '0.0.0.0',
        '테스트사용자',
        req.headers['user-agent'] || 'Unknown',
        responseTime,
        '테스트: Unauthorized - JWT 토큰 만료 또는 유효하지 않음',
      );
      throw new HttpException('인증 실패', HttpStatus.UNAUTHORIZED);
    }
  }

  @Get('warning/forbidden')
  async testForbidden(@Req() req: any) {
    const startTime = Date.now();
    try {
      throw new Error('권한 없음');
    } catch (error) {
      const responseTime = Date.now() - startTime;
      await this.cloudWatchLogger.sendLog(
        403,
        'GET',
        '/test/warning/forbidden',
        req.ip || '0.0.0.0',
        '테스트사용자',
        req.headers['user-agent'] || 'Unknown',
        responseTime,
        '테스트: Forbidden - 관리자 권한이 필요한 리소스에 일반 사용자 접근',
      );
      throw new HttpException('권한 없음', HttpStatus.FORBIDDEN);
    }
  }

  @Get('warning/conflict')
  async testConflict(@Req() req: any) {
    const startTime = Date.now();
    try {
      throw new Error('데이터 충돌');
    } catch (error) {
      const responseTime = Date.now() - startTime;
      await this.cloudWatchLogger.sendLog(
        409,
        'GET',
        '/test/warning/conflict',
        req.ip || '0.0.0.0',
        '테스트사용자',
        req.headers['user-agent'] || 'Unknown',
        responseTime,
        '테스트: Conflict - 이미 존재하는 이메일로 회원가입 시도',
      );
      throw new HttpException('데이터 충돌', HttpStatus.CONFLICT);
    }
  }

  // 4. 정상 응답 테스트 (이메일 발송 안됨)
  @Get('success')
  async testSuccess(@Req() req: any) {
    const startTime = Date.now();
    const responseTime = Date.now() - startTime;

    await this.cloudWatchLogger.sendLog(
      200,
      'GET',
      '/test/success',
      req.ip || '0.0.0.0',
      '테스트사용자',
      req.headers['user-agent'] || 'Unknown',
      responseTime,
      '테스트: 정상 응답 - 이 로그는 이메일로 발송되지 않습니다',
    );

    return {
      message: '정상 응답 테스트 완료',
      status: 200,
      timestamp: new Date().toISOString(),
      note: '이 응답은 CloudWatch에만 로그가 남고 이메일은 발송되지 않습니다.',
    };
  }

  // 5. 모든 에러 상태코드 리스트
  @Get('error-list')
  getErrorList() {
    return {
      message: '테스트 가능한 에러 상태코드 목록',
      critical_errors: {
        description: '즉시 이메일 알림이 발송되는 Critical 에러들',
        endpoints: [
          'GET /test/critical/server-error (500)',
          'GET /test/critical/bad-gateway (502)',
          'GET /test/critical/service-unavailable (503)',
          'GET /test/error/500?message=커스텀메시지',
          'GET /test/error/504?message=Gateway Timeout',
        ],
      },
      warning_errors: {
        description: '이메일 알림이 발송되는 Warning 에러들',
        endpoints: [
          'GET /test/warning/unauthorized (401)',
          'GET /test/warning/forbidden (403)',
          'GET /test/warning/conflict (409)',
          'GET /test/error/401?message=커스텀메시지',
          'GET /test/error/423?message=계정 잠김',
        ],
      },
      no_email_alerts: {
        description: '이메일 알림이 발송되지 않는 응답들',
        endpoints: [
          'GET /test/success (200)',
          'GET /test/error/400?message=Bad Request',
          'GET /test/error/404?message=Not Found',
        ],
      },
      custom_test: {
        description: '커스텀 상태코드 테스트',
        format: 'GET /test/error/{statusCode}?message={customMessage}',
        example: 'GET /test/error/500?message=데이터베이스 연결 실패',
      },
    };
  }
}
