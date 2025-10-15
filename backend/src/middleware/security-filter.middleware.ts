import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { CloudWatchLogger } from 'src/utils/cloudwatch-logger';

@Injectable()
export class SecurityFilterMiddleware implements NestMiddleware {
  constructor(private cloudWatchLogger: CloudWatchLogger) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const url = req.originalUrl?.toLowerCase() || '';
    const method = req.method;
    const query = req.query ? JSON.stringify(req.query).toLowerCase() : '';

    // 차단할 URL 패턴 목록
    const blockedUrlPatterns = [
      // 기존 패턴
      /phpunit/i,
      /eval-stdin\.php/i,
      /vendor\/phpunit/i,
      /lib\/phpunit/i,
      /\/.env/i,
      /\.git\//i,
      /wp-login/i,
      /wp-admin/i,
      /wp-content/i,
      /wordpress/i,
      /containers\/json/i,
      /hello\.world/i,
      /index\.php\?lang=.*?\.\./i,

      // 새로 발견된 패턴
      /admin\/config\.php/i, // 관리자 구성 파일 접근 시도
      /owa/i, // Exchange 서버 로그인/스캐닝 전체 차단 (기존 /owa\/auth\/logon\.aspx/i에서 변경)
      /autodiscover\/autodiscover\.json/i, // Exchange 서버 탐색
      /reportserver/i, // SQL 서버 보고서 서비스

      // CloudWatch 404 로그 기반 추가 악성 패턴
      /core\/skin\/login\.aspx/i, // 의심스러운 로그인 경로
      /oa_html\/appslocallogin\.jsp/i, // Oracle Apps 로그인
      /wp-json/i, // 워드프레스 REST API
      /solr\/?/i, // Apache Solr
      /webinterface\/?/i, // WebInterface
      /zabbix\/favicon\.ico/i, // Zabbix 모니터링
      /login\.do/i, // 의심스러운 로그인
      /ssi\.cgi\/login\.htm/i, // CGI 로그인
      /console$/i, // console 엔드포인트
      /alive\.php/i, // alive.php 스캐닝
      /teorema505/i, // 의심스러운 경로
      /developmentserver\/metadatauploader/i, // 개발 서버 업로더
      /license\.txt/i, // 라이선스 파일
      /dns-query/i, // DNS over HTTPS
      /^\/query(\?|$)/i, // /query 또는 /query?로 시작
      /^\/resolve(\?|$)/i, // /resolve 또는 /resolve?로 시작
      /security\.txt/i, // 보안 연락처 파일

      // 로그에서 발견된 추가 패턴들
      /ecp\/Current\/exporttool/i, // Exchange Control Panel 취약점 공격
      /remote\/login/i, // 원격 로그인 시도 (모든 쿼리 파라미터 포함)
      /rdweb/i, // 원격 데스크톱 웹 페이지
      /\+CSCOE\+\/logon\.html/i, // Cisco VPN 로그인 페이지
      /actuator\//i, // 모든 Spring Boot Actuator 엔드포인트
      /api\/actuator\//i, // API 경로의 Actuator 엔드포인트도 차단
      /^\/env$/i, // Spring 환경변수 노출 시도
      /webfig\//i, // MikroTik 라우터 웹 인터페이스
      /geoserver\/web\//i, // GeoServer 웹 인터페이스
      /jasperserver(-pro)?\/login\.html/i, // JasperReports 서버
      /cgi-bin\/authLogin\.cgi/i, // QNap 및 기타 장치 인증 취약점
      /cgi-bin\/config\.exp/i, // CGI 설정 파일 접근
      /sitecore\/shell\/sitecore\.version\.xml/i, // Sitecore 버전 정보 노출
      /Telerik\.Web\.UI\.WebResource\.axd\?type=rau/i, // Telerik UI 취약점
      /xmldata\?item=all/i, // XML 데이터 노출 시도
      /partymgr\/control\/main/i, // Apache OFBiz 취약점
      /aspera\/faspex\//i, // Aspera 파일 전송 인터페이스
      /ipfs\//i, // IPFS 게이트웨이 접근 시도
      /showLogin\.cc/i, // 특정 로그인 페이지 스캐닝
      /ab2[gh]/i, // 스캔 봇 패턴
      /aaa[0-9]/i, // 스캔 봇 패턴
      /aab[0-9]/i, // 스캔 봇 패턴
      /identity$/i, // 신원 확인 엔드포인트
      /status\.php$/i, // 상태 확인 페이지
      /owncloud\/status\.php/i, // Owncloud 상태 페이지
      /php\/login\.php/i, // PHP 로그인 페이지
      /internal_forms_authentication/i, // 내부 인증 폼
      /sugar_version\.json/i, // SugarCRM 버전 정보
      /cf_scripts\/scripts\/ajax\/ckeditor/i, // ColdFusion 취약점
      /ext-js\/app\/common\/zld_product_spec\.js/i, // ZyXEL 장치 정보
      /css\/images\/PTZOptics_powerby\.png/i, // PTZ 카메라 패턴
      /js\/NewWindow_2_all\.js/i, // 악성 자바스크립트 파일
      /helpdesk\/WebObjects\/Helpdesk\.woa/i, // Apple 헬프데스크 취약점
      /__down\?/i, // 다운로드 시도

      // VPN 및 원격 접속 관련 패턴
      /userportal\//i, // 사용자 포털 접근 시도
      /webclient\//i, // 웹 클라이언트 접근 시도
      /sslvpn/i, // SSL VPN 접근 시도
      /dana-na\/auth\//i, // Pulse Secure VPN 접근 시도
      /global-protect\/login/i, // Palo Alto GlobalProtect VPN 접근 시도
      /vpn\//i, // 일반 VPN 접근 시도
      /corporate\/sslvpnuserportal\//i, // 기업용 SSL VPN 포털 접근 시도
      /my\.policy/i, // 정책 파일 접근 시도

      /\/_profiler\/phpinfo/i,
      /\/version$/i,
      /\/api\/me$/i,

      /phpmyadmin/i,
      /sitemap\.xml/i,
      /raephaeyeip4fawe/i,
      /ews/i,

      /\/phpinfo(\.php)?$/i,
      /\/info(\.php)?$/i,
      /\/php_info$/i,
      /\/debug\/default\/view/i,
      /\/_ignition\/execute-solution/i,
      /\/index\.php\/_ignition\/execute-solution/i,
      /\/config\.php$/i,
      /\/vendor\/composer\/installed\.json$/i,
      /\/webui\/?$/i,
      /\/laravel\.log$/i,
      /\/log(s)?\/.*\.log$/i,
      /\/storage\/logs\/.*\.log$/i,
      /\/connector\.sds$/i,
      /\/wiki$/i,

      // 로그에서 발견된 새로운 패턴들 추가
      // WordPress 관련 새 패턴
      /wp-includes\/wlwmanifest\.xml/i, // 기본 WordPress 매니페스트 파일
      /xmlrpc\.php(\?rsd)?/i, // WordPress XML-RPC 인터페이스

      // 특정 디렉토리 하위의 WordPress 파일 접근 시도
      /\/blog\/wp-includes\//i,
      /\/web\/wp-includes\//i,
      /\/website\/wp-includes\//i,
      /\/wp\/wp-includes\//i,
      /\/2020\/wp-includes\//i,
      /\/2019\/wp-includes\//i,
      /\/shop\/wp-includes\//i,
      /\/wp1\/wp-includes\//i,
      /\/wp2\/wp-includes\//i,
      /\/cms\/wp-includes\//i,
      /\/sito\/wp-includes\//i,

      // 의심스러운 PHP 파일 접근 시도
      /\/ec_proxy\.php$/i,
      /\/autocomplete\.php$/i,
      /\/wz\.php$/i,
      /\/cheddarup\.php$/i,

      /^\/dashboard\/?$/i,
      /\/config\.json$/i,
      /^\/login\/?$/i,

      // PHP 파일 스캔 패턴 (file[숫자].php, 기타 특수 PHP 파일)
      /file\d+\.php$/i,
      /\.php\d+$/i,
      /\.PhP\d+$/i,
      /\.an\d+\.php$/i,
      /c\d+f\.php$/i,
      /ed\d+f\.php$/i,
      /class\d+\.php$/i,
      /num\.php$/i,
      /JPG\.php$/i,
      /poj\.php$/i,
      /skj\.php$/i,
      /dox\.php$/i,
      /pn\.php$/i,
      /sty\.php$/i,
      /nc\d*\.php$/i,
      /loi\.php$/i,
      /nas\.php$/i,
      /led\.php$/i,
      /ker\.php$/i,
      /gul\.php$/i,
      /suy\.php$/i,
      /efa4f\.php$/i,
      /ula\.php$/i,
      /tarc\.php$/i,
      /1a\.php$/i,
      /bq\.php$/i,
      /Eva\.php$/i,
      /skk\.php$/i,
      /n1\.php$/i,
      /2index\.php$/i,
      /berm\.php$/i,
      /fs\.php$/i,
      /packed\.php$/i,
      /Njima\.php$/i,
      /erin1\.PhP\d+$/i,
      /elp\.php$/i,
      /ini\.php$/i,
      /hi\.php$/i,
      /h\.php$/i,
      /alfa\.php$/i,
      /data\.php$/i,
      /page\.php$/i,
      /first\.php$/i,
      /bugz\.php$/i,
      /^\/c\/?$/i, // 간단한 디렉토리 열거 시도
      /stalker_portal\/server\/tools\/auth_simple\.php/i, // IPTV/VOD 서버 취약점 공격
      /api\/sonicos\/(tfa|auth)/i, // SonicWall 방화벽 접근 시도
      /wsman$/i, // WS-Management 접근 시도

      // WordPress 관련 새 패턴
      /\/\/wp\//i, // 이중 슬래시 WordPress 경로
      /\/\/blog\//i, // 이중 슬래시 블로그 경로
      /\/\/blog\/robots\.txt/i, // 블로그 robots.txt 접근

      // 마이크로서비스/클라우드 서비스 탐색
      /\/nacos/i, // Alibaba Nacos 서비스 디스커버리 도구
      /\/configuration\/fields\//i, // 설정 필드 접근 시도

      // API 엔드포인트 스캐닝
      /\/api\/v\d+\/announcements/i, // API 버전별 공지사항 스캐닝
      /\/v\d+\/announcements/i, // 버전별 공지사항 스캐닝
      /\/service_center\/notice/i, // 서비스 센터 공지 스캐닝

      // 인증 페이지 탐색
      /\/auth\d*\.html/i, // 다양한 인증 HTML 페이지

      // 새로운 PHP 파일 스캐닝 패턴
      /\/ahax\.php$/i, // 의심스러운 PHP 파일
      /\/aa\.php$/i, // 간단한 이름의 PHP 파일
      /\/dejavu\.php$/i, // 특정 악성 PHP 파일
      /\/golden\.php$/i, // 특정 악성 PHP 파일
      /\/we\.php$/i, // 간단한 이름의 PHP 파일
      /\/ar\.php$/i, // 간단한 이름의 PHP 파일
      /\/bv3\.php$/i, // 특정 악성 PHP 파일
      /\/lc\.php$/i, // 간단한 이름의 PHP 파일

      // 특정 경로 접근 시도
      /\/pyip=/i, // 의심스러운 파라미터 패턴

      // 경로 조작 시도 (이중 슬래시 패턴)
      /\/\/[^\/]+\//i, // 이중 슬래시로 시작하는 의심스러운 경로

      /\/infophp\.php$/i, // PHP 정보 파일 스캐닝
      /\/php_info\.php$/i, // PHP 정보 파일 스캐닝 (기존과 다른 형태)
      /\/jasperserver.*\/login\.html$/i, // JasperReports 서버 로그인 (기존보다 구체적)
      /\/login\.html$/i, // 일반 HTML 로그인 페이지
      /\/api\/session\/properties$/i, // API 세션 속성 접근
      /\/index\.jsp$/i, // JSP 인덱스 파일 접근
      /\/favicon-32x32\.png$/i, // 특정 파비콘 파일 스캐닝

      /phpinfo_test\.php/i, // PHP 정보 노출 시도
      /oauth2\/oidcdiscovery\/.well-known\/openid-configuration/i, // OAuth/OpenID 설정 정보 접근 시도

      /\/telescope(\/.*)?$/i, // Laravel Telescope 디버깅 도구 접근
      /\/server-status$/i, // Apache 서버 상태 페이지 접근
      /\/xxl-job-admin(\/.*)?$/i, // XXL-JOB 관리자 페이지 접근

      // 환경 설정 파일 접근 시도
      /\/config\/.*\.env$/i, // 다양한 환경 설정 파일
      /\/config\.env$/i, // 루트 config.env 파일
      /\/env\.js$/i, // 환경 변수 JavaScript 파일

      // PHP 정보 파일 접근 시도
      /\/phpinfo[0-9]?\.php$/i, // phpinfo 파일 변형들

      // 경로 순회 및 인증 우회 시도
      /\/authorize\/\.\.;.*\/\.\.;.*/i, // 경로 순회 공격 패턴
      /\/oauth2\/oidcdiscovery\/\.well-known\/openid-configuration/i, // OAuth/OpenID 설정 정보 접근
      /business\/appVersion\/get\/qr\/download/i,

      // 설정 파일 노출 시도
      /\.DS_Store/i, // macOS 디렉토리 정보 파일
      /_all_dbs/i, // CouchDB 데이터베이스 목록 노출 시도
      /login\.action/i, // Atlassian JIRA 로그인 페이지 공격
      /v2\/_catalog/i, // Docker Registry API 스캐닝
      /\.vscode\/sftp\.json/i, // VS Code SFTP 설정 파일 노출 시도
      /@vite\/env/i, // Vite 환경 변수 노출 시도
      /\.aws\/config/i, // AWS 설정 파일 노출 시도 (credentials와 별개)
      /\.AWS_\/credentials/i, // 변형된 AWS 자격 증명 파일 접근 시도
      /main\.yml/i, // CI/CD 설정 파일 노출 시도
      /sms\.py/i, // SMS 기능 관련 파일 노출 시도
      /appsettings\.json/i, // .NET 설정 파일 노출 시도
      /api\/config\/config\.yml/i, // API 설정 파일 노출 시도
      /backend\/config\/(development|settings|default)\.yml/i, // 백엔드 설정 파일 노출
      /config\/(local|parameters|storage|application|aws)\.yml/i, // 다양한 설정 파일 노출 시도
      /\.circleci\/configs\/development\.yml/i, // CircleCI 설정 파일 노출 시도
      /my_env\/(palash|chakaash)\.py/i, // 커스텀 환경 스크립트 파일 노출 시도
      /getcpuutil\.php-bakworking/i, // 서버 CPU 정보 노출 시도
      /api\/objects\/codes\.php\.save/i, // API 백업 파일 노출 시도
      /app\.py/i, // Python 애플리케이션 파일 노출 시도
      /swagger\.(js|json)/i, // Swagger API 문서 노출 시도
      /application\.properties/i, // Java 설정 파일 노출 시도
      /settings\.py/i, // Django 설정 파일 노출 시도
      /(server|server-info)(\.php)?$/i, // 서버 정보 노출 시도
      /server_info\.php/i, // 서버 정보 노출 시도
      /admin\/server_info\.php/i, // 관리자 서버 정보 노출 시도
      /wp-config(\.php\.bak)?$/i, // WordPress 설정 파일 백업 노출 시도
      /env\.backup/i, // 환경 설정 백업 파일 노출 시도
      /aws-secret\.yaml/i, // AWS 비밀 정보 노출 시도
      /_phpinfo\.php/i, // PHP 정보 노출 시도
      /odinhttpcall/i, // Odin 스캐너 탐지
      /evox\/about/i, // Evox 스캐너 탐지
      /HNAP1/i, // HNAP 취약점 스캐닝
      /sdk$/i, // SDK 엔드포인트 스캐닝

      // META-INF 파일 접근 시도 (JIRA 취약점 공격)
      /META-INF\/maven\/com\.atlassian\.jira\/jira-webapp-dist\/pom\.properties/i,

      // Jira 설정 파일 노출 시도
      /s\/[a-f0-9]+\/_\/;\/META-INF\/maven\/com\.atlassian\.jira\/jira-webapp-dist\/pom\.properties/i,

      // CSCOE 관련 JavaScript 파일 접근 시도 차단
      /\/\+CSCOE\+\/.*\.js$/i,
      // 중복 슬래시로 시작하는 요청 차단
      /^\/\/robots\.txt$/i,
      // vkey 디렉토리 접근 시도 차단
      /^\/vkey\/$/i,
      // 10자리 숫자로만 이루어진 경로 접근 시도 차단
      /^\/\d{10}$/i,
      // Git 설정 파일 접근 시도 차단
      /^\/(%2e|\.)?git\/config$/i,

      /\.aws\/credentials/i, // AWS 자격 증명 파일 접근 시도 (기존에는 config만 있었음)
      /s3cmd\.ini/i, // S3 명령줄 도구 설정 파일 접근 시도

      // 클라우드 와치 로그에서 발견된 추가 악성 패턴
      /\/Synchronization(\?|$)/i, // 원격 동기화 접근 시도
      /\/api\/v1\/pods/i, // Kubernetes API 접근 시도
      /\/Remote(\?|$)/i, // 원격 접근 시도
      /\/dana-cached\/hc\/HostCheckerInstaller\.osx/i, // Pulse Secure VPN 호스트 체커 설치 파일 접근
      /\/dana-na\/nc\/nc_gina_ver\.txt/i, // Pulse Secure 구성 파일 접근
      /\/global-protect\/portal\/images\//i, // Palo Alto GlobalProtect 취약점 스캐닝
      /\/php\.php$/i, // PHP 파일 접근 시도
      /\/tool\/view\/phpinfo\.view\.php/i, // PHP 정보 노출 시도
      /\/pmd\/index\.php/i, // phpMyDashboard 접근 시도

      // Palo Alto Networks 방화벽 취약점 공격 (URL 인코딩된 경로 순회)
      /\/unauth\/%252e%252e\//i, // %252e는 이중 인코딩된 점(.)
      /\/php\/ztp_gate\.php/i, // Palo Alto ZTP (Zero Touch Provisioning) 취약점
      /\/PAN_help\//i, // Palo Alto Networks 헬프 페이지 접근 시도

      // 환경 설정 파일 접근 시도 (새로운 변형)
      /^\/\.production$/i, // .production 파일
      /^\/\.local$/i, // .local 파일
      /^\/\.remote$/i, // .remote 파일

      /\/mailman\/listinfo\//i, // Mailman 메일링 리스트 관리자 접근 시도
      /\/epa\/scripts\//i, // Network Access Protection 설치 파일 접근 시도
      /\/tr\/?$/i, // /tr/ 경로 스캐닝

      // 새로 추가할 악성 패턴 목록 (기존에 없던 것들만)
      /\+CSCOL\+\/.*\.jar/i, // Java 애플릿 접근 시도
      /env\.dev/i, // 개발 환경 설정 파일
      /docker-compose\.yml/i, // Docker 컴포즈 설정 파일
      /config\/environments\/.*(staging|production|development)\.rb/i, // Ruby 환경 설정 파일
      /config\/settings\.yml/i, // 일반 설정 파일
      /\.gitlab-ci\.yml/i, // GitLab CI 설정 파일
      /bitbucket-pipelines\.yml/i, // Bitbucket 파이프라인 설정 파일
      /sslmgr/i, // SSL 매니저 접근
      /api\/v1\/settings/i, // API 설정 정보 접근
      /\/sse(\/|$)/i, // Server-Sent Events 접근 시도
      /\/(api\/)?mcp(\/|$)/i, // MCP 접근 시도
      /phpdetails\.php/i, // PHP 세부 정보 파일
      /phpversion\.php/i, // PHP 버전 정보 파일
      /php-config\.php/i, // PHP 설정 파일
      /database\.php/i, // 데이터베이스 관련 PHP 파일
      /config\/aws\/credentials/i, // AWS 자격 증명 접근
      /aws\/secrets/i, // AWS 시크릿 접근
      /\.aws\/secrets/i, // AWS 시크릿 접근 (숨김 디렉토리)
      /backup\/env/i, // 환경 설정 백업 파일
      /environment/i, // 환경 설정 파일
      /\.config\/env/i, // 숨김 디렉토리 환경 설정
      /env\.bak/i, // 환경 설정 백업
      /bak\.env/i, // 환경 설정 백업 (다른 형태)
      /progs\/homepage/i, // 프로그램 홈페이지 접근
      /jquery-.*\.slim\.min\.js/i, // jQuery 파일 접근
      /php\/utils\/CmsGetDeviceSoftwareVersion\.php\/\.js\.map/i, // Cisco 장비 취약점 공격
      /nGo9/i, // 특수 경로 접근 시도
      /commandcenter\/deployWebpackage\.do/i, // 원격 배포 취약점
      /mPlayer/i, // 미디어 플레이어 취약점
      /SiteLoader/i, // 사이트 로더 취약점
      /download\/file\.ext/i, // 파일 다운로드 취약점
      /WuEL/i, // Windows Update 취약점
      /unauth\/%252e%252e\/php\/ztp_gate\.php\/PAN_help/i, // PAN 취약점 공격
    ];

