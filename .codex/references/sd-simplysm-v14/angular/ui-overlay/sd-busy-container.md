# `SdBusyContainer`

> **읽어야 하는 상황**: 특정 영역에 busy 로딩 오버레이를 표시할 때. 글로벌 busy는 [`SdBusyProvider`](../providers$sd-busy-provider.md) 참조.

busy 상태(로딩 중) 표시 컨테이너 컴포넌트. `busy` 입력이 `true`일 때 스크린 오버레이와 인디케이터를 표시한다.

```typescript
@Component({ selector: "sd-busy-container", ... })
export class SdBusyContainer
```

## Members

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `busy` | input | `boolean` | busy 상태 (기본값: `false`) |
| `type` | input | `SdBusyType` | 인디케이터 유형. 미지정 시 `SdBusyProvider.type()` 값 사용 |

글로벌 busy 표시는 [`SdBusyProvider`](../providers$sd-busy-provider.md)를 통해 관리한다.

## Usage

```html
<!-- 컴포넌트 로컬 busy -->
<sd-busy-container [busy]="busyCount() > 0">
  <!-- 콘텐츠 -->
<$sd-busy-container>
```

### busyCount 카운트 패턴

비동기 작업마다 카운트를 증감하여 동시 요청을 안전하게 처리한다:

```typescript
busyCount = signal(0);

async _refresh(): Promise<void> {
  this.busyCount.update((v) => v + 1);
  await this._sdToast.try(async () => {
    // ... 비동기 작업
  });
  this.busyCount.update((v) => v - 1);
}
```

```html
<sd-busy-container [busy]="busyCount() > 0">
```

### busyMessage 선택적 패턴

긴 작업(엑셀 업로드 등) 시에만 사용. 기본적으로는 메시지 없이 인디케이터만 표시한다:

```typescript
busyMessage = signal<string | undefined>(undefined);

// 긴 작업 시
this.busyMessage.set("엑셀 업로드 중...");
// ... 작업 완료 후
this.busyMessage.set(undefined);
```

```html
<sd-busy-container [busy]="busyCount() > 0" [message]="busyMessage()">
```

