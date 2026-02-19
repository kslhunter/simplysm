import { createContext, useContext, type Accessor, type JSX } from "solid-js";

/** 다이얼로그 기본 설정 */
export interface DialogDefaults {
  /** ESC 키로 닫기 허용 */
  closeOnEscape?: boolean;
  /** 백드롭 클릭으로 닫기 허용 */
  closeOnBackdrop?: boolean;
}

/** 다이얼로그 기본 설정 Context */
export const DialogDefaultsContext = createContext<Accessor<DialogDefaults>>();

/** 프로그래매틱 다이얼로그 옵션 */
export interface DialogShowOptions {
  /** 다이얼로그 제목 */
  title: string;
  /** 헤더 숨김 */
  hideHeader?: boolean;
  /** 닫기 버튼 표시 */
  closable?: boolean;
  /** 백드롭 클릭으로 닫기 */
  closeOnBackdrop?: boolean;
  /** ESC 키로 닫기 */
  closeOnEscape?: boolean;
  /** 크기 조절 가능 */
  resizable?: boolean;
  /** 드래그 이동 가능 */
  movable?: boolean;
  /** 플로팅 모드 (우하단 고정) */
  float?: boolean;
  /** 전체 화면 채우기 */
  fill?: boolean;
  /** 초기 너비 (px) */
  width?: number;
  /** 초기 높이 (px) */
  height?: number;
  /** 최소 너비 (px) */
  minWidth?: number;
  /** 최소 높이 (px) */
  minHeight?: number;
  /** 플로팅 위치 */
  position?: "bottom-right" | "top-right";
  /** 헤더 커스텀 스타일 */
  headerStyle?: JSX.CSSProperties | string;
  /** 닫기 전 확인 함수 (false 반환 시 닫기 취소) */
  canDeactivate?: () => boolean;
}

/** 프로그래매틱 다이얼로그 Context 값 */
export interface DialogContextValue {
  /** 다이얼로그를 열고, 닫힐 때까지 대기하여 결과를 반환 */
  show<T = undefined>(
    factory: () => JSX.Element,
    options: DialogShowOptions,
  ): Promise<T | undefined>;
}

/** 프로그래매틱 다이얼로그 Context */
export const DialogContext = createContext<DialogContextValue>();

/**
 * 프로그래매틱 다이얼로그에 접근하는 훅
 *
 * @throws DialogProvider가 없으면 에러 발생
 */
export function useDialog(): DialogContextValue {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error("useDialog는 DialogProvider 내부에서만 사용할 수 있습니다");
  return ctx;
}
