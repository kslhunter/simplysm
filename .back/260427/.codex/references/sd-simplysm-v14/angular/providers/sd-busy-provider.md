# `SdBusyProvider`

> **읽어야 하는 상황**: 글로벌 busy 로딩 상태(spinner/bar/cube)를 관리할 때.

글로벌 busy 상태 관리 프로바이더.

```typescript
@Injectable({ providedIn: "root" })
class SdBusyProvider {
  type = signal<SdBusyType>("bar");
  globalBusyCount = signal(0);
}
```

## Members

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `type` | property | `WritableSignal<SdBusyType>` | busy 표시 유형 (`"spinner" \| "bar" \| "cube"`) |
| `globalBusyCount` | property | `WritableSignal<number>` | 글로벌 busy 카운트 (0보다 크면 busy 표시) |
