# To-DO

구글 서치 콘솔 등록
네이버 웹마스터도구 등록
인증코드 입력

# 배포 가이드

> ⚠️ **보안 주의사항**: 실제 배포 시 플레이스홀더 값들을 실제 값으로 변경하세요

## 프론트엔드 배포 과정

### 1. 인프라 구성

- **ECR 리포지토리**: `your-app-frontend` 생성
- **EC2 인스턴스**: `your-app-frontend` (Ubuntu 22.04, t2.micro)
- **탄력적 IP** 할당
- **Route 53**: `your-domain.com`, `www.your-domain.com` A/CNAME 레코드
- **Secret Manager**: `your-app/frontend/env` 환경변수 저장

### 2. EC2 환경 설정

```bash
# 시스템 업데이트 및 패키지 설치
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget gnupg lsb-release jq unzip

# Docker 설치
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io
sudo systemctl enable docker
sudo usermod -aG docker ubuntu

# Docker Compose 설치
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# AWS CLI 설치
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
```

### 3. Nginx & SSL 설정

```bash
# Nginx 설치
sudo apt install -y nginx
sudo systemctl enable nginx

# SSL 인증서 발급
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# 자동 갱신 설정
sudo crontab -e
# 추가: 0 2 1 * * /usr/bin/certbot renew --quiet && /usr/bin/systemctl reload nginx
```

### 4. 로컬 빌드 & ECR 푸시

#### Dockerfile (Next.js)

```dockerfile
FROM node:18-alpine AS base

FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./
RUN \
  if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci; \
  else echo "Lockfile not found." && exit 1; \
  fi

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED 1
RUN yarn build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
RUN mkdir .next
RUN chown nextjs:nodejs .next
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"
CMD ["node", "server.js"]
```

#### next.config.js

```javascript
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
};
export default nextConfig;
```

#### 빌드 스크립트 (build-push.sh)

```bash
#!/bin/bash
ECR_REGISTRY="YOUR_ACCOUNT_ID.dkr.ecr.YOUR_REGION.amazonaws.com"
ECR_REPOSITORY="your-app-frontend"
IMAGE_TAG="latest"

echo "ECR 로그인 중..."
aws ecr get-login-password --region YOUR_REGION | docker login --username AWS --password-stdin $ECR_REGISTRY

echo "프론트엔드 이미지 빌드 중..."
docker build -t your-app-frontend .

echo "이미지 태그 설정 중..."
docker tag your-app-frontend:latest $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG

echo "ECR에 이미지 푸시 중..."
docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG

echo "프론트엔드 빌드 & 푸시 완료!"
```

### 5. EC2 배포

#### docker-compose.yml

```yaml
version: "3.8"
services:
  frontend:
    image: YOUR_ACCOUNT_ID.dkr.ecr.YOUR_REGION.amazonaws.com/your-app-frontend:latest
    container_name: your-app-frontend
    ports:
      - "3000:3000"
    env_file:
      - .env
    restart: unless-stopped
```

#### 배포 스크립트 (deploy.sh)

```bash
#!/bin/bash
echo "Secret Manager에서 환경변수 가져오는 중..."
aws secretsmanager get-secret-value \
  --secret-id "your-app/frontend/env" \
  --query SecretString --output text | \
  jq -r 'to_entries[] | "\(.key)=\(.value)"' > .env

echo "ECR 로그인 중..."
aws ecr get-login-password --region YOUR_REGION | \
  docker login --username AWS --password-stdin YOUR_ACCOUNT_ID.dkr.ecr.YOUR_REGION.amazonaws.com

echo "서비스 중지 중..."
docker-compose down

echo "최신 이미지 가져오는 중..."
docker-compose pull

echo "서비스 시작 중..."
docker-compose up -d

echo "임시 .env 파일 삭제..."
rm -f .env

echo "프론트엔드 배포 완료!"
```

---

## 백엔드 배포 과정

### 1. 인프라 구성

