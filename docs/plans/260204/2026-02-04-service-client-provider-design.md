# ServiceClientProvider 마이그레이션 설계

## 개요

Angular 레거시의 `sd-service-client-factory.provider.ts`를 SolidJS로 마이그레이션한다.

## 결정 사항

| 항목             | 결정                       |
| ---------------- | -------------------------- |
| 제공 방식        | Context + Provider 패턴    |
| HMR/Reload 로직  | 제외 (Vite 사용)           |
| Progress 표시    | NotificationProvider 활용  |
| Progress 완료 후 | 목록에 유지 (수동 제거)    |
| 클라이언트 관리  | 멀티 클라이언트 (key 기반) |
| 연결 기본값      | location 기반              |

## 1. NotificationProvider 확장

### 타입 변경

```typescript
// NotificationContext.ts
export interface NotificationContextValue {
  // 기존 메서드들 (id 반환하도록 변경)
  info: (title: string, message?: string, options?: NotificationOptions) => string;
  success: (title: string, message?: string, options?: NotificationOptions) => string;
  warning: (title: string, message?: string, options?: NotificationOptions) => string;
  danger: (title: string, message?: string, options?: NotificationOptions) => string;

  // 신규 메서드
  update: (
    id: string,
    updates: Partial<Pick<NotificationItem, "title" | "message" | "theme" | "action">>,
    options?: { renotify?: boolean },
  ) => void;
  remove: (id: string) => void;
}
```

### renotify 동작

- `renotify: true` + 이미 `read` 상태 → `read: false`로 변경 (badge +1)
- `renotify: true` + 이미 `unread` 상태 → 그대로 유지 (badge 변화 없음)

## 2. ServiceClientProvider

### 파일 위치

- `packages/solid/src/contexts/ServiceClientContext.ts`
- `packages/solid/src/contexts/ServiceClientProvider.tsx`

### 타입 정의

```typescript
export interface ServiceClientContextValue {
  connect: (key: string, options?: Partial<ServiceConnectionConfig>) => Promise<void>;
  close: (key: string) => Promise<void>;
  get: (key: string) => ServiceClient;
  isConnected: (key: string) => boolean;
}
```

### 기본 연결 설정

```typescript
const defaultConfig: ServiceConnectionConfig = {
  host: location.hostname,
  port: location.port,
  ssl: location.protocol.startsWith("https"),
};
```

### 의존성

- `ConfigContext` - `clientName` 가져오기
- `NotificationContext` - progress 표시

## 3. Progress 표시 로직

```typescript
// connect() 내부
client.on("request-progress", (state) => {
  const existing = reqProgressMap.get(state.uuid);

  if (!existing) {
    const id = notification.info("요청을 전송하는 중입니다.", "0%");
    reqProgressMap.set(state.uuid, id);
  } else {
    const percent = Math.round((state.completedSize / state.totalSize) * 100);
    notification.update(existing, { message: `${percent}%` });
  }

  if (state.completedSize === state.totalSize) {
    notification.update(
      existing,
      {
        title: "요청 전송 완료",
        message: "100%",
      },
      { renotify: true },
    );
    reqProgressMap.delete(state.uuid);
  }
});

// response-progress도 동일한 패턴
```

## 4. 사용 예시

### 앱 루트 구성

```tsx
<ConfigContext.Provider value={{ clientName: "myApp" }}>
  <NotificationProvider>
    <ServiceClientProvider>
      <Router />
      <NotificationBanner />
    </ServiceClientProvider>
  </NotificationProvider>
</ConfigContext.Provider>
```

### 컴포넌트에서 사용

```tsx
function MyComponent() {
  const serviceClient = useServiceClient();

  onMount(async () => {
    await serviceClient.connect("main");
  });

  const handleClick = async () => {
    const client = serviceClient.get("main");
    const result = await client.send("UserService", "getUser", [userId]);
  };

  return <button onClick={handleClick}>사용자 조회</button>;
}
```

## 5. 파일 구조

```
packages/solid/src/
├── contexts/
│   ├── ConfigContext.ts          (기존)
│   ├── ServiceClientContext.ts   (신규)
│   └── ServiceClientProvider.tsx (신규)
├── components/
│   └── notification/
│       ├── NotificationContext.ts   (수정)
│       └── NotificationProvider.tsx (수정)
└── index.ts                         (수정: export 추가)
```

## 구현 작업 목록

1. `NotificationContext.ts` 수정 - 타입 확장
2. `NotificationProvider.tsx` 수정 - update, remove, renotify 구현
3. `ServiceClientContext.ts` 생성
4. `ServiceClientProvider.tsx` 생성
5. `index.ts` export 추가
6. 테스트 작성
