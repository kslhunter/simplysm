import { type Accessor, createContext, useContext } from "solid-js";

/**
 * 공유 데이터 정의
 *
 * @remarks
 * SharedDataProvider에 전달하여 서버 데이터 구독을 설정한다.
 */
export interface SharedDataDefinition<TData> {
  /** 서비스 연결 key (useServiceClient의 connect key와 동일) */
  serviceKey: string;
  /** 데이터 조회 함수 (changeKeys가 있으면 해당 항목만 부분 갱신) */
  fetch: (changeKeys?: Array<string | number>) => Promise<TData[]>;
  /** 항목의 고유 key 추출 함수 */
  getKey: (item: TData) => string | number;
  /** 정렬 기준 배열 (여러 기준 적용 가능) */
  orderBy: [(item: TData) => unknown, "asc" | "desc"][];
  /** 서버 이벤트 필터 (같은 name의 이벤트 중 filter가 일치하는 것만 수신) */
  filter?: unknown;
}

/**
 * 공유 데이터 접근자
 *
 * @remarks
 * 각 데이터 key에 대한 반응형 접근 및 변경 알림을 제공한다.
 */
export interface SharedDataAccessor<TData> {
  /** 반응형 항목 배열 */
  items: Accessor<TData[]>;
  /** key로 단일 항목 조회 */
  get: (key: string | number | undefined) => TData | undefined;
  /** 서버에 변경 이벤트 전파 (모든 구독자에게 refetch 트리거) */
  emit: (changeKeys?: Array<string | number>) => Promise<void>;
}

/**
 * 공유 데이터 Context 값
 *
 * @remarks
 * - configure 호출 전: wait, busy, configure만 접근 가능. 데이터 접근 시 throw
 * - configure 호출 후: 각 데이터 key별 SharedDataAccessor와 전체 상태 관리 메서드 포함
 */
export type SharedDataValue<TSharedData extends Record<string, unknown>> = {
  [K in keyof TSharedData]: SharedDataAccessor<TSharedData[K]>;
} & {
  /** 모든 초기 fetch 완료까지 대기 */
  wait: () => Promise<void>;
  /** fetch 진행 중 여부 */
  busy: Accessor<boolean>;
  /** definitions를 설정하여 데이터 구독 시작 */
  configure: (definitions: {
    [K in keyof TSharedData]: SharedDataDefinition<TSharedData[K]>;
  }) => void;
};

/** 공유 데이터 Context */
export const SharedDataContext = createContext<SharedDataValue<Record<string, unknown>>>();

/**
 * 공유 데이터에 접근하는 훅
 *
 * @throws SharedDataProvider가 없으면 에러 발생
 */
export function useSharedData<
  TSharedData extends Record<string, unknown> = Record<string, unknown>,
>(): SharedDataValue<TSharedData> {
  const context = useContext(SharedDataContext);
  if (!context) {
    throw new Error("useSharedData는 SharedDataProvider 내부에서만 사용할 수 있습니다");
  }
  return context as unknown as SharedDataValue<TSharedData>;
}