- **ECR 리포지토리**: `your-app-backend` 생성
- **EC2 인스턴스**: `your-app-backend` (Ubuntu 22.04, t2.micro)
- **RDS MySQL**: 기존 DB 사용
- **탄력적 IP** 할당
- **Route 53**: `api.your-domain.com` A 레코드
- **Secret Manager**: `your-app/backend/env` 환경변수 저장
- **RDS 보안그룹**: 백엔드 보안그룹 접근 허용

### 2. EC2 환경 설정

```bash
# 프론트엔드와 동일한 과정
# Docker, Docker Compose, AWS CLI, Nginx 설치
```

### 3. SSL 설정

```bash
sudo certbot --nginx -d api.your-domain.com
```

### 4. 로컬 빌드 & ECR 푸시

#### Dockerfile (NestJS)

```dockerfile
FROM node:18-alpine AS base

FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./
COPY prisma ./prisma/
RUN \
  if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci; \
  else echo "Lockfile not found." && exit 1; \
  fi
RUN npx prisma generate

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/dist ./dist
USER nodejs
EXPOSE 3001
ENV PORT 3001
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
```

#### 빌드 스크립트 (build-push.sh)

```bash
#!/bin/bash
ECR_REGISTRY="YOUR_ACCOUNT_ID.dkr.ecr.YOUR_REGION.amazonaws.com"
ECR_REPOSITORY="your-app-backend"
IMAGE_TAG="latest"

echo "ECR 로그인 중..."
aws ecr get-login-password --region YOUR_REGION | docker login --username AWS --password-stdin $ECR_REGISTRY

echo "백엔드 이미지 빌드 중..."
docker build -t your-app-backend .

echo "이미지 태그 설정 중..."
docker tag your-app-backend:latest $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG

echo "ECR에 이미지 푸시 중..."
docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG

echo "백엔드 빌드 & 푸시 완료!"
```

### 5. EC2 배포

#### docker-compose.yml

```yaml
version: "3.8"
services:
  backend:
    image: YOUR_ACCOUNT_ID.dkr.ecr.YOUR_REGION.amazonaws.com/your-app-backend:latest
    container_name: your-app-backend
    ports:
      - "3001:3001"
    env_file:
      - .env
    restart: unless-stopped
```

#### 배포 스크립트 (deploy.sh)

```bash
#!/bin/bash
echo "Secret Manager에서 환경변수 가져오는 중..."
aws secretsmanager get-secret-value \
  --secret-id "your-app/backend/env" \
  --query SecretString --output text | \
  jq -r 'to_entries[] | "\(.key)=\(.value)"' > .env

echo "ECR 로그인 중..."
aws ecr get-login-password --region YOUR_REGION | \
  docker login --username AWS --password-stdin YOUR_ACCOUNT_ID.dkr.ecr.YOUR_REGION.amazonaws.com

echo "서비스 중지 중..."
docker-compose down

echo "최신 이미지 가져오는 중..."
docker-compose pull

echo "서비스 시작 중..."
docker-compose up -d

echo "Prisma 마이그레이션 실행 중..."
docker-compose exec -T backend npx prisma migrate deploy

echo "임시 .env 파일 삭제..."
rm -f .env

echo "백엔드 배포 완료!"
```

### 6. CORS 설정

```typescript
origin: [
  'https://your-domain.com',
  'https://www.your-domain.com',
  'http://localhost:3000'
],
```

### 7. API URL 환경 분리

```typescript
const PUBLIC_API_URL =
  process.env.NODE_ENV === "production"
    ? "https://api.your-domain.com"
    : "http://localhost:3001";
```

---

## 환경 변수 설정

### Secret Manager 구성

#### 프론트엔드 환경변수 (`your-app/frontend/env`)

```json
{
  "NEXTAUTH_SECRET": "your-nextauth-secret",
  "NEXTAUTH_URL": "https://your-domain.com",
  "NEXT_PUBLIC_API_URL": "https://api.your-domain.com",
  "KAKAO_CLIENT_ID": "your-kakao-client-id"
}
```

#### 백엔드 환경변수 (`your-app/backend/env`)

