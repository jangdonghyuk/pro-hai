import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CloudWatchLogger } from '../utils/cloudwatch-logger';

@Controller('health')
export class HealthController {
  constructor(private cloudWatchLogger: CloudWatchLogger) {}

  @UseGuards(AuthGuard('jwt'))
  @Get()
  async healthCheck(@Req() req: any) {
    const startTime = Date.now();

    try {
      // 인증된 사용자 정보 확인
      if (!req.user) {
        const responseTime = Date.now() - startTime;
        await this.cloudWatchLogger.sendLog(
          401,
          'GET',
          '/health',
          req.ip || '0.0.0.0',
          '인증 실패',
          req.headers['user-agent'] || 'Unknown',
          responseTime,
          '인증 헬스체크 실패 - JWT는 통과했지만 사용자 정보 없음',
        );
        throw new Error('사용자 인증 정보가 없습니다');
      }

      const result = {
        status: 'success',
        message: '서버가 정상 작동 중입니다',
        timestamp: new Date().toISOString(),
      };

      const responseTime = Date.now() - startTime;

      await this.cloudWatchLogger.sendLog(
        200,
        'GET',
        '/health',
        req.ip || '0.0.0.0',
        req.user?.name || req.user?.email || '인증된 사용자',
        req.headers['user-agent'] || 'Unknown',
        responseTime,
        `인증 헬스체크 성공 (사용자: ${req.user?.email})`,
      );

      return result;
    } catch (error) {
      const responseTime = Date.now() - startTime;

      // JWT 토큰 관련 에러
      if (error.message?.includes('jwt') || error.message?.includes('token')) {
        await this.cloudWatchLogger.sendLog(
          401,
          'GET',
          '/health',
          req.ip || '0.0.0.0',
          '토큰 오류',
          req.headers['user-agent'] || 'Unknown',
          responseTime,
          `인증 헬스체크 실패 - JWT 토큰 문제 (${error.message})`,
        );
      }
      // 세션 만료 에러
      else if (
        error.message?.includes('session') ||
        error.message?.includes('expired')
      ) {
        await this.cloudWatchLogger.sendLog(
          401,
          'GET',
          '/health',
          req.ip || '0.0.0.0',
          '세션 만료',
          req.headers['user-agent'] || 'Unknown',
          responseTime,
          `인증 헬스체크 실패 - 세션 만료 (${error.message})`,
        );
      }
      // CloudWatch 로그 전송 실패
      else if (
        error.message?.includes('cloudwatch') ||
        error.message?.includes('aws')
      ) {
        await this.cloudWatchLogger.sendLog(
          500,
          'GET',
          '/health',
          req.ip || '0.0.0.0',
          req.user?.name || '인증된 사용자',
          req.headers['user-agent'] || 'Unknown',
          responseTime,
          `인증 헬스체크 실패 - CloudWatch 로그 전송 오류 (${error.message})`,
        );
      }
      // 일반 서버 에러
      else {
        await this.cloudWatchLogger.sendLog(
          500,
          'GET',
          '/health',
          req.ip || '0.0.0.0',
          req.user?.name || '인증된 사용자',
          req.headers['user-agent'] || 'Unknown',
          responseTime,
          `인증 헬스체크 실패 - 서버 내부 오류 (${error.message})`,
        );
      }

      throw error;
    }
  }

  @Get('public')
  async publicHealthCheck(@Req() req: any) {
    const startTime = Date.now();

    try {
      // 시스템 리소스 체크 (예시)
      const memoryUsage = process.memoryUsage();
      if (memoryUsage.heapUsed > 1024 * 1024 * 1024) {
        // 1GB 이상
        const responseTime = Date.now() - startTime;
        await this.cloudWatchLogger.sendLog(
          503,
          'GET',
          '/health/public',
          req.ip || '0.0.0.0',
          '비로그인',
          req.headers['user-agent'] || 'Unknown',
          responseTime,
          `퍼블릭 헬스체크 경고 - 메모리 사용량 높음 (${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB)`,
        );
      }

      const result = {
        status: 'success',
        message: '퍼블릭 헬스체크 성공',
        timestamp: new Date().toISOString(),
      };

      const responseTime = Date.now() - startTime;

      await this.cloudWatchLogger.sendLog(
        200,
        'GET',
        '/health/public',
        req.ip || '0.0.0.0',
        '비로그인',
        req.headers['user-agent'] || 'Unknown',
        responseTime,
        `퍼블릭 헬스체크 성공 (메모리: ${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB)`,
      );

      return result;
    } catch (error) {
      const responseTime = Date.now() - startTime;

      // 시스템 리소스 부족
      if (
        error.message?.includes('memory') ||
        error.message?.includes('heap')
      ) {
        await this.cloudWatchLogger.sendLog(
          503,
          'GET',
          '/health/public',
          req.ip || '0.0.0.0',
          '비로그인',
          req.headers['user-agent'] || 'Unknown',
          responseTime,
          `퍼블릭 헬스체크 실패 - 메모리 부족 (${error.message})`,
        );
      }
      // CloudWatch 연결 실패
      else if (
        error.message?.includes('cloudwatch') ||
        error.message?.includes('aws')
      ) {
        // CloudWatch 오류는 조용히 처리하고 헬스체크는 성공 반환
        console.error('CloudWatch 로그 전송 실패:', error);
        return {
          status: 'success',
          message: '퍼블릭 헬스체크 성공 (로그 전송 실패)',
          timestamp: new Date().toISOString(),
        };
      }
      // 타임스탬프 생성 오류
      else if (
        error.message?.includes('date') ||
        error.message?.includes('time')
      ) {
        await this.cloudWatchLogger.sendLog(
          500,
          'GET',
          '/health/public',
          req.ip || '0.0.0.0',
          '비로그인',
          req.headers['user-agent'] || 'Unknown',
          responseTime,
          `퍼블릭 헬스체크 실패 - 시간 생성 오류 (${error.message})`,
        );
      }
      // 일반 서버 에러
      else {
        await this.cloudWatchLogger.sendLog(
          500,
          'GET',
          '/health/public',
          req.ip || '0.0.0.0',
          '비로그인',
          req.headers['user-agent'] || 'Unknown',
          responseTime,
          `퍼블릭 헬스체크 실패 - 서버 내부 오류 (${error.message})`,
        );
      }

      throw error;
    }
  }
}
