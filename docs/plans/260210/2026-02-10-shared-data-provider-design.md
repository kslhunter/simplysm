# SharedDataProvider 설계

> 작성일: 2026-02-10
> 마이그레이션 항목: #14 SharedDataProvider
> 원본: `.legacy-packages/sd-angular/src/core/providers/storage/sd-shared-data.provider.ts`

## 개요

서버의 마스터 데이터(사용자, 부서, 코드 등)를 클라이언트에 캐싱하고,
WebSocket 이벤트로 실시간 동기화하는 Context + Provider.

## 설계 결정 사항

| 항목               | 결정                       | 근거                                    |
| ------------------ | -------------------------- | --------------------------------------- |
| 데이터 소스 등록   | Props 기반 (`definitions`) | SolidJS 관용적 패턴                     |
| 상태 관리          | `createSignal<T[]>`        | 정렬 시 배열 전체 교체, 프로젝트 일관성 |
| 키 식별            | `getKey` 함수              | 데이터 객체에 특수 필드 불필요          |
| 이벤트 클래스 위치 | `solid` 패키지             | 클라이언트 간 이벤트, 서버는 중계만     |
| WebSocket 패턴     | 레거시 유지                | 현재 ServiceClient API가 동일           |

## API 설계

### 타입 정의

```typescript
// 개별 SharedData 소스 정의
interface SharedDataDefinition<T> {
  serviceKey: string;
  fetch: (changeKeys?: Array<string | number>) => Promise<T[]>;
  getKey: (item: T) => string | number;
  orderBy: [(item: T) => unknown, "asc" | "desc"][];
  filter?: unknown;
}

// 개별 데이터 접근 객체
interface SharedDataAccessor<T> {
  items: Accessor<T[]>;
  get: (key: string | number | undefined) => T | undefined;
  emit: (changeKeys?: Array<string | number>) => Promise<void>;
}

// useSharedData 반환 타입
type SharedDataValue<T extends Record<string, unknown>> = {
  [K in keyof T]: SharedDataAccessor<T[K]>;
} & {
  wait: () => Promise<void>;
  loading: Accessor<boolean>;
};
```

### Provider Props

```typescript
interface SharedDataProviderProps<T extends Record<string, unknown>> {
  definitions: { [K in keyof T]: SharedDataDefinition<T[K]> };
  children: JSX.Element;
}
```

### 사용 예시

```tsx
// 타입 맵 정의
interface MySharedData {
  user: IUser;
  company: ICompany;
}

// Provider 설정
<SharedDataProvider<MySharedData>
  definitions={{
    user: {
      serviceKey: "main",
      fetch: (keys) => userService.getList(keys),
      getKey: (item) => item.id,
      orderBy: [[(item) => item.name, "asc"]],
    },
    company: {
      serviceKey: "main",
      fetch: (keys) => companyService.getList(keys),
      getKey: (item) => item.id,
      orderBy: [[(item) => item.id, "asc"]],
    },
  }}
>
  <App />
</SharedDataProvider>;

// 컴포넌트에서 사용
function UserList() {
  const shared = useSharedData<MySharedData>();

  // 목록 조회 (반응형)
  <For each={shared.user.items()}>{(user) => <div>{user.name}</div>}</For>;

  // 단일 항목 O(1) 조회
  const user = shared.user.get(selectedId());

  // 변경 알림 (다른 클라이언트에 전파)
  await shared.user.emit([changedUserId]);

  // 전체 로드 대기
  await shared.wait();

  // 전체 로딩 상태 (반응형)
  <BusyContainer busy={shared.loading()}>
    <Content />
  </BusyContainer>;
}
```

## 내부 동작

### 초기화 (Provider mount)

각 definition에 대해 병렬로:

1. `createSignal<T[]>([])` 생성
2. `createMemo`로 `Map<key, item>` 캐시 생성 (O(1) 조회용)
3. `ServiceClient.addEventListener(SharedDataChangeEvent, {name, filter}, cb)` 등록
4. `fetch()` 호출 → 결과 정렬 → Signal 업데이트

### 변경 이벤트 수신 (WebSocket)

```
다른 클라이언트가 emit → 서버 중계 → 이 클라이언트 수신
  ├─ changeKeys 있음 → fetch(changeKeys) → 부분 업데이트 (기존 제거 + 새 데이터 추가 + 정렬)
  └─ changeKeys 없음 → fetch() → 전체 교체 + 정렬
```

### emit 호출 (로컬 클라이언트가 데이터 변경 후)

```
ServiceClient.emitToServer(
  SharedDataChangeEvent,
  (info) => info.name === name && ObjectUtils.equal(info.filter, def.filter),
  changeKeys,
)
```

### 로딩 추적

- `loadingCount` (createSignal): 각 fetch 시작 시 +1, 완료 시 -1
- `loading`: `() => loadingCount() > 0`
- `wait()`: `loadingCount`가 0이 될 때까지 대기하는 Promise

### 정렬

레거시와 동일: `orderBy` 배열을 역순으로 처리하여 다중 정렬 우선순위 보장.
`core-common`의 `Array.orderBy()` / `Array.orderByDesc()` 확장 활용.

### 정리 (onCleanup)

등록된 모든 WebSocket 이벤트 리스너 `removeEventListener`.

## 파일 구조

```
packages/solid/src/
├── contexts/
│   ├── shared-data/
│   │   ├── SharedDataContext.ts       // Context + useSharedData hook + 타입
│   │   ├── SharedDataProvider.tsx     // Provider 컴포넌트
│   │   └── SharedDataChangeEvent.ts   // WebSocket 이벤트 클래스
│   └── ...
└── index.ts  // export 추가
```

## 레거시 대비 변경점

| 레거시 (Angular)                            | Solid                        | 이유                 |
| ------------------------------------------- | ---------------------------- | -------------------- |
| 추상 클래스 상속 + `register()`             | Props `definitions`          | SolidJS 관용적       |
| `ISharedDataBase.__valueKey` 필수 필드      | `getKey` 함수                | 데이터 객체 비침투적 |
| `getSignal(name)` 문자열 키                 | `shared.user` 타입 안전 접근 | 제네릭 타입 맵       |
| `loadingCount` 직접 노출                    | `loading` Accessor           | 캡슐화               |
| `Wait.until()` 폴링                         | Promise 기반 `wait()`        | 표준 async           |
| `__searchText`, `__isHidden`, `__parentKey` | 미포함 (17번 범위)           | Provider 범위 최소화 |

## 범위 외 (향후 작업)

- `__searchText`, `__isHidden`, `__parentKey` → #17 SharedData 관련 컨트롤에서 처리
- SharedDataSelect, SharedDataSelectList, SharedDataSelectButton → #17