```json
{
  "DATABASE_URL": "mysql://admin:password@your-rds-endpoint:3306/your-database",
  "NODE_ENV": "production",
  "JWT_SECRET": "your-jwt-secret",
  "AWS_ACCESS_KEY_ID": "your-access-key",
  "AWS_SECRET_ACCESS_KEY": "your-secret-key",
  "AWS_REGION": "your-region"
}
```

---

## 최종 구조

```
인터넷 → Route 53 → 탄력적 IP → EC2 → Nginx (SSL) → Docker Container

프론트엔드: https://your-domain.com → port 3000
백엔드: https://api.your-domain.com → port 3001 → RDS MySQL
```

---

## 서버 중지 및 재시작 관리

### 개발 중 서버 중지 (비용 절약)

#### 방법 1: 컨테이너만 중지 (EC2는 실행 상태 유지)

```bash
# 프론트엔드 EC2에서
docker-compose down

# 백엔드 EC2에서
docker-compose down
```

#### 방법 2: EC2 인스턴스 완전 중지 (추천 - 비용 절약)

1. AWS 콘솔 → EC2 → 인스턴스
2. 프론트엔드, 백엔드 인스턴스 선택
3. "인스턴스 상태" → "인스턴스 중지"

### 서버 재시작

#### EC2만 중지한 경우

1. **EC2 인스턴스 시작**

   - AWS 콘솔 → EC2 → 인스턴스 선택 → "인스턴스 시작"

2. **컨테이너 자동 시작 확인**

   ```bash
   # SSH 접속 후 확인
   docker ps

   # 자동 시작되지 않았다면
   docker-compose up -d
   ```

#### 컨테이너만 중지한 경우

```bash
# 각 EC2에서
docker-compose up -d
```

#### 최신 코드로 재배포

```bash
# 로컬에서 이미지 새로 빌드 & 푸시 후
# 각 EC2에서
./deploy.sh
```

### 자동 재시작 설정 확인

현재 설정된 자동 재시작 정책:

- **Docker 서비스**: 부팅 시 자동 시작 (`systemctl enable docker`)
- **컨테이너**: `restart: unless-stopped` 정책으로 자동 재시작
- **탄력적 IP**: EC2 중지/시작해도 동일한 IP 유지
- **도메인**: Route 53 설정 유지되므로 추가 설정 불필요

### 서버 상태 확인 명령어

```bash
# Docker 서비스 상태
sudo systemctl status docker

# 실행 중인 컨테이너 확인
docker ps

# 컨테이너 로그 확인
docker-compose logs

# Nginx 상태 확인
sudo systemctl status nginx

# 서비스 접근 테스트
curl https://your-domain.com
curl https://api.your-domain.com/health
```

---

## 추가 설정 필요 항목

### 실제 배포 시 변경해야 할 값들:

- `YOUR_ACCOUNT_ID`: AWS 계정 ID
- `YOUR_REGION`: AWS 리전 (예: ap-northeast-2)
- `your-domain.com`: 실제 도메인
- `your-app`: 실제 애플리케이션 이름
- `your-rds-endpoint`: 실제 RDS 엔드포인트
- 각종 시크릿 키 및 인증 정보

### 보안 고려사항:

- Secret Manager 값들은 강력한 랜덤 문자열 사용
- RDS 보안그룹은 필요한 접근만 허용
- SSL 인증서 자동 갱신 설정 확인
- Docker 컨테이너 재시작 정책 설정

---

## 트러블슈팅

### 자주 발생하는 문제들:

1. **환경변수 로딩 실패**: Secret Manager 권한 확인
2. **SSL 인증서 발급 실패**: DNS 레코드 전파 대기
3. **Docker 이미지 pull 실패**: ECR 로그인 상태 확인
4. **CORS 에러**: 프론트엔드 도메인이 백엔드 CORS 설정에 포함되었는지 확인
5. **502 Bad Gateway**: Docker 컨테이너 상태 및 포트 확인

### 유용한 디버깅 명령어:

```bash
# Docker 컨테이너 상태 확인
docker ps
docker logs container-name

# 환경변수 확인
docker-compose exec service-name env

# Nginx 설정 테스트
sudo nginx -t

# SSL 인증서 상태 확인
sudo certbot certificates
```
