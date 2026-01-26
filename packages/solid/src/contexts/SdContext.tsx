import { createContext, type ParentProps, useContext } from "solid-js";
import { SdError } from "@simplysm/core-common";

interface SdContextValue {
  /** 클라이언트 앱 이름 */
  clientName: string;
}

const SdContext = createContext<SdContextValue>();

export interface SdProviderProps extends ParentProps {
  /** 클라이언트 앱 이름 */
  clientName: string;
}

/**
 * Simplysm Solid 컨텍스트 Provider 컴포넌트.
 *
 * @example
 * ```tsx
 * <SdProvider clientName="solid-demo">
 *   <ThemeProvider>
 *     <App />
 *   </ThemeProvider>
 * </SdProvider>
 * ```
 */
export function SdProvider(props: SdProviderProps) {
  const store: SdContextValue = {
    get clientName() {
      return props.clientName;
    },
  };

  return <SdContext.Provider value={store}>{props.children}</SdContext.Provider>;
}

/**
 * SdContext에 접근하는 hook.
 * SdProvider 내부에서만 사용 가능하다.
 *
 * @returns SdContext 값
 * @throws {SdError} SdProvider 외부에서 호출 시
 *
 * @example
 * ```tsx
 * const sd = useSd();
 * console.log(sd.clientName); // "solid-demo"
 * ```
 */
export function useSd(): SdContextValue {
  const context = useContext(SdContext);
  if (!context) {
    throw new SdError("useSd는 SdProvider 내부에서만 사용할 수 있습니다.");
  }
  return context;
}

/**
 * localStorage 유틸리티 객체
 */
export interface LocalStorageUtils {
  /**
   * localStorage에서 값을 가져온다.
   * clientName 프리픽스가 추가된 키를 사용한다.
   *
   * @param key - localStorage 키
   * @returns 저장된 값 또는 null
   */
  getItem: (key: string) => string | null;

  /**
   * localStorage에 값을 저장한다.
   * clientName 프리픽스가 추가된 키를 사용한다.
   *
   * @param key - localStorage 키
   * @param value - 저장할 값
   */
  setItem: (key: string, value: string) => void;

  /**
   * localStorage에서 값을 삭제한다.
   * clientName 프리픽스가 추가된 키를 사용한다.
   *
   * @param key - localStorage 키
   */
  removeItem: (key: string) => void;
}

/**
 * localStorage 유틸리티 hook.
 * `{clientName}:{key}` 형식으로 키를 사용한다.
 * SdProvider 내부에서만 사용 가능하다.
 *
 * @returns localStorage 유틸리티 객체
 * @throws {SdError} SdProvider 외부에서 호출 시
 *
 * @example
 * ```tsx
 * const storage = useLocalStorage();
 * storage.setItem("my-key", "my-value");
 * // "solid-demo:my-key"로 저장
 * ```
 */
export function useLocalStorage(): LocalStorageUtils {
  const sd = useSd();

  const getPrefixedKey = (key: string): string => {
    return `${sd.clientName}:${key}`;
  };

  return {
    getItem: (key: string) => {
      if (typeof window === "undefined") return null;
      try {
        return localStorage.getItem(getPrefixedKey(key));
      } catch {
        return null;
      }
    },

    setItem: (key: string, value: string) => {
      if (typeof window === "undefined") return;
      try {
        localStorage.setItem(getPrefixedKey(key), value);
      } catch {
        // localStorage 저장 실패 시 무시
      }
    },

    removeItem: (key: string) => {
      if (typeof window === "undefined") return;
      try {
        localStorage.removeItem(getPrefixedKey(key));
      } catch {
        // localStorage 삭제 실패 시 무시
      }
    },
  };
}
