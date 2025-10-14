import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { useCallback } from "react";
import { PUBLIC_API_URL } from "@/utils/const";

interface ActivityLogData {
  eventName: string;
  eventType:
    | "page_view"
    | "button_click"
    | "form_submit"
    | "api_call"
    | "auth_action";
  metadata?: Record<string, any>;
}

export const useActivityLog = () => {
  const { data: session } = useSession();
  const router = useRouter();

  const logActivity = useCallback(
    async (data: ActivityLogData) => {
      try {
        const logData = {
          userId: session?.user?.id || null,
          userName: session?.user?.name || null,
          isLoggedIn: !!session,
          eventName: data.eventName,
          eventType: data.eventType,
          userAgent: navigator.userAgent,
          referrer: document.referrer || "",
          pageUrl: window.location.href,
          pagePath: router.asPath,
          sessionId: session?.accessToken ? "session_exists" : null, // 실제 세션 ID는 보안상 노출하지 않음
          metadata: data.metadata,
        };

        await fetch(`${PUBLIC_API_URL}/activity-log`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(logData),
        });
      } catch (error) {
        // 로깅 실패는 조용히 처리 (사용자 경험에 영향 없음)
        console.warn("Activity log 전송 실패:", error);
      }
    },
    [session, router.asPath]
  );

  // 페이지 뷰 로깅
  const logPageView = useCallback(
    (pageName?: string) => {
      const eventName = pageName || `${router.pathname} 페이지 진입`;
      logActivity({
        eventName,
        eventType: "page_view",
        metadata: {
          pathname: router.pathname,
          query: router.query,
        },
      });
    },
    [logActivity, router.pathname, router.query]
  );

  // 버튼 클릭 로깅
  const logButtonClick = useCallback(
    (buttonName: string, additionalData?: Record<string, any>) => {
      logActivity({
        eventName: `${buttonName} 버튼 클릭`,
        eventType: "button_click",
        metadata: {
          buttonName,
          page: router.pathname,
          ...additionalData,
        },
      });
    },
    [logActivity, router.pathname]
  );

  // 폼 제출 로깅
  const logFormSubmit = useCallback(
    (
      formName: string,
      success: boolean,
      additionalData?: Record<string, any>
    ) => {
      logActivity({
        eventName: `${formName} 폼 ${success ? "제출 성공" : "제출 실패"}`,
        eventType: "form_submit",
        metadata: {
          formName,
          success,
          page: router.pathname,
          ...additionalData,
        },
      });
    },
    [logActivity, router.pathname]
  );

  // 인증 관련 로깅
  const logAuthAction = useCallback(
    (action: string, success: boolean, method?: string) => {
      logActivity({
        eventName: `${action} ${success ? "성공" : "실패"}`,
        eventType: "auth_action",
        metadata: {
          action,
          success,
          method,
          page: router.pathname,
        },
      });
    },
    [logActivity, router.pathname]
  );

  return {
    logActivity,
    logPageView,
    logButtonClick,
    logFormSubmit,
    logAuthAction,
  };
};
