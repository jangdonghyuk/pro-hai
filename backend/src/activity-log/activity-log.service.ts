import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateActivityLogDto {
  userId?: string;
  userName?: string;
  isLoggedIn: boolean;
  eventName: string;
  eventType:
    | 'page_view'
    | 'button_click'
    | 'form_submit'
    | 'api_call'
    | 'auth_action';
  ipAddress: string;
  userAgent?: string;
  referrer?: string;
  pageUrl: string;
  pagePath: string;
  sessionId?: string;
  metadata?: Record<string, any>;
}

interface FindAllFilters {
  offset: number;
  limit: number;
  eventType?: string;
  userId?: string;
}

@Injectable()
export class ActivityLogService {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateActivityLogDto) {
    return this.prisma.activityLog.create({
      data: {
        userId: data.userId,
        userName: data.userName,
        isLoggedIn: data.isLoggedIn,
        eventName: data.eventName,
        eventType: data.eventType,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        referrer: data.referrer,
        pageUrl: data.pageUrl,
        pagePath: data.pagePath,
        sessionId: data.sessionId,
        metadata: data.metadata ? JSON.stringify(data.metadata) : null,
      },
    });
  }

  async findByUser(userId: string, limit: number = 100) {
    return this.prisma.activityLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async findBySession(sessionId: string) {
    return this.prisma.activityLog.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getRecentLogs(limit: number = 100) {
    return this.prisma.activityLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  // 관리자용 새 메서드들
  async findAllWithFilters(filters: FindAllFilters) {
    const where: any = {};

    if (filters.eventType) {
      where.eventType = filters.eventType;
    }

    if (filters.userId) {
      where.userId = filters.userId;
    }

    const [logs, total] = await Promise.all([
      this.prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: filters.offset,
        take: filters.limit,
      }),
      this.prisma.activityLog.count({ where }),
    ]);

    return {
      logs: logs.map((log) => ({
        ...log,
        metadata: log.metadata ? JSON.parse(log.metadata) : null,
      })),
      total,
      page: Math.floor(filters.offset / filters.limit) + 1,
      totalPages: Math.ceil(total / filters.limit),
    };
  }

  async getDetailedStats(days: number = 7) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const [eventTypeStats, dailyStats, topPages] = await Promise.all([
      // 이벤트 타입별 통계
      this.prisma.activityLog.groupBy({
        by: ['eventType'],
        where: { createdAt: { gte: since } },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      }),

      // 일별 통계
      this.prisma.activityLog.findMany({
        where: { createdAt: { gte: since } },
        select: {
          createdAt: true,
          eventType: true,
        },
      }),

      // 인기 페이지
      this.prisma.activityLog.groupBy({
        by: ['pagePath'],
        where: {
          createdAt: { gte: since },
          eventType: 'page_view',
        },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),
    ]);

    return {
      eventTypeStats,
      dailyStats: this.groupByDay(dailyStats),
      topPages,
    };
  }

  async getUserActivityStats(days: number = 7) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    return this.prisma.activityLog.groupBy({
      by: ['userId', 'userName'],
      where: {
        createdAt: { gte: since },
        isLoggedIn: true,
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 20,
    });
  }

  private groupByDay(logs: Array<{ createdAt: Date; eventType: string }>) {
    const grouped: Record<string, Record<string, number>> = {};

    logs.forEach((log) => {
      const day = log.createdAt.toISOString().split('T')[0];
      if (!grouped[day]) {
        grouped[day] = {};
      }
      if (!grouped[day][log.eventType]) {
        grouped[day][log.eventType] = 0;
      }
      grouped[day][log.eventType]++;
    });

    return Object.entries(grouped).map(([date, stats]) => ({
      date,
      ...stats,
    }));
  }

  async getEventStats(days: number = 7) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    return this.prisma.activityLog.groupBy({
      by: ['eventType', 'eventName'],
      where: {
        createdAt: {
          gte: since,
        },
      },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
    });
  }
}
