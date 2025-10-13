import { useSession, signIn, signOut } from "next-auth/react";
import Link from "next/link";
import { useEffect } from "react"; // 추가
import { useActivityLog } from "../hooks/useActivityLog"; // 추가

export default function Home() {
  const { data: session, status } = useSession();
  const { logPageView, logButtonClick } = useActivityLog(); // 추가

  // 페이지 진입 로깅
  useEffect(() => {
    logPageView("홈페이지");
  }, [logPageView]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-3xl font-bold text-center mb-8">Pro-HAI</h1>

        {session ? (
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-gray-600">
                안녕하세요, {session.user?.name}님!
              </p>
              <p className="text-sm text-gray-500">{session.user?.email}</p>
            </div>

            <div className="space-y-2">
              <Link
                href="/dashboard"
                className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 block text-center"
                onClick={() => logButtonClick("대시보드로 이동")}
              >
                대시보드로 이동
              </Link>

              <Link
                href="/admin"
                className="w-full bg-purple-500 text-white py-2 px-4 rounded hover:bg-purple-600 block text-center"
                onClick={() => logButtonClick("관리자 페이지 이동")}
              >
                관리자 페이지
              </Link>

              <button
                onClick={() => {
                  logButtonClick("로그아웃");
                  signOut();
                }}
                className="w-full bg-gray-500 text-white py-2 px-4 rounded hover:bg-gray-600"
              >
                로그아웃
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-center text-gray-600 mb-6">
              로그인이 필요합니다
            </p>

            <div className="space-y-2">
              <Link
                href="/login"
                className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 block text-center"
                onClick={() => logButtonClick("로그인 페이지 이동")}
              >
                로그인
              </Link>

              <Link
                href="/register"
                className="w-full bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600 block text-center"
                onClick={() => logButtonClick("회원가입 페이지 이동")}
              >
                회원가입
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
