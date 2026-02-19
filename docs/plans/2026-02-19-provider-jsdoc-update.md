# Provider JSDoc Update Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** Add JSDoc to all undocumented provider files, following the existing JSDoc pattern (Korean, `@remarks` for dependencies/behavior, `@example` for usage, `@throws` for hooks).

**Architecture:** Each Context + Provider pair is updated together. JSDoc follows the established pattern in `ConfigContext.tsx`, `ThemeContext.tsx`, `LoggerContext.tsx`. After JSDoc is done, review `providers.md` and `README.md` for accuracy.

**Tech Stack:** TypeScript JSDoc comments, Markdown documentation

---

### JSDoc Pattern Reference

Existing pattern from `ConfigContext.tsx`, `ThemeContext.tsx`, `LoggerContext.tsx`:

```typescript
// Interface: short Korean description, field-level docs for non-obvious fields
/** 앱 전역 설정 */
export interface AppConfig {
  /** 클라이언트 식별자 (저장소 key prefix로 사용) */
  clientName: string;
}

// Context: one-line Korean description + @remarks for fallback behavior
/** 앱 전역 설정 Context */
export const ConfigContext = createContext<AppConfig>();

// Hook: Korean description + @throws for required providers, @returns for optional
/** 앱 전역 설정에 접근하는 훅
 * @throws ConfigProvider가 없으면 에러 발생 */
export function useConfig(): AppConfig { ... }

// Provider: Korean description + @remarks for dependencies + @example
/** 앱 전역 설정 Provider
 * @remarks
 * - 의존성 설명
 * @example
 * ```tsx
 * <Provider>...</Provider>
 * ``` */
export const ConfigProvider: ParentComponent<...> = ...;
```

---

### Task 1: NotificationContext.ts — JSDoc 추가

**Files:**
- Modify: `packages/solid/src/components/feedback/notification/NotificationContext.ts`

**Step 1: Add JSDoc to types and interfaces**

```typescript
/** 알림 테마 */
export type NotificationTheme = "info" | "success" | "warning" | "danger";

/** 알림 액션 버튼 */
export interface NotificationAction {
  /** 버튼 텍스트 */
  label: string;
  /** 클릭 핸들러 */
  onClick: () => void;
}

/** 알림 항목 */
export interface NotificationItem {
  /** 고유 식별자 */
  id: string;
  /** 테마 (info, success, warning, danger) */
  theme: NotificationTheme;
  /** 알림 제목 */
  title: string;
  /** 알림 메시지 (선택) */
  message?: string;
  /** 액션 버튼 (선택) */
  action?: NotificationAction;
  /** 생성 시각 */
  createdAt: Date;
  /** 읽음 여부 */
  read: boolean;
}

/** 알림 생성 옵션 */
export interface NotificationOptions {
  /** 알림에 표시할 액션 버튼 */
  action?: NotificationAction;
}

/** 알림 수정 옵션 */
export interface NotificationUpdateOptions {
  /** true면 읽은 알림을 다시 읽지 않음 상태로 변경 (배너 재표시) */
  renotify?: boolean;
}

/**
 * 알림 시스템 Context 값
 *
 * @remarks
 * 알림 생성, 수정, 삭제 및 읽음 관리를 위한 메서드 제공.
 * 최대 50개까지 유지되며 초과 시 오래된 항목부터 제거.
 */
export interface NotificationContextValue {
  // ... (fields already have Korean comments, keep as-is)
}
```

**Step 2: Add JSDoc to Context and hook**

```typescript
/** 알림 시스템 Context */
export const NotificationContext = createContext<NotificationContextValue>();

/**
 * 알림 시스템에 접근하는 훅
 *
 * @throws NotificationProvider가 없으면 에러 발생
 */
export function useNotification(): NotificationContextValue {
```

**Step 3: Verify**

