import { Injectable } from '@nestjs/common';
import {
  CloudWatchLogsClient,
  PutLogEventsCommand,
  CreateLogStreamCommand,
  DescribeLogStreamsCommand,
} from '@aws-sdk/client-cloudwatch-logs';

@Injectable()
export class CloudWatchLogger {
  private client: CloudWatchLogsClient;
  private logGroupName = 'pro-hai';

  constructor() {
    this.client = new CloudWatchLogsClient({
      region: process.env.AWS_REGION || 'ap-northeast-2',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
  }

  async sendLog(
    statusCode: number,
    method: string,
    path: string,
    ip: string,
    user: string,
    userAgent: string,
    responseTime: number,
    customMessage: string,
  ) {
    const logMessage = this.formatLogMessage(
      statusCode,
      method,
      path,
      ip,
      user,
      userAgent,
      responseTime,
      customMessage,
    );

    try {
      const logStreamName = this.getLogStreamName();

      // 로그스트림이 없으면 생성
      await this.ensureLogStreamExists(logStreamName);

      const command = new PutLogEventsCommand({
        logGroupName: this.logGroupName,
        logStreamName: logStreamName,
        logEvents: [
          {
            timestamp: Date.now(),
            message: logMessage,
          },
        ],
      });

      await this.client.send(command);
    } catch (error) {
      console.error('CloudWatch 로그 전송 실패:', error);
    }
  }

  private async ensureLogStreamExists(logStreamName: string) {
    try {
      // 로그스트림 존재 확인
      const describeCommand = new DescribeLogStreamsCommand({
        logGroupName: this.logGroupName,
        logStreamNamePrefix: logStreamName,
      });

      const response = await this.client.send(describeCommand);
      const exists = response.logStreams?.some(
        (stream) => stream.logStreamName === logStreamName,
      );

      if (!exists) {
        // 로그스트림 생성
        const createCommand = new CreateLogStreamCommand({
          logGroupName: this.logGroupName,
          logStreamName: logStreamName,
        });

        await this.client.send(createCommand);
        console.log(`로그스트림 생성됨: ${logStreamName}`);
      }
    } catch (error) {
      console.error('로그스트림 생성 실패:', error);
    }
  }

  private formatLogMessage(
    statusCode: number,
    method: string,
    path: string,
    ip: string,
    user: string,
    userAgent: string,
    responseTime: number,
    customMessage: string,
  ): string {
    const ipType = this.getIpType(ip);
    const environment = process.env.NODE_ENV || 'development';
    const timestamp = new Date().toLocaleString('ko-KR');

    return `[${customMessage}] ${statusCode} ${method} ${path}
IP: ${ip} (${ipType})
사용자: ${user}
User-Agent: ${userAgent}
응답시간: ${responseTime}ms
환경: ${environment}
요청시간: ${timestamp}`;
  }

  private getIpType(ip: string): string {
    if (ip === '127.0.0.1' || ip === '::1') return 'localhost';
    if (
      ip.startsWith('192.168.') ||
      ip.startsWith('10.') ||
      ip.startsWith('172.16.')
    )
      return 'private';
    return 'external';
  }

  private getLogStreamName(): string {
    const date = new Date().toISOString().split('T')[0];
    return `backend-${date}`;
  }
}
