# AppStructureService

앱 구조 정보 서비스를 생성하는 팩토리 함수. `defineService`를 래핑하여 `Record<string, AppStructureItem[]>` 맵을 받아 서비스 정의를 반환한다. 인증 불필요.

## When to use

- ✅ 클라이언트에 앱의 메뉴/페이지 구조 정보를 제공할 때
- ❌ 동적으로 변하는 구조를 제공해야 할 때는 별도 서비스를 정의한다 — `AppStructureService`는 생성 시 전달된 정적 맵을 반환한다

```typescript
function AppStructureService(
  itemsMap: Record<string, AppStructureItem[]>,
): ServiceDefinition;
```

## Parameters

| Param | Type | Description |
|-------|------|-------------|
| `itemsMap` | `Record<string, AppStructureItem[]>` | 앱 구조 아이템 맵. `AppStructureItem`은 `@simplysm/service-common`에서 import한다 |

## Returns

`ServiceDefinition` — `defineService("AppStructure", ...)`로 생성된 서비스 정의.

제공 메서드:

| Method | Signature | Description |
|--------|-----------|-------------|
| `getItems` | `() => Record<string, AppStructureItem[]>` | 생성 시 전달된 `itemsMap`을 그대로 반환한다 |

## Related Types

### `AppStructureServiceType`

`AppStructureService`가 반환하는 서비스의 메서드 시그니처 타입.

```typescript
type AppStructureServiceType = ServiceMethods<ReturnType<typeof AppStructureService>>;
```

## Usage

```typescript
import { AppStructureService } from "@simplysm/service-server";
import type { AppStructureItem } from "@simplysm/service-common";

const itemsMap: Record<string, AppStructureItem[]> = {
  "my-client": [
    { title: "홈", path: "/home" },
    { title: "설정", path: "/settings" },
  ],
};

const server = createServiceServer({
  services: [AppStructureService(itemsMap)],
  // ...
});
```
