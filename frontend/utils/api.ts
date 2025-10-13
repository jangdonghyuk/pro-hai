import { signOut } from "next-auth/react";
import { useRouter } from "next/router";

// API 요청 wrapper
export const apiRequest = async (url: string, options: RequestInit = {}) => {
  try {
    const response = await fetch(url, options);

    // 401 에러 시 자동 로그아웃
    if (response.status === 401) {
      // 로그인 페이지로 리다이렉트 (세션 만료 메시지와 함께)
      await signOut({
        redirect: true,
        callbackUrl: "/login?reason=session_expired",
      });
      return null;
    }

    return response;
  } catch (error) {
    console.error("API 요청 에러:", error);
    throw error;
  }
};

// React Hook for API requests with auto logout
export const useApiWithAuth = () => {
  const router = useRouter();

  const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
    try {
      const response = await fetch(url, options);

      if (response.status === 401) {
        // 세션 만료로 로그아웃
        await signOut({ redirect: false });
        router.push("/login?reason=session_expired");
        return null;
      }

      return response;
    } catch (error) {
      console.error("인증된 API 요청 에러:", error);
      throw error;
    }
  };

  return { authenticatedFetch };
};
