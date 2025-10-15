import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CloudWatchLogger } from 'src/utils/cloudwatch-logger';

@Injectable()
export class IpFilterGuard implements CanActivate {
  constructor(
    private configService: ConfigService,
    private cloudWatchLogger: CloudWatchLogger,
  ) {}

  // 차단할 IP 목록 (하드코딩 또는 환경변수에서 가져오기)
  private getBlockedIps(): string[] {
    // 환경변수에서 가져오기
    const blockedIpsEnv = this.configService.get<string>('BLOCKED_IPS', '');
    const envIps = blockedIpsEnv
      ? blockedIpsEnv.split(',').map((ip) => ip.trim())
      : [];

    // 기본 차단 IP 목록
    const defaultBlockedIps = [
      '118.235.13.24',
      '103.204.172.41',
      '106.102.142.108',
      '120.24.227.139', // WordPress 스캐닝 시도
      '52.169.148.186', // 의심스러운 PHP 파일 접근 시도
      // 차단할 특정 아이피 목록에 추가
      '4.217.251.13', // 다수의 PHP 파일 접근 시도
      '4.217.168.89', // WordPress 관련 파일 접근 시도
      '4.230.5.29', // PHP 파일 접근 시도
      '52.231.94.41', // 다수의 PHP 파일 접근 시도
      '172.190.142.176', // PHP 파일 접근 시도
      '154.84.184.122', // PROPFIND 메서드 시도
      '190.2.142.78', // 설정 파일 접근 시도
      '185.243.5.79', // WebDAV 파일 접근 시도
      '93.123.109.152', // Git 설정 파일 접근 시도
      '197.220.93.100',
      '104.237.131.149', // SonicOS 인증 페이지 접근 시도
      '198.58.109.185', // WS-Management 접근 시도
      '180.149.125.163', // 디렉토리 열거 시도
      '180.149.126.16', // IPTV/VOD 서버 취약점 공격
      '178.22.24.18', // 원격 로그인 접근 시도
      '165.22.246.234', // WordPress 디렉토리 스캐닝 시도
      '107.172.180.31', // Nacos 서비스 탐색 시도
      '52.69.192.217', // 체계적인 API 엔드포인트 스캐닝
      '196.251.66.181', // 설정 파일 접근 시도
      '181.214.166.34', // PHP 정보 파일 스캐닝 시도
      '45.156.129.136', // JasperServer, 관리자 페이지, API 스캐닝
      '45.156.129.137', // JSP 파일 접근 시도
      '185.177.72.31',
      '35.216.192.168', // 서버 구성 정보 스캐닝 (telescope, server-status)
      '198.211.110.29', // XXL-JOB 관리자 페이지 접근 시도
      '162.243.90.163', // 환경 설정 파일(.env) 접근 시도
      '92.118.39.32', // PHP 정보 파일 스캐닝
      '172.104.187.38', // 경로 순회 및 OAuth 설정 스캐닝
      '104.218.48.218',

      '46.101.111.185', // 다수의 취약점 스캐닝 시도 (Atlassian JIRA, Docker Registry, .vscode/sftp.json)
      '194.67.92.119', // PHP 파일 스캐닝 시도
      '185.177.72.144', // AWS 자격 증명 및 설정 파일 스캐닝 시도
      '167.172.187.11', // Docker Registry API 스캐닝
      '142.93.174.211', // Docker Registry API 스캐닝
      '167.71.36.86', // Odin 스캐너를 이용한 취약점 스캐닝

      '147.182.233.226', // 중복 슬래시를 사용한 robots.txt 접근 시도
      '64.62.197.86', // vkey 디렉토리 접근 시도
      '45.156.128.148', // 관리자 디렉토리 접근 시도
      '68.183.146.153', // Git 설정 파일 접근 시도

      '45.202.76.153', // AWS 자격 증명 파일 접근 시도
      '156.228.189.233', // S3 설정 파일 접근 시도

      // 클라우드 와치 로그에서 발견된 추가 악성 IP
      '141.98.82.26', // 여러 악성 요청 시도 (Synchronization, GlobalProtect 취약점 스캐닝)
      '165.22.128.75', // Kubernetes API 접근 시도
      '45.33.33.141', // 원격 접근 시도
      '45.79.0.154', // Pulse Secure VPN 취약점 스캐닝
      '219.100.163.128', // PHP 파일 접근 시도
      '185.177.72.23', // PHP 정보 파일 접근 시도
      '34.29.52.2', // PHP 파일 접근 시도

      '185.226.197.18',
      '185.226.197.19',
      '185.226.197.23',
      '185.226.197.25',
      '185.180.141.22',
      '185.180.141.23',
      '195.170.172.128', // 체계적인 경로 스캐닝 시도
      '194.187.176.70', // Atlassian 취약점 스캐닝

      '54.206.54.22', // 호주 AWS 리전에서 환경 설정 파일 스캐닝 시도

      '179.43.191.19', // /tr/, /mailman/listinfo/mailman 등 다수 스캐닝 시도
      '44.249.58.72', // EPA 설치 파일 접근 시도
      '15.228.80.158', // 환경 설정 파일(.production, .local, .remote) 접근 시도

      // 새로 추가할 악성 IP 목록 (기존에 없던 것들만)
      '88.210.63.182', // sslmgr 접근 시도
      '185.177.72.30', // test.php 접근 시도
      '209.38.25.227', // +CSCOL+ 관련 파일 접근 시도
      '165.232.168.198', // 환경 설정 파일 접근 시도
      '185.226.197.69', // admin/ 디렉토리 접근 시도
      '202.120.234.94', // sse, mcp 접근 시도
      '69.156.16.17', // 다수의 PHP 파일 접근 시도
    ];

    return [...defaultBlockedIps, ...envIps].filter((ip) => ip.length > 0);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const clientIp = this.getClientIp(request);
    const blockedIps = this.getBlockedIps();

    // IP가 차단 목록에 있는지 확인
    const isBlocked = this.isIpBlocked(clientIp, blockedIps);

    if (isBlocked) {
      this.logBlockedAttempt(clientIp, request);
      throw new ForbiddenException(`Access denied for IP: ${clientIp}`);
    }

    return true;
  }

