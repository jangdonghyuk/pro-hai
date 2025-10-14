import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useActivityLog } from "../hooks/useActivityLog";
import { PUBLIC_API_URL } from "@/utils/const";

interface ActivityLog {
  id: string;
  userId?: string;
  userName?: string;
  isLoggedIn: boolean;
  eventName: string;
  eventType: string;
  ipAddress: string;
  userAgent?: string;
  referrer?: string;
  pageUrl: string;
  pagePath: string;
  sessionId?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

interface LogsResponse {
  logs: ActivityLog[];
  total: number;
  page: number;
  totalPages: number;
}

interface EventTypeStat {
  eventType: string;
  _count: { id: number };
}

interface UserStat {
  userId: string;
  userName: string;
  _count: { id: number };
}

export default function Admin() {
  const [currentPage, setCurrentPage] = useState(1);
  const [eventTypeFilter, setEventTypeFilter] = useState("");
  const [userIdFilter, setUserIdFilter] = useState("");
  const { logPageView } = useActivityLog();

  // 페이지 진입 로깅
  useEffect(() => {
    logPageView("관리자 페이지");
  }, [logPageView]);

  // 활동 로그 조회
  const { data: logsData, isLoading: logsLoading } = useQuery<LogsResponse>({
    queryKey: ["admin-logs", currentPage, eventTypeFilter, userIdFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "20",
      });

      if (eventTypeFilter) params.append("eventType", eventTypeFilter);
      if (userIdFilter) params.append("userId", userIdFilter);

      const response = await fetch(
        `${PUBLIC_API_URL}/activity-log/admin/all?${params}`
      );
      return response.json();
    },
  });

  // 통계 조회
  const { data: statsData } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const response = await fetch(
        `${PUBLIC_API_URL}/activity-log/admin/stats?days=7`
      );
      return response.json();
    },
  });

  // 사용자 통계 조회
  const { data: userStatsData } = useQuery<UserStat[]>({
    queryKey: ["admin-user-stats"],
    queryFn: async () => {
      const response = await fetch(
        `${PUBLIC_API_URL}/activity-log/admin/users?days=7`
      );
      return response.json();
    },
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("ko-KR");
  };

  const getEventTypeBadge = (eventType: string) => {
    const colors: Record<string, string> = {
      page_view: "bg-blue-100 text-blue-800",
      button_click: "bg-green-100 text-green-800",
      form_submit: "bg-yellow-100 text-yellow-800",
      auth_action: "bg-purple-100 text-purple-800",
      api_call: "bg-gray-100 text-gray-800",
    };
    return colors[eventType] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-3xl font-bold text-gray-900">활동 로그 관리</h1>
            <Link href="/" className="text-indigo-600 hover:text-indigo-500">
              홈으로
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* 통계 카드들 */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            {statsData?.eventTypeStats?.map((stat: EventTypeStat) => (
              <div
                key={stat.eventType}
                className="bg-white overflow-hidden shadow rounded-lg"
              >
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div
                        className={`w-8 h-8 rounded-md flex items-center justify-center ${getEventTypeBadge(
                          stat.eventType
                        )}`}
                      >
                        📊
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          {stat.eventType.replace("_", " ").toUpperCase()}
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {stat._count.id}회
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 활성 사용자 */}
          <div className="bg-white shadow rounded-lg mb-8">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                최근 7일 활성 사용자
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {userStatsData?.slice(0, 6).map((user) => (
                  <div key={user.userId} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {user.userName || "익명 사용자"}
                        </p>
                        <p className="text-xs text-gray-500">
                          ID: {user.userId.slice(0, 8)}...
                        </p>
                      </div>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {user._count.id}회
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 필터 */}
          <div className="bg-white shadow rounded-lg mb-6">
            <div className="px-4 py-5 sm:p-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    이벤트 타입
                  </label>
                  <select
                    value={eventTypeFilter}
                    onChange={(e) => {
                      setEventTypeFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">전체</option>
                    <option value="page_view">페이지 뷰</option>
                    <option value="button_click">버튼 클릭</option>
                    <option value="form_submit">폼 제출</option>
                    <option value="auth_action">인증 액션</option>
                    <option value="api_call">API 호출</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    사용자 ID
                  </label>
                  <input
                    type="text"
                    value={userIdFilter}
                    onChange={(e) => {
                      setUserIdFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="사용자 ID 검색"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    onClick={() => {
                      setEventTypeFilter("");
                      setUserIdFilter("");
                      setCurrentPage(1);
                    }}
                    className="w-full bg-gray-500 text-white py-2 px-4 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    필터 초기화
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 활동 로그 테이블 */}
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg font-medium text-gray-900">
                활동 로그 ({logsData?.total || 0}개)
              </h3>
            </div>

            {logsLoading ? (
              <div className="px-4 py-5 text-center">
                <div className="text-gray-500">로딩 중...</div>
              </div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {logsData?.logs.map((log) => (
                  <li key={log.id} className="px-4 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getEventTypeBadge(
                            log.eventType
                          )}`}
                        >
                          {log.eventType}
                        </span>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {log.eventName}
                          </p>
                          <p className="text-sm text-gray-500">
                            {log.userName || "익명"} • {log.pagePath} •{" "}
                            {log.ipAddress}
                          </p>
                        </div>
                      </div>
                      <div className="text-sm text-gray-500">
                        {formatDate(log.createdAt)}
                      </div>
                    </div>
                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                      <div className="mt-2 text-xs text-gray-400">
                        메타데이터: {JSON.stringify(log.metadata)}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* 페이지네이션 */}
          {logsData && logsData.totalPages > 1 && (
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 mt-6 rounded-lg shadow">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  이전
                </button>
                <button
                  onClick={() =>
                    setCurrentPage(
                      Math.min(logsData.totalPages, currentPage + 1)
                    )
                  }
                  disabled={currentPage === logsData.totalPages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  다음
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    총 <span className="font-medium">{logsData.total}</span>개
                    중{" "}
                    <span className="font-medium">
                      {(currentPage - 1) * 20 + 1}
                    </span>
                    -
                    <span className="font-medium">
                      {Math.min(currentPage * 20, logsData.total)}
                    </span>
                    개 표시
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                    <button
                      onClick={() =>
                        setCurrentPage(Math.max(1, currentPage - 1))
                      }
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      이전
                    </button>

                    {Array.from(
                      { length: Math.min(5, logsData.totalPages) },
                      (_, i) => {
                        const pageNum = i + 1;
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                              pageNum === currentPage
                                ? "z-10 bg-indigo-50 border-indigo-500 text-indigo-600"
                                : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      }
                    )}

                    <button
                      onClick={() =>
                        setCurrentPage(
                          Math.min(logsData.totalPages, currentPage + 1)
                        )
                      }
                      disabled={currentPage === logsData.totalPages}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      다음
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
