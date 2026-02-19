import { createContext, useContext, type Accessor } from "solid-js";

/**
 * Busy 오버레이 표시 방식
 * - `spinner`: 전체 화면 스피너
 * - `bar`: 상단 프로그레스 바
 */
export type BusyVariant = "spinner" | "bar";

/**
 * Busy 오버레이 Context 값
 */
export interface BusyContextValue {
  /** 현재 표시 방식 */
  variant: Accessor<BusyVariant>;
  /** 오버레이 표시 (중첩 호출 가능, 호출 횟수만큼 hide 필요) */
  show: (message?: string) => void;
  /** 오버레이 숨김 (모든 show에 대응하는 hide 호출 후 실제 숨김) */
  hide: () => void;
  /** 프로그레스 바 진행률 설정 (0~100, undefined면 indeterminate) */
  setProgress: (percent: number | undefined) => void;
}

/** Busy 오버레이 Context */
export const BusyContext = createContext<BusyContextValue>();

/**
 * Busy 오버레이에 접근하는 훅
 *
 * @throws BusyProvider가 없으면 에러 발생
 */
export function useBusy(): BusyContextValue {
  const context = useContext(BusyContext);
  if (!context) {
    throw new Error("useBusy는 BusyProvider 내부에서만 사용할 수 있습니다");
  }
  return context;
}
