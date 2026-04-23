# `injectSdSystemConfigResource`

컴포넌트 태그명 기반 키로 시스템 설정을 읽고 쓰는 resource 래퍼. 생성자에서 호출한다.

```typescript
function injectSdSystemConfigResource<T>(options: {
  key: Signal<string | undefined>;
}): {
  value: Signal<T | undefined>;
  isLoading: Signal<boolean>;
  status: Signal<ResourceStatus>;
  hasValue: () => boolean;
  reload: () => void;
  set(value: T | undefined): void;
  update(fn: (prev: T | undefined) => T | undefined): void;
}
```

## Parameters

| Param | Type | Description |
|-------|------|-------------|
| `options.key` | `Signal<string \| undefined>` | 설정 키 signal. undefined이면 로딩 안 함 |

## Returns

| Field | Type | Description |
|-------|------|-------------|
| `value` | `Signal<T \| undefined>` | 설정 값 signal |
| `isLoading` | `Signal<boolean>` | 로딩 중 여부 |
| `status` | `Signal<ResourceStatus>` | resource 상태 |
| `hasValue()` | `() => boolean` | 값 존재 여부 |
| `reload()` | `() => void` | 강제 재로딩 |
| `set(value)` | `(T \| undefined) => void` | 값 설정 + 즉시 signal 업데이트 + 비동기 영속화 |
| `update(fn)` | `((prev) => T \| undefined) => void` | 값 업데이트 + 즉시 signal 업데이트 + 비동기 영속화 |
