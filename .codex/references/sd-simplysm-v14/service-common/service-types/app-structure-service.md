# `AppStructureService`

> **읽어야 하는 상황**: 앱 구조 항목을 서버에서 조회하는 타입 계약을 확인할 때. 앱 구조 타입 정의는 [`AppStructureItem`](../app-structure/app-structure-item.md) 참조.

서버에 등록된 앱 구조 항목을 클라이언트명 기준 맵으로 조회하는 서비스 인터페이스.

```typescript
export interface AppStructureService {
  getItems(): Record<string, AppStructureItem[]>;
}
```

## Members

| Method | Parameters | Return | Description |
|--------|-----------|--------|-------------|
| `getItems` | 없음 | `Record<string, AppStructureItem[]>` | 클라이언트명을 키로, 해당 클라이언트의 앱 구조 항목 배열을 값으로 하는 맵 반환 |