  private getClientIp(request: any): string {
    // 다양한 방법으로 클라이언트 IP 추출
    return (
      request.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      request.headers['x-real-ip'] ||
      request.connection?.remoteAddress ||
      request.socket?.remoteAddress ||
      request.ip ||
      '0.0.0.0'
    );
  }

  private isIpBlocked(ip: string, blockedIps: string[]): boolean {
    return blockedIps.some((blockedIp) => {
      // CIDR 표기법 지원 (예: 192.168.1.0/24)
      if (blockedIp.includes('/')) {
        return this.isIpInCidr(ip, blockedIp);
      }

      // 와일드카드 지원 (예: 192.168.1.*)
      if (blockedIp.includes('*')) {
        return this.matchWildcard(ip, blockedIp);
      }

      // 정확한 IP 매치
      return ip === blockedIp;
    });
  }

  private isIpInCidr(ip: string, cidr: string): boolean {
    try {
      const [range, bits] = cidr.split('/');
      const mask = ~(2 ** (32 - parseInt(bits, 10)) - 1);

      const ipInt = this.ipToInt(ip);
      const rangeInt = this.ipToInt(range);

      return (ipInt & mask) === (rangeInt & mask);
    } catch {
      return false;
    }
  }

  private matchWildcard(ip: string, pattern: string): boolean {
    const ipParts = ip.split('.');
    const patternParts = pattern.split('.');

    if (ipParts.length !== 4 || patternParts.length !== 4) {
      return false;
    }

    return patternParts.every((part, index) => {
      return part === '*' || part === ipParts[index];
    });
  }

  private ipToInt(ip: string): number {
    return (
      ip.split('.').reduce((acc, octet) => {
        return (acc << 8) + parseInt(octet, 10);
      }, 0) >>> 0
    );
  }

  private async logBlockedAttempt(ip: string, request: any): Promise<void> {
    await this.cloudWatchLogger.sendLog(
      403,
      request.method,
      request.url,
      ip,
      '차단된IP',
      request.headers['user-agent'] || 'Unknown',
      0,
      `IP 차단 - 블랙리스트 IP 접근 시도: ${ip}`,
    );

    // 기존 console.log 유지
    const timestamp = new Date().toISOString();
    console.log(`🚫 [${timestamp}] Blocked IP attempt:`);
    console.log(`   IP: ${ip}`);
    console.log(`   Path: ${request.url}`);
    console.log(`   Method: ${request.method}`);
    console.log(`   User-Agent: ${request.headers['user-agent'] || 'Unknown'}`);
  }
}
