import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ActivityLogService,
  CreateActivityLogDto,
} from './activity-log.service';
import { CloudWatchLogger } from '../utils/cloudwatch-logger';
import type { Request } from 'express';

@Controller('activity-log')
export class ActivityLogController {
  constructor(
    private activityLogService: ActivityLogService,
    private cloudWatchLogger: CloudWatchLogger,
  ) {}

  @Post()
  async createLog(
    @Body() data: Omit<CreateActivityLogDto, 'ipAddress'>,
    @Req() req: Request,
  ) {
    const startTime = Date.now();
    const ipAddress = this.getClientIp(req);

    try {
      // 특정 에러 체크: 필수 데이터 누락
      if (!data.eventName || !data.eventType) {
        const responseTime = Date.now() - startTime;
        await this.cloudWatchLogger.sendLog(
          400,
          'POST',
          '/activity-log',
          ipAddress,
          data.userName || '익명',
          req.headers['user-agent'] || 'Unknown',
          responseTime,
          '활동 로그 생성 실패 - 필수 데이터 누락 (eventName 또는 eventType 없음)',
        );
        throw new Error('필수 데이터가 누락되었습니다');
      }

      const result = await this.activityLogService.create({
        ...data,
        ipAddress,
      });

      const responseTime = Date.now() - startTime;
      await this.cloudWatchLogger.sendLog(
        201,
        'POST',
        '/activity-log',
        ipAddress,
        data.userName || '익명',
        req.headers['user-agent'] || 'Unknown',
        responseTime,
        '활동 로그 생성 성공',
      );

      return result;
    } catch (error) {
      const responseTime = Date.now() - startTime;

      // 데이터베이스 제약조건 위반
      if (
        error.message?.includes('constraint') ||
        error.message?.includes('duplicate')
      ) {
        await this.cloudWatchLogger.sendLog(
          409,
          'POST',
          '/activity-log',
          ipAddress,
          data.userName || '익명',
          req.headers['user-agent'] || 'Unknown',
          responseTime,
          `활동 로그 생성 실패 - 데이터 제약조건 위반 (${error.message})`,
        );
      } else {
        await this.cloudWatchLogger.sendLog(
          500,
          'POST',
          '/activity-log',
          ipAddress,
          data.userName || '익명',
          req.headers['user-agent'] || 'Unknown',
          responseTime,
          `활동 로그 생성 실패 - 서버 오류 (${error.message})`,
        );
      }

      throw error;
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('my-logs')
  async getMyLogs(@Req() req: any, @Query('limit') limit?: string) {
    const startTime = Date.now();

    try {
      const userId = req.user?.id;

      // 특정 에러 체크: 사용자 ID 없음
      if (!userId) {
        const responseTime = Date.now() - startTime;
        await this.cloudWatchLogger.sendLog(
          401,
          'GET',
          '/activity-log/my-logs',
          req.ip || '0.0.0.0',
          '인증 실패',
          req.headers['user-agent'] || 'Unknown',
          responseTime,
          '개인 활동 로그 조회 실패 - 사용자 ID 없음 (인증 토큰 문제)',
        );
        throw new Error('사용자 정보를 찾을 수 없습니다');
      }

      // limit 파라미터 검증
      const limitNum = limit ? parseInt(limit) : 100;
      if (limit && (isNaN(limitNum) || limitNum < 1 || limitNum > 1000)) {
        const responseTime = Date.now() - startTime;
        await this.cloudWatchLogger.sendLog(
          400,
          'GET',
          '/activity-log/my-logs',
          req.ip || '0.0.0.0',
          req.user?.name || '인증된 사용자',
          req.headers['user-agent'] || 'Unknown',
          responseTime,
          `개인 활동 로그 조회 실패 - 잘못된 limit 값 (${limit})`,
        );
        throw new Error('limit 값이 올바르지 않습니다');
      }

      const result = await this.activityLogService.findByUser(userId, limitNum);
      const responseTime = Date.now() - startTime;

      await this.cloudWatchLogger.sendLog(
        200,
        'GET',
        '/activity-log/my-logs',
        req.ip || '0.0.0.0',
        req.user?.name || '인증된 사용자',
        req.headers['user-agent'] || 'Unknown',
        responseTime,
        `개인 활동 로그 조회 성공 (${result.length}개 조회)`,
      );

      return result;
    } catch (error) {
      const responseTime = Date.now() - startTime;

      if (
        error.message?.includes('connection') ||
        error.message?.includes('timeout')
      ) {
        await this.cloudWatchLogger.sendLog(
          503,
          'GET',
          '/activity-log/my-logs',
          req.ip || '0.0.0.0',
          req.user?.name || '인증된 사용자',
          req.headers['user-agent'] || 'Unknown',
          responseTime,
          `개인 활동 로그 조회 실패 - 데이터베이스 연결 오류 (${error.message})`,
        );
      } else {
        await this.cloudWatchLogger.sendLog(
          500,
          'GET',
          '/activity-log/my-logs',
          req.ip || '0.0.0.0',
          req.user?.name || '인증된 사용자',
          req.headers['user-agent'] || 'Unknown',
          responseTime,
          `개인 활동 로그 조회 실패 - 서버 오류 (${error.message})`,
        );
      }

      throw error;
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('stats')
  async getStats(@Req() req: any, @Query('days') days?: string) {
    const startTime = Date.now();

    try {
      // days 파라미터 검증
      const daysNum = days ? parseInt(days) : 7;
      if (days && (isNaN(daysNum) || daysNum < 1 || daysNum > 365)) {
        const responseTime = Date.now() - startTime;
        await this.cloudWatchLogger.sendLog(
          400,
          'GET',
          '/activity-log/stats',
          req.ip || '0.0.0.0',
          req.user?.name || '인증된 사용자',
          req.headers['user-agent'] || 'Unknown',
          responseTime,
          `활동 통계 조회 실패 - 잘못된 days 값 (${days}, 1-365 범위 필요)`,
        );
        throw new Error('days 값이 올바르지 않습니다');
      }

      const result = await this.activityLogService.getEventStats(daysNum);
      const responseTime = Date.now() - startTime;

      await this.cloudWatchLogger.sendLog(
        200,
        'GET',
        '/activity-log/stats',
        req.ip || '0.0.0.0',
        req.user?.name || '인증된 사용자',
        req.headers['user-agent'] || 'Unknown',
        responseTime,
        `활동 통계 조회 성공 (${daysNum}일 통계)`,
      );

      return result;
    } catch (error) {
      const responseTime = Date.now() - startTime;

      if (
        error.message?.includes('aggregate') ||
        error.message?.includes('groupBy')
      ) {
        await this.cloudWatchLogger.sendLog(
          500,
          'GET',
          '/activity-log/stats',
          req.ip || '0.0.0.0',
          req.user?.name || '인증된 사용자',
          req.headers['user-agent'] || 'Unknown',
          responseTime,
          `활동 통계 조회 실패 - 데이터 집계 오류 (${error.message})`,
        );
      } else {
        await this.cloudWatchLogger.sendLog(
          500,
          'GET',
          '/activity-log/stats',
          req.ip || '0.0.0.0',
          req.user?.name || '인증된 사용자',
          req.headers['user-agent'] || 'Unknown',
          responseTime,
          `활동 통계 조회 실패 - 서버 오류 (${error.message})`,
        );
      }

      throw error;
    }
  }

  @Get('admin/all')
  async getAllLogs(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('eventType') eventType?: string,
    @Query('userId') userId?: string,
  ) {
    const startTime = Date.now();

    try {
      // 파라미터 검증
      const pageNum = page ? parseInt(page) : 1;
      const limitNum = limit ? parseInt(limit) : 50;

      if (page && (isNaN(pageNum) || pageNum < 1)) {
        const responseTime = Date.now() - startTime;
        await this.cloudWatchLogger.sendLog(
          400,
          'GET',
          '/activity-log/admin/all',
          req.ip || '0.0.0.0',
          '관리자',
          req.headers['user-agent'] || 'Unknown',
          responseTime,
          `관리자 전체 로그 조회 실패 - 잘못된 page 값 (${page})`,
        );
        throw new Error('page 값이 올바르지 않습니다');
      }

      if (limit && (isNaN(limitNum) || limitNum < 1 || limitNum > 1000)) {
        const responseTime = Date.now() - startTime;
        await this.cloudWatchLogger.sendLog(
          400,
          'GET',
          '/activity-log/admin/all',
          req.ip || '0.0.0.0',
          '관리자',
          req.headers['user-agent'] || 'Unknown',
          responseTime,
          `관리자 전체 로그 조회 실패 - 잘못된 limit 값 (${limit}, 1-1000 범위 필요)`,
        );
        throw new Error('limit 값이 올바르지 않습니다');
      }

      const offset = (pageNum - 1) * limitNum;
      const result = await this.activityLogService.findAllWithFilters({
        offset,
        limit: limitNum,
        eventType,
        userId,
      });

      const responseTime = Date.now() - startTime;
      await this.cloudWatchLogger.sendLog(
        200,
        'GET',
        '/activity-log/admin/all',
        req.ip || '0.0.0.0',
        '관리자',
        req.headers['user-agent'] || 'Unknown',
        responseTime,
        `관리자 전체 로그 조회 성공 (페이지: ${pageNum}, 총 ${result.total}개 중 ${result.logs.length}개 조회)`,
      );

      return result;
    } catch (error) {
      const responseTime = Date.now() - startTime;

      if (
        error.message?.includes('permission') ||
        error.message?.includes('access')
      ) {
        await this.cloudWatchLogger.sendLog(
          403,
          'GET',
          '/activity-log/admin/all',
          req.ip || '0.0.0.0',
          '권한 없음',
          req.headers['user-agent'] || 'Unknown',
          responseTime,
          `관리자 전체 로그 조회 실패 - 권한 없음 (${error.message})`,
        );
      } else {
        await this.cloudWatchLogger.sendLog(
          500,
          'GET',
          '/activity-log/admin/all',
          req.ip || '0.0.0.0',
          '관리자',
          req.headers['user-agent'] || 'Unknown',
          responseTime,
          `관리자 전체 로그 조회 실패 - 서버 오류 (${error.message})`,
        );
      }

      throw error;
    }
  }

  @Get('admin/stats')
  async getAdminStats(@Req() req: any, @Query('days') days?: string) {
    const startTime = Date.now();

    try {
      const daysNum = days ? parseInt(days) : 7;
      if (days && (isNaN(daysNum) || daysNum < 1 || daysNum > 365)) {
        const responseTime = Date.now() - startTime;
        await this.cloudWatchLogger.sendLog(
          400,
          'GET',
          '/activity-log/admin/stats',
          req.ip || '0.0.0.0',
          '관리자',
          req.headers['user-agent'] || 'Unknown',
          responseTime,
          `관리자 상세 통계 조회 실패 - 잘못된 days 값 (${days})`,
        );
        throw new Error('days 값이 올바르지 않습니다');
      }

      const result = await this.activityLogService.getDetailedStats(daysNum);
      const responseTime = Date.now() - startTime;

      await this.cloudWatchLogger.sendLog(
        200,
        'GET',
        '/activity-log/admin/stats',
        req.ip || '0.0.0.0',
        '관리자',
        req.headers['user-agent'] || 'Unknown',
        responseTime,
        `관리자 상세 통계 조회 성공 (${daysNum}일 상세 통계)`,
      );

      return result;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      await this.cloudWatchLogger.sendLog(
        500,
        'GET',
        '/activity-log/admin/stats',
        req.ip || '0.0.0.0',
        '관리자',
        req.headers['user-agent'] || 'Unknown',
        responseTime,
        `관리자 상세 통계 조회 실패 - 서버 오류 (${error.message})`,
      );

      throw error;
    }
  }

  @Get('admin/users')
  async getUserStats(@Req() req: any, @Query('days') days?: string) {
    const startTime = Date.now();

    try {
      const daysNum = days ? parseInt(days) : 7;
      if (days && (isNaN(daysNum) || daysNum < 1 || daysNum > 365)) {
        const responseTime = Date.now() - startTime;
        await this.cloudWatchLogger.sendLog(
          400,
          'GET',
          '/activity-log/admin/users',
          req.ip || '0.0.0.0',
          '관리자',
          req.headers['user-agent'] || 'Unknown',
          responseTime,
          `사용자별 활동 통계 조회 실패 - 잘못된 days 값 (${days})`,
        );
        throw new Error('days 값이 올바르지 않습니다');
      }

      const result =
        await this.activityLogService.getUserActivityStats(daysNum);
      const responseTime = Date.now() - startTime;

      await this.cloudWatchLogger.sendLog(
        200,
        'GET',
        '/activity-log/admin/users',
        req.ip || '0.0.0.0',
        '관리자',
        req.headers['user-agent'] || 'Unknown',
        responseTime,
        `사용자별 활동 통계 조회 성공 (${daysNum}일, ${result.length}명 조회)`,
      );

      return result;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      await this.cloudWatchLogger.sendLog(
        500,
        'GET',
        '/activity-log/admin/users',
        req.ip || '0.0.0.0',
        '관리자',
        req.headers['user-agent'] || 'Unknown',
        responseTime,
        `사용자별 활동 통계 조회 실패 - 서버 오류 (${error.message})`,
      );

      throw error;
    }
  }

  private getClientIp(req: Request): string {
    return (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      '0.0.0.0'
    );
  }
}
