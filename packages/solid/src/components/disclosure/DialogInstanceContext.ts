import { createContext, useContext } from "solid-js";

/**
 * 다이얼로그 인스턴스 (프로그래매틱 다이얼로그 내부에서 사용)
 */
export interface DialogInstance<TResult> {
  /** 다이얼로그 닫기 (result는 show()의 Promise로 전달) */
  close: (result?: TResult) => void;
}

/** 다이얼로그 인스턴스 Context */
export const DialogInstanceContext = createContext<DialogInstance<unknown>>();

/**
 * 다이얼로그 인스턴스에 접근하는 훅
 *
 * @remarks
 * DialogProvider.show()로 열린 다이얼로그 내부에서만 값이 존재한다.
 * Provider 외부에서 호출하면 undefined를 반환한다.
 *
 * @returns DialogInstance 또는 undefined (Provider 외부)
 */
export function useDialogInstance<TResult = undefined>(): DialogInstance<TResult> | undefined {
  return useContext(DialogInstanceContext) as DialogInstance<TResult> | undefined;
}
