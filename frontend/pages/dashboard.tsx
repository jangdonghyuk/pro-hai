import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useApiWithAuth } from "@/utils/api";
import { useActivityLog } from "../hooks/useActivityLog";
import { PUBLIC_API_URL } from "@/utils/const";

interface HealthCheckResponse {
  status: string;
  message: string;
  timestamp: string;
}

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isHealthChecking, setIsHealthChecking] = useState(false);
  const { authenticatedFetch } = useApiWithAuth();
  const { logPageView, logButtonClick } = useActivityLog();

  // 페이지 진입 로깅 추가
  useEffect(() => {
    if (session) {
      logPageView("대시보드");
    }
  }, [session, logPageView]);

  // 인증되지 않은 사용자 리다이렉트
  useEffect(() => {
    if (status === "loading") return; // 로딩 중일 때는 기다림
    if (!session) {
      router.push("/login");
    }
  }, [session, status, router]);

  // 인증되지 않은 사용자 리다이렉트
  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.push("/login");
    }
  }, [session, status, router]);

  // 헬스체크 쿼리 (수정됨)
  const {
    data: healthData,
    error: healthError,
    refetch: refetchHealth,
    isLoading: isHealthLoading,
  } = useQuery<HealthCheckResponse>({
    queryKey: ["health-check"],
    queryFn: async () => {
      const token = session?.accessToken;
      if (!token) {
        throw new Error("인증 토큰이 없습니다.");
      }

      const response = await authenticatedFetch(`${PUBLIC_API_URL}/health`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response) {
        // authenticatedFetch에서 null 반환 시 (401 에러 처리됨)
        throw new Error("인증이 필요합니다.");
      }

      if (!response.ok) {
        throw new Error("헬스체크 요청에 실패했습니다.");
      }

      return response.json();
    },
    enabled: false,
  });

  const handleHealthCheck = async () => {
    logButtonClick("헬스체크"); // 로깅 추가
    setIsHealthChecking(true);
    try {
      await refetchHealth();
    } finally {
      setIsHealthChecking(false);
    }
  };

  // 로딩 중이거나 세션이 없으면 로딩 표시
  if (status === "loading" || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-3xl font-bold text-gray-900">대시보드</h1>
            <Link
              href="/"
              className="text-indigo-600 hover:text-indigo-500"
              onClick={() => logButtonClick("홈으로 이동")}
            >
              홈으로
            </Link>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* 사용자 정보 섹션 수정 */}
          <div className="bg-white overflow-hidden shadow rounded-lg mb-6">
            <div className="px-4 py-5 sm:p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                사용자 정보
              </h2>
              <dl className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-gray-500">이름</dt>
                  <dd className="text-sm text-gray-900">
                    {session.user?.name}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">이메일</dt>
                  <dd className="text-sm text-gray-900">
                    {session.user?.email}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    사용자 ID
                  </dt>
                  <dd className="text-sm text-gray-900">{session.user?.id}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    로그인 방식
                  </dt>
                  <dd className="text-sm text-gray-900">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        (session as any)?.provider === "kakao"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {(session as any)?.provider === "kakao"
                        ? "🟡 카카오"
                        : "📧 이메일"}
                    </span>
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {/* 헬스체크 섹션 */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                서버 헬스체크
              </h2>

              <div className="mb-4">
                <button
                  onClick={handleHealthCheck}
                  disabled={isHealthChecking || isHealthLoading}
                  className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
                >
                  {isHealthChecking || isHealthLoading
                    ? "확인 중..."
                    : "헬스체크 실행"}
                </button>
              </div>

              {/* 헬스체크 결과 */}
              {healthData && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
                  <h3 className="text-sm font-medium text-green-800 mb-2">
                    ✅ 성공
                  </h3>
                  <div className="text-sm text-green-700">
                    <p>
                      <strong>상태:</strong> {healthData.status}
                    </p>
                    <p>
                      <strong>메시지:</strong> {healthData.message}
                    </p>
                    <p>
                      <strong>시간:</strong>{" "}
                      {new Date(healthData.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}

              {healthError && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
                  <h3 className="text-sm font-medium text-red-800 mb-2">
                    ❌ 실패
                  </h3>
                  <div className="text-sm text-red-700">
                    <p>
                      <strong>에러:</strong> {(healthError as Error).message}
                    </p>
                    <p>
                      <strong>시간:</strong> {new Date().toLocaleString()}
                    </p>
                  </div>
                </div>
              )}

              {!healthData && !healthError && !isHealthLoading && (
                <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-md">
                  <p className="text-sm text-gray-600">
                    헬스체크 버튼을 클릭하여 서버 상태를 확인하세요.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
