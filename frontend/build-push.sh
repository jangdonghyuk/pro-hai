# frontend/build-push.sh
#!/bin/bash

ECR_REGISTRY="632852507243.dkr.ecr.ap-northeast-2.amazonaws.com"
ECR_REPOSITORY="pro-hai-frontend"
IMAGE_TAG="latest"

echo "ECR 로그인 중..."
aws ecr get-login-password --region ap-northeast-2 | docker login --username AWS --password-stdin $ECR_REGISTRY

echo "프론트엔드 이미지 빌드 중..."
docker build -t pro-hai-frontend .

echo "이미지 태그 설정 중..."
docker tag pro-hai-frontend:latest $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG

echo "ECR에 이미지 푸시 중..."
docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG

echo "프론트엔드 빌드 & 푸시 완료!"