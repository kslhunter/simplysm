# `SdDock`

> **읽어야 하는 상황**: 도킹 컨테이너 내부에 고정 패널을 배치할 때.

`SdDockContainer` 내부에 배치되는 도킹 패널 컴포넌트. `position`으로 도킹 위치를 지정하고, `resizable`로 크기 조절을 허용한다.

```typescript
@Component({ selector: "sd-dock", ... })
export class SdDock
```

## Members

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `key` | input | `string \| undefined` | 시스템 설정 저장 키 (크기 저장에 사용) |
| `position` | input | `"top" \| "bottom" \| "right" \| "left"` | 도킹 위치 (기본값: `"top"`) |
| `resizable` | input | `boolean` | 크기 조절 가능 여부 (기본값: `false`) |

## Usage

```html
<sd-dock-container>
  <sd-dock [position]="'top'">
    <!-- 상단 고정 영역 -->
  <$sd-dock>
  <sd-dock [position]="'bottom'" [resizable]="true" [key]="'my-page-bottom-dock'">
    <!-- 하단 조절 가능 영역 -->
  <$sd-dock>
  <ng-content /> <!-- 나머지 영역 -->
<$sd-dock-container>
```

