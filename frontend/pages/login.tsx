import { useState, useEffect } from "react";
import { signIn, getSession } from "next-auth/react";
import { useRouter } from "next/router";
import Link from "next/link";
import { useActivityLog } from "../hooks/useActivityLog"; // 추가

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [sessionExpiredMessage, setSessionExpiredMessage] = useState(""); // 새로 추가
  const router = useRouter();
  const { logPageView, logButtonClick, logFormSubmit, logAuthAction } =
    useActivityLog(); // 추가

  // 페이지 진입 로깅
  useEffect(() => {
    logPageView("로그인 페이지");
  }, [logPageView]);

  // URL 쿼리 파라미터 확인 (새로 추가)
  useEffect(() => {
    const { reason } = router.query;

    if (reason === "session_expired") {
      setSessionExpiredMessage(
        "세션이 만료되었습니다. 다른 기기에서 로그인되었을 수 있습니다."
      );
    } else if (reason === "unauthorized") {
      setSessionExpiredMessage("인증이 필요합니다. 다시 로그인해주세요.");
    }
  }, [router.query]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    logButtonClick("이메일 로그인");
    setIsLoading(true);
    setError("");
    setSessionExpiredMessage("");

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("로그인에 실패했습니다. 이메일과 비밀번호를 확인해주세요.");
        logAuthAction("이메일 로그인", false, "credentials");
      } else {
        logAuthAction("이메일 로그인", true, "credentials");
        router.push("/dashboard");
      }
    } catch (error) {
      setError("로그인 중 오류가 발생했습니다.");
      logAuthAction("이메일 로그인", false, "credentials");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKakaoLogin = () => {
    logButtonClick("카카오 로그인");
    setSessionExpiredMessage("");
    signIn("kakao", { callbackUrl: "/dashboard" });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          로그인
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {/* 세션 만료 메시지 (새로 추가) */}
          {sessionExpiredMessage && (
            <div className="mb-4 p-3 bg-orange-100 border border-orange-400 text-orange-700 rounded">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-orange-400"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm">{sessionExpiredMessage}</p>
                </div>
              </div>
            </div>
          )}

          {/* 기존 에러 메시지 */}
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleEmailLogin}>
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700"
              >
                이메일
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700"
              >
                비밀번호
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {isLoading ? "로그인 중..." : "로그인"}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">또는</span>
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={handleKakaoLogin}
                className="w-full inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm bg-yellow-400 text-black text-sm font-medium hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-400"
              >
                카카오로 로그인
              </button>
            </div>
          </div>

          <div className="mt-6 text-center">
            <Link
              href="/register"
              className="text-indigo-600 hover:text-indigo-500"
              onClick={() => logButtonClick("회원가입 페이지 이동")}
            >
              계정이 없으신가요? 회원가입
            </Link>
          </div>

          <div className="mt-4 text-center">
            <Link
              href="/"
              className="text-gray-600 hover:text-gray-500"
              onClick={() => logButtonClick("홈으로 돌아가기")}
            >
              홈으로 돌아가기
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
