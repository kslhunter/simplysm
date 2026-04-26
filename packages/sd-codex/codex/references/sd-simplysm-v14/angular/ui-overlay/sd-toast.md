# `SdToast`

> **읽어야 하는 상황**: 토스트 개별 항목 컴포넌트의 내부 구조를 이해할 때. 토스트 표시는 [`SdToastProvider`](../providers/sd-toast-provider.md) 참조.

토스트 개별 항목 컴포넌트. `SdToastProvider`에 의해 프로그래밍 방식으로 생성된다.

```typescript
@Component({ selector: "sd-toast", ... })
export class SdToast
```

## Members

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `open` | model | `boolean` | 열림 상태 (기본값: `false`) |
| `useProgress` | input | `boolean` | 진행률 바 표시 (기본값: `false`) |
| `theme` | input | `SdToastTheme` | 색상 테마 (기본값: `"info"`) |
| `progress` | model | `number` | 진행률 (0~100, 기본값: `0`) |
| `message` | model | `string \| undefined` | 메시지 텍스트 |

직접 사용하는 대신 [`SdToastProvider`](../providers/sd-toast-provider.md)를 사용한다.

## Related Types

### `SdToastContainer`

```typescript
@Component({ selector: "sd-toast-container", ... })
export class SdToastContainer
```

토스트 컨테이너. `SdToastProvider`에 의해 자동 생성된다.

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `overlap` | input | `boolean` | 중복 표시 방지 (기본값: `false`) |