    // 차단할 쿼리 파라미터 패턴 목록
    const blockedQueryPatterns = [
      /invokefunction/i,
      /call_user_func/i,
      /eval\(/i,
      /exec\(/i,
      /system\(/i,
      /passthru/i,
      /base64_decode/i,
      /file_get_contents/i,
      /think\\app/i,
      /allow_url_include/i,
      /auto_prepend_file/i,
      /php:\/\/input/i,
      /@zdi\/powershell/i,
      /\/api\/productName$/i,
      /\/copyright\.html$/i,
      /\/commandcenter\/deployWebpackage\.do$/i,
      /\/mPlayer$/i,
      /\/SiteLoader$/i,
      /\/download\/file\.ext$/i,
      /^\/a$/i,
      /\/WuEL$/i,
      /\/rest\/applinks\/1\.0\/manifest$/i,
    ];

    // URL 패턴 체크
    if (blockedUrlPatterns.some((pattern) => pattern.test(url))) {
      await this.cloudWatchLogger.sendLog(
        403,
        method,
        url,
        req.ip || '0.0.0.0',
        '차단된요청',
        req.headers['user-agent'] || 'Unknown',
        0,
        `보안 필터 차단 - 악성 URL 패턴 감지: ${url}`,
      );
      return res.status(403).json({ message: 'Forbidden' });
    }

    // 쿼리 패턴 체크
    if (blockedQueryPatterns.some((pattern) => pattern.test(query))) {
      await this.cloudWatchLogger.sendLog(
        403,
        method,
        url,
        req.ip || '0.0.0.0',
        '차단된요청',
        req.headers['user-agent'] || 'Unknown',
        0,
        `보안 필터 차단 - 악성 쿼리 패턴 감지: ${query}`,
      );
      return res.status(403).json({ message: 'Forbidden' });
    }

    next();
  }
}
