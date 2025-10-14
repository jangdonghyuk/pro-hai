import { useSession, signIn, signOut } from "next-auth/react";
import Link from "next/link";
import { useEffect } from "react";
import { useActivityLog } from "../hooks/useActivityLog";
import Head from "next/head";

export default function Home() {
  const { data: session, status } = useSession();
  const { logPageView, logButtonClick } = useActivityLog();

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
    <>
      <Head>
        <title>프로하이 - 기업영업이 쉬워지는 AI 정부지원금 추천 서비스</title>
        <meta
          name="description"
          content="간단한 정보 입력으로 정부지원금 AI 추천부터 영업 리포트 생성까지! 기업 DB 관리와 실시간 지원사업 추천으로 영업이 쉬워집니다."
        />
        <meta
          name="keywords"
          content="정부지원금, AI 추천, 기업영업, 정책자금, 영업관리, 기업DB, 지원사업, 정부혜택"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />

        {/* Open Graph (소셜 미디어) */}
        <meta
          property="og:title"
          content="프로하이 - 기업영업이 쉬워지는 AI 정부지원금 추천 서비스"
        />
        <meta
          property="og:description"
          content="간단한 정보 입력으로 정부지원금 AI 추천부터 영업 리포트 생성까지! 기업 DB 관리와 실시간 지원사업 추천으로 영업이 쉬워집니다."
        />
        <meta property="og:image" content="/og-image.jpg" />
        <meta property="og:url" content="https://pro-hai.com" />
        <meta property="og:type" content="website" />

        {/* 네이버 관련 - 나중에 채우기 */}
        <meta
          name="naver-site-verification"
          content="나중에_네이버_웹마스터_도구_인증코드_입력"
        />

        {/* 구글 관련 - 나중에 채우기 */}
        <meta
          name="google-site-verification"
          content="나중에_구글_서치_콘솔_인증코드_입력"
        />

        {/* 캐노니컬 URL */}
        <link rel="canonical" href="https://pro-hai.com" />
        {/* 파비콘 추가 */}
        <link rel="icon" href="/favicon.ico" />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/favicon-32x32.png"
        />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </Head>

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
    </>
  );
}
