# UI - Overlay

## Dropdown

### `SdDropdownControl`

드롭다운 트리거 컴포넌트. `SdDropdownPopupControl`과 함께 사용한다.

```typescript
@Component({ selector: "sd-dropdown" })
class SdDropdownControl {
  open = model(false);
  disabled = input(false, { transform: booleanAttribute });
}
```

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `open` | `boolean` | `false` | 드롭다운 열림 상태 (two-way) |
| `disabled` | `boolean` | `false` | 비활성화 |

### `SdDropdownPopupControl`

드롭다운 팝업 컨텐츠 컴포넌트.

```typescript
@Component({ selector: "sd-dropdown-popup" })
class SdDropdownPopupControl { }
```

## Modal

### `SdModalControl`

모달 래퍼 컴포넌트. 보통 `SdModalProvider.showAsync()`로 생성되며 직접 사용하지 않는다.

```typescript
@Component({ selector: "sd-modal" })
class SdModalControl {
  open = model(false);
  title = input("");
  hideHeader = input(false);
  hideCloseButton = input(false);
  useCloseByBackdrop = input(true);
  useCloseByEscapeKey = input(true);
  float = input(false);
  fill = input(false);
  resizable = input(false);
  movable = input(false);
  position = input<"bottom-right" | "top-right">();
  minHeightPx = input<number>();
  minWidthPx = input<number>();
  heightPx = input<number>();
  widthPx = input<number>();
  headerStyle = input<string>();
  noFirstControlFocusing = input(false);
}
```

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `open` | `boolean` | `false` | 열림 상태 (two-way) |
| `title` | `string` | `""` | 모달 제목 |
| `hideHeader` | `boolean` | `false` | 헤더 숨김 |
| `hideCloseButton` | `boolean` | `false` | 닫기 버튼 숨김 |
| `useCloseByBackdrop` | `boolean` | `true` | 배경 클릭으로 닫기 |
| `useCloseByEscapeKey` | `boolean` | `true` | ESC 키로 닫기 |
| `float` | `boolean` | `false` | 플로팅 모달 |
| `fill` | `boolean` | `false` | 전체 화면 채우기 |
| `resizable` | `boolean` | `false` | 크기 조절 가능 |
| `movable` | `boolean` | `false` | 이동 가능 |
| `position` | `"bottom-right" \| "top-right"` | - | 위치 프리셋 |
| `noFirstControlFocusing` | `boolean` | `false` | 자동 포커스 비활성화 |

### `SdPromptModalControl`

프롬프트 입력 모달. 텍스트 입력을 받아 반환한다.

```typescript
@Component({ selector: "sd-prompt-modal" })
class SdPromptModalControl implements ISdModal<string> {
  message = input.required<string>();
  close = output<string>();
  initialized = signal(true);
}
```

### `SdConfirmModalControl`

확인/취소 모달.

```typescript
@Component({ selector: "sd-confirm-modal" })
class SdConfirmModalControl implements ISdModal<boolean> {
  message = input.required<string>();
  close = output<boolean>();
  initialized = signal(true);
}
```

## Toast

### `SdToastControl`

토스트 개별 항목 컴포넌트. `SdToastProvider`에서 내부적으로 생성한다.

```typescript
@Component({ selector: "sd-toast" })
class SdToastControl {
  open = model(false);
  useProgress = input(false, { transform: booleanAttribute });
  progress = model(0);
  theme = input<TSdToastTheme>();
  message = signal<string>("");
}
```

### `SdToastContainerControl`

토스트 컨테이너 컴포넌트. `SdToastProvider`에서 내부적으로 생성하여 body에 부착한다.

```typescript
@Component({ selector: "sd-toast-container" })
class SdToastContainerControl {
  overlap = input(false, { transform: booleanAttribute });
}
```

## Busy

### `SdBusyContainerControl`

busy 표시 컨테이너 컴포넌트. spinner/bar/cube 3가지 타입을 지원한다.

```typescript
@Component({ selector: "sd-busy-container" })
class SdBusyContainerControl {
  busy = input(false, { transform: booleanAttribute });
  type = input<TSdBusyType>("bar");
  message = input<string>();
}
```

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `busy` | `boolean` | `false` | busy 상태 |
| `type` | `TSdBusyType` | `"bar"` | 표시 유형 (spinner, bar, cube) |
| `message` | `string \| undefined` | - | busy 메시지 |
