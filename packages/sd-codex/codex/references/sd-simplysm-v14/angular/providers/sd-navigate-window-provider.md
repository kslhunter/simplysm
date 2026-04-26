# `SdNavigateWindowProvider`

> **읽어야 하는 상황**: 새 윈도우로 네비게이션하고 자동 닫기를 관리할 때.

새 윈도우 네비게이션 + 자동 닫기 프로바이더.

```typescript
@Injectable({ providedIn: "root" })
class SdNavigateWindowProvider {
  get isWindow(): boolean;
  open(navigate: string, params?: Record<string, string>, features?: string): void;
}
```

## Members

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `isWindow` | getter | `boolean` | 현재 페이지가 팝업 윈도우인지 여부 |
| `open(navigate, params?, features?)` | method | `(string, Record<string,string>?, string?) => void` | 새 윈도우 열기. `features` 지정 시 팝업, 미지정 시 새 탭 |