Run: `pnpm typecheck packages/solid`
Expected: PASS (JSDoc comments don't affect types)

**Step 4: Commit**

```
feat(solid): add JSDoc to NotificationContext
```

---

### Task 2: NotificationProvider.tsx — JSDoc 추가

**Files:**
- Modify: `packages/solid/src/components/feedback/notification/NotificationProvider.tsx`

**Step 1: Add JSDoc to component**

```typescript
/**
 * 알림 시스템 Provider
 *
 * @remarks
 * - 최대 50개 알림 유지 (초과 시 오래된 항목 자동 제거)
 * - 읽지 않은 최신 알림을 배너로 표시
 * - 스크린 리더용 aria-live region 포함
 * - LoggerProvider가 있으면 에러 알림을 로거에도 기록
 */
export const NotificationProvider: ParentComponent = (props) => {
```

**Step 2: Commit**

```
feat(solid): add JSDoc to NotificationProvider
```

---

### Task 3: BusyContext.ts — JSDoc 추가

**Files:**
- Modify: `packages/solid/src/components/feedback/busy/BusyContext.ts`

**Step 1: Add JSDoc**

```typescript
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
```

**Step 2: Commit**

```
feat(solid): add JSDoc to BusyContext
```

---

### Task 4: BusyProvider.tsx — JSDoc 추가

**Files:**
- Modify: `packages/solid/src/components/feedback/busy/BusyProvider.tsx`

**Step 1: Add JSDoc**

```typescript
/** BusyProvider 설정 */
export interface BusyProviderProps {
  /** 표시 방식 (기본값: `"spinner"`) */
  variant?: BusyVariant;
}

/**
 * Busy 오버레이 Provider
 *
 * @remarks
 * - show/hide는 중첩 호출 가능 (내부 카운터로 관리)
 * - Portal로 렌더링하여 항상 최상위에 표시
 * - 독립적으로 동작 (다른 Provider 의존성 없음)
 */
export const BusyProvider: ParentComponent<BusyProviderProps> = (props) => {
```

**Step 2: Commit**

```
feat(solid): add JSDoc to BusyProvider
```

---

### Task 5: ServiceClientContext.ts — JSDoc 추가

**Files:**
- Modify: `packages/solid/src/providers/ServiceClientContext.ts`

**Step 1: Add JSDoc**

```typescript
/**
 * WebSocket 서비스 클라이언트 Context 값
 */
export interface ServiceClientContextValue {
  /** WebSocket 연결 열기 (key로 다중 연결 관리) */
  connect: (key: string, options?: Partial<ServiceConnectionConfig>) => Promise<void>;
  /** 연결 닫기 */
  close: (key: string) => Promise<void>;
  /** 연결된 클라이언트 인스턴스 가져오기 (연결되지 않은 key면 에러 발생) */
  get: (key: string) => ServiceClient;
  /** 연결 상태 확인 */
  isConnected: (key: string) => boolean;
}

/** WebSocket 서비스 클라이언트 Context */
export const ServiceClientContext = createContext<ServiceClientContextValue>();

/**
 * WebSocket 서비스 클라이언트에 접근하는 훅
 *
 * @throws ServiceClientProvider가 없으면 에러 발생
 */
export function useServiceClient(): ServiceClientContextValue {
```

**Step 2: Commit**

```
feat(solid): add JSDoc to ServiceClientContext
```

---

### Task 6: ServiceClientProvider.tsx — JSDoc 추가

**Files:**
- Modify: `packages/solid/src/providers/ServiceClientProvider.tsx`

**Step 1: Add JSDoc**

```typescript
/**
 * WebSocket 서비스 클라이언트 Provider
 *
 * @remarks
 * - ConfigProvider와 NotificationProvider 내부에서 사용해야 함
 * - key 기반 다중 연결 관리
 * - 요청/응답 진행률을 NotificationProvider 알림으로 표시
 * - host, port, ssl 미지정 시 window.location에서 자동 추론
 * - cleanup 시 모든 연결 자동 종료
 *
 * @example
 * ```tsx
 * <ConfigProvider clientName="my-app">
 *   <NotificationProvider>
 *     <ServiceClientProvider>
 *       <App />
 *     </ServiceClientProvider>
 *   </NotificationProvider>
 * </ConfigProvider>
 * ```
 */
export const ServiceClientProvider: ParentComponent = (props) => {
```

**Step 2: Commit**

```
feat(solid): add JSDoc to ServiceClientProvider
```

---

### Task 7: SharedDataChangeEvent.ts — JSDoc 추가

**Files:**
- Modify: `packages/solid/src/providers/shared-data/SharedDataChangeEvent.ts`

**Step 1: Add JSDoc**

```typescript
/**
 * SharedData 변경 이벤트 정의
 *
 * @remarks
 * 서버-클라이언트 간 공유 데이터 변경을 알리는 이벤트.
 * - 이벤트 정보: `{ name: string; filter: unknown }` — 데이터 이름과 필터
 * - 이벤트 데이터: `(string | number)[] | undefined` — 변경된 항목의 key 배열 (undefined면 전체 갱신)
 */
export const SharedDataChangeEvent = defineEvent<...>(...);
```

**Step 2: Commit**

```
feat(solid): add JSDoc to SharedDataChangeEvent
```

---

### Task 8: SharedDataContext.ts — JSDoc 추가

**Files:**
- Modify: `packages/solid/src/providers/shared-data/SharedDataContext.ts`

**Step 1: Add JSDoc**

```typescript
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
 * 각 데이터 key별 SharedDataAccessor와 전체 상태 관리 메서드를 포함한다.
 */
export type SharedDataValue<TSharedData extends Record<string, unknown>> = {
  [K in keyof TSharedData]: SharedDataAccessor<TSharedData[K]>;
} & {
  /** 모든 초기 fetch 완료까지 대기 */
  wait: () => Promise<void>;
  /** fetch 진행 중 여부 */
  busy: Accessor<boolean>;
};

/** 공유 데이터 Context */
export const SharedDataContext = createContext<SharedDataValue<Record<string, unknown>>>();

/**
 * 공유 데이터에 접근하는 훅
 *
 * @throws SharedDataProvider가 없으면 에러 발생
 */
export function useSharedData<...>(): SharedDataValue<TSharedData> {
```

**Step 2: Commit**

```
feat(solid): add JSDoc to SharedDataContext
```

---

### Task 9: SharedDataProvider.tsx — JSDoc 추가

**Files:**
- Modify: `packages/solid/src/providers/shared-data/SharedDataProvider.tsx`

**Step 1: Add JSDoc**

```typescript
/**
 * 공유 데이터 Provider
 *
 * @remarks
 * - ServiceClientProvider와 NotificationProvider 내부에서 사용해야 함
 * - LoggerProvider가 있으면 fetch 실패를 로거에도 기록
 * - definitions의 각 key마다 서버 이벤트 리스너를 등록하여 실시간 동기화
 * - 동시 fetch 호출 시 version counter로 데이터 역전 방지
 * - fetch 실패 시 사용자에게 danger 알림 표시
 * - cleanup 시 모든 이벤트 리스너 자동 해제
 *
 * @example
 * ```tsx
 * const definitions = {
 *   users: {
 *     serviceKey: "main",
 *     fetch: async (changeKeys) => fetchUsers(changeKeys),
 *     getKey: (item) => item.id,
 *     orderBy: [[(item) => item.name, "asc"]],
 *   },
 * };
 *
 * <SharedDataProvider definitions={definitions}>
 *   <App />
 * </SharedDataProvider>
 * ```
 */
export function SharedDataProvider<TSharedData extends Record<string, unknown>>(props: {
```

**Step 2: Commit**

```
feat(solid): add JSDoc to SharedDataProvider
```

---

### Task 10: DialogInstanceContext.ts — JSDoc 추가

**Files:**
- Modify: `packages/solid/src/components/disclosure/DialogInstanceContext.ts`

**Step 1: Add JSDoc**

```typescript
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
```

**Step 2: Commit**

```
feat(solid): add JSDoc to DialogInstanceContext
```

---

### Task 11: DialogContext.ts — JSDoc 보완

**Files:**
- Modify: `packages/solid/src/components/disclosure/DialogContext.ts`

**Step 1: Add JSDoc to undocumented types**

```typescript
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
```

**Step 2: Commit**

```
feat(solid): add JSDoc to DialogContext
```

---

### Task 12: providers.md 검토 및 업데이트

**Files:**
- Modify: `packages/solid/docs/providers.md`

**Step 1: Verify dependency graph against source code**

현재 `providers.md`의 의존성 그래프를 소스 코드와 대조하여 정확성 검증:

| Provider | Source | providers.md | Match? |
|---|---|---|---|
| ConfigProvider | no deps | no deps | ✅ |
| SyncStorageProvider | no deps | no deps | ✅ |
| LoggerProvider | no deps | no deps | ✅ |
| ThemeProvider | `useSyncConfig` → `useConfig` + `useSyncStorage` | ConfigProvider required, SyncStorageProvider optional | ✅ |
| NotificationProvider | `useLogger` | LoggerProvider optional | ✅ |
| ErrorLoggerProvider | `useLogger` | LoggerProvider optional | ✅ |
| PwaUpdateProvider | `useNotification` | NotificationProvider required | ✅ |
| ServiceClientProvider | `useConfig` + `useNotification` | ConfigProvider + NotificationProvider required | ✅ |
| SharedDataProvider | `useServiceClient` + `useNotification` + `useLogger` | ServiceClientProvider + NotificationProvider required, LoggerProvider optional | ✅ |
| ClipboardProvider | no deps | no deps | ✅ |
| BusyProvider | no deps | no deps | ✅ |
| DialogProvider | no deps | no deps | ✅ |

의존성 그래프가 소스와 일치함. `providers.md`는 변경 불필요.

**Step 2: Review content completeness**

각 Provider 섹션이 현재 소스 코드의 API를 정확히 반영하는지 확인.
이미 모든 Provider에 대해 상세한 API 테이블과 예제가 포함되어 있어 변경 불필요.

**No commit needed** — verify only.

---

### Task 13: README.md 검토 및 업데이트

**Files:**
- Modify: `packages/solid/README.md`

**Step 1: Verify Provider section**

현재 README.md의 Provider 목록과 설명을 소스 코드와 대조:
- ConfigProvider, SyncStorageProvider, LoggerProvider, ErrorLoggerProvider, PwaUpdateProvider, ClipboardProvider, ThemeProvider, ServiceClientProvider, SharedDataProvider — 모두 정확히 나열됨 ✅
- Provider Setup 코드 예제의 nesting 순서가 providers.md 권장 순서와 일치 ✅
- Optional providers 테이블이 정확함 ✅
- Hooks 섹션에 모든 provider 관련 훅이 나열됨 ✅

**No commit needed** — verify only.

---

### Task 14: 최종 검증

**Step 1: TypeCheck**

Run: `pnpm typecheck packages/solid`
Expected: PASS

**Step 2: Lint**

Run: `pnpm lint packages/solid`
Expected: PASS
