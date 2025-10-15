import { Injectable } from '@nestjs/common';
import {
  CloudWatchLogsClient,
  PutLogEventsCommand,
  CreateLogStreamCommand,
  DescribeLogStreamsCommand,
} from '@aws-sdk/client-cloudwatch-logs';
import * as nodemailer from 'nodemailer';

interface EmailConfig {
  enabled: boolean;
  from: string;
  recipients: string[];
}

@Injectable()
export class CloudWatchLogger {
  private client: CloudWatchLogsClient;
  private transporter: nodemailer.Transporter;
  private logGroupName = 'pro-hai';
  private emailConfig: EmailConfig;

  // 이메일 알림을 보낼 에러 상태코드
  private criticalStatusCodes = [500, 502, 503, 504];
  private warningStatusCodes = [400, 401, 403, 404, 409, 423];

  constructor() {
    this.client = new CloudWatchLogsClient({
      region: process.env.AWS_REGION || 'ap-northeast-2',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });

    // 이메일 설정 로드
    this.emailConfig = {
      enabled: process.env.ERROR_EMAIL_NOTIFICATIONS_ENABLED === 'true',
      from: process.env.GMAIL_USER || '',
      recipients: (process.env.ERROR_NOTIFICATION_TO_EMAILS || '')
        .split(',')
        .filter((email) => email.trim()),
    };

    // Gmail Nodemailer transporter 설정
    if (
      this.emailConfig.enabled &&
      process.env.GMAIL_USER &&
      process.env.GOOGLE_APP_PASSWORD
    ) {
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GOOGLE_APP_PASSWORD, // 기존에 있는 Google App Password 사용
        },
      });

      // transporter 연결 테스트 (선택적)
      this.transporter.verify((error, success) => {
        if (error) {
          console.error('Gmail transporter 설정 오류:', error);
        } else {
          console.log('Gmail transporter 설정 완료');
        }
      });
    }
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
      // CloudWatch 로그 전송 (기존 기능)
      await this.sendToCloudWatch(logMessage);

      // 에러 레벨에 따른 이메일 알림
      if (this.shouldSendEmail(statusCode)) {
        await this.sendErrorEmail(
          statusCode,
          method,
          path,
          ip,
          user,
          userAgent,
          responseTime,
          customMessage,
        );
      }
    } catch (error) {
      console.error('로그 전송 실패:', error);
    }
  }

  // 이메일 없이 CloudWatch만 전송하는 메소드 추가
  async sendLogOnly(
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
      // CloudWatch 로그만 전송 (이메일 없음)
      await this.sendToCloudWatch(logMessage);
    } catch (error) {
      console.error('로그 전송 실패:', error);
    }
  }

  private async sendToCloudWatch(logMessage: string) {
    const logStreamName = this.getLogStreamName();
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
  }

  private shouldSendEmail(statusCode: number): boolean {
    if (
      !this.emailConfig.enabled ||
      this.emailConfig.recipients.length === 0 ||
      !this.transporter
    ) {
      return false;
    }

    return (
      this.criticalStatusCodes.includes(statusCode) ||
      this.warningStatusCodes.includes(statusCode)
    );
  }

  private async sendErrorEmail(
    statusCode: number,
    method: string,
    path: string,
    ip: string,
    user: string,
    userAgent: string,
    responseTime: number,
    customMessage: string,
  ) {
    if (!this.transporter) {
      console.warn('Gmail transporter가 설정되지 않았습니다.');
      return;
    }

    try {
      const severity = this.getErrorSeverity(statusCode);
      const subject = `🚨 [${severity}] ${process.env.NODE_ENV?.toUpperCase() || 'DEV'} API 에러 알림 - ${statusCode} ${method} ${path}`;

      const htmlBody = this.generateEmailTemplate(
        statusCode,
        method,
        path,
        ip,
        user,
        userAgent,
        responseTime,
        customMessage,
        severity,
      );

      const textBody = this.generatePlainTextEmail(
        statusCode,
        method,
        path,
        ip,
        user,
        userAgent,
        responseTime,
        customMessage,
      );

      const mailOptions = {
        from: `"Pro-Hai 에러 알림" <${this.emailConfig.from}>`,
        to: this.emailConfig.recipients.join(','),
        subject: subject,
        text: textBody,
        html: htmlBody,
        priority:
          severity === 'CRITICAL' ? ('high' as const) : ('normal' as const), // 우선순위 설정
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log(
        `✅ 에러 알림 이메일 전송 완료: ${statusCode} ${method} ${path} (MessageId: ${info?.messageId || 'unknown'})`,
      );
    } catch (error) {
      console.error('❌ 이메일 전송 실패:', error);
      // 이메일 전송 실패해도 애플리케이션은 계속 동작하도록 에러를 던지지 않음
    }
  }

  private getErrorSeverity(statusCode: number): string {
    if (this.criticalStatusCodes.includes(statusCode)) {
      return 'CRITICAL';
    } else if (this.warningStatusCodes.includes(statusCode)) {
      return 'WARNING';
    } else {
      return 'INFO';
    }
  }

  private generateEmailTemplate(
    statusCode: number,
    method: string,
    path: string,
    ip: string,
    user: string,
    userAgent: string,
    responseTime: number,
    customMessage: string,
    severity: string,
  ): string {
    const severityColor = severity === 'CRITICAL' ? '#dc3545' : '#ffc107';
    const severityIcon = severity === 'CRITICAL' ? '🔥' : '⚠️';
    const timestamp = new Date().toLocaleString('ko-KR');

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                margin: 0; 
                padding: 20px; 
                background-color: #f8f9fa; 
                line-height: 1.6;
            }
            .container { 
                max-width: 600px; 
                margin: 0 auto; 
                background-color: white; 
                border-radius: 12px; 
                overflow: hidden;
                box-shadow: 0 4px 12px rgba(0,0,0,0.1); 
            }
            .header { 
                background: linear-gradient(135deg, ${severityColor}, ${severityColor}dd);
                color: white; 
                padding: 24px; 
                text-align: center;
            }
            .severity { 
                font-size: 24px; 
                font-weight: bold; 
                margin-bottom: 8px;
            }
            .env-badge {
                background-color: rgba(255,255,255,0.2);
                padding: 4px 12px;
                border-radius: 20px;
                font-size: 14px;
                display: inline-block;
            }
            .content { padding: 24px; }
            .details { 
                background-color: #f8f9fa; 
                padding: 20px; 
                border-radius: 8px; 
                margin: 16px 0; 
            }
            .detail-row { 
                display: flex; 
                margin-bottom: 12px; 
                align-items: flex-start;
            }
            .label { 
                font-weight: 600; 
                color: #495057; 
                min-width: 100px;
                margin-right: 12px;
            }
            .value { 
                color: #212529; 
                word-break: break-all;
                flex: 1;
            }
            .message-box { 
                background: linear-gradient(135deg, #fff3cd, #ffeaa7);
                border-left: 4px solid #ffc107; 
                padding: 20px; 
                margin: 20px 0; 
                border-radius: 0 8px 8px 0;
            }
            .footer { 
                text-align: center; 
                margin-top: 32px; 
                padding-top: 20px;
                border-top: 1px solid #dee2e6;
                color: #6c757d; 
                font-size: 14px; 
            }
            .quick-actions {
                margin-top: 20px;
                text-align: center;
            }
            .btn {
                display: inline-block;
                padding: 10px 20px;
                margin: 0 8px;
                text-decoration: none;
                border-radius: 6px;
                font-weight: 500;
                font-size: 14px;
            }
            .btn-primary {
                background-color: #007bff;
                color: white;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="severity">${severityIcon} ${severity} 에러 발생</div>
                <div class="env-badge">${process.env.NODE_ENV?.toUpperCase() || 'DEVELOPMENT'} 환경</div>
            </div>
            
            <div class="content">
                <div class="details">
                    <div class="detail-row">
                        <div class="label">HTTP 상태:</div>
                        <div class="value"><strong>${statusCode} ${method} ${path}</strong></div>
                    </div>
                    <div class="detail-row">
                        <div class="label">발생 시간:</div>
                        <div class="value">${timestamp}</div>
                    </div>
                    <div class="detail-row">
                        <div class="label">응답 시간:</div>
                        <div class="value">${responseTime}ms</div>
                    </div>
                    <div class="detail-row">
                        <div class="label">사용자:</div>
                        <div class="value">${user}</div>
                    </div>
                    <div class="detail-row">
                        <div class="label">IP 주소:</div>
                        <div class="value">${ip} <small>(${this.getIpType(ip)})</small></div>
                    </div>
                    <div class="detail-row">
                        <div class="label">User-Agent:</div>
                        <div class="value"><small>${userAgent}</small></div>
                    </div>
                </div>
                
                <div class="message-box">
                    <strong>🔍 에러 메시지:</strong><br>
                    <code style="background-color: rgba(0,0,0,0.1); padding: 8px; border-radius: 4px; display: block; margin-top: 8px; font-family: 'Courier New', monospace;">${customMessage}</code>
                </div>

                <div class="quick-actions">
                    <a href="https://console.aws.amazon.com/cloudwatch/home?region=${process.env.AWS_REGION || 'ap-northeast-2'}#logsV2:log-groups/log-group/${this.logGroupName}" class="btn btn-primary" target="_blank">
                        CloudWatch 로그 확인
                    </a>
                </div>
            </div>
            
            <div class="footer">
                <p><strong>Pro-Hai 백엔드 모니터링 시스템</strong></p>
                <p>이 알림은 자동으로 생성되었습니다. 즉시 확인이 필요합니다.</p>
                <p><small>전송 시간: ${new Date().toISOString()}</small></p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  private generatePlainTextEmail(
    statusCode: number,
    method: string,
    path: string,
    ip: string,
    user: string,
    userAgent: string,
    responseTime: number,
    customMessage: string,
  ): string {
    const severity = this.getErrorSeverity(statusCode);
    const timestamp = new Date().toLocaleString('ko-KR');

    return `
🚨 ${severity} 에러 알림 - ${process.env.NODE_ENV?.toUpperCase() || 'DEVELOPMENT'} 환경

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 요청 정보
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• HTTP 상태: ${statusCode} ${method} ${path}
• 발생 시간: ${timestamp}
• 응답 시간: ${responseTime}ms
• 사용자: ${user}
• IP 주소: ${ip} (${this.getIpType(ip)})
• User-Agent: ${userAgent}

🔍 에러 메시지:
${customMessage}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 조치 사항
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. CloudWatch 로그에서 상세 정보를 확인하세요
2. ${severity === 'CRITICAL' ? '즉시 대응이 필요합니다' : '모니터링을 계속하세요'}
3. 반복적인 에러인지 확인하세요

Pro-Hai 백엔드 모니터링 시스템
전송 시간: ${new Date().toISOString()}
    `;
  }

  // 기존 메소드들 (수정 없음)
  private async ensureLogStreamExists(logStreamName: string) {
    try {
      const describeCommand = new DescribeLogStreamsCommand({
        logGroupName: this.logGroupName,
        logStreamNamePrefix: logStreamName,
      });

      const response = await this.client.send(describeCommand);
      const exists = response.logStreams?.some(
        (stream) => stream.logStreamName === logStreamName,
      );

      if (!exists) {
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
