# `SdDockContainer`

도킹 레이아웃 컨테이너. `SdDock`과 함께 사용하여 상/하/좌/우 고정 영역을 만든다.

```typescript
@Component({ selector: "sd-dock-container" })
class SdDockContainer { }
```

## Related Types

### `SdDock`

도킹 영역 컴포넌트. `SdDockContainer` 내부에서 사용.

```typescript
@Component({ selector: "sd-dock" })
class SdDock {
  key = input<string>();
  position = input<"top" | "bottom" | "right" | "left">("top");
  resizable = input(false, { transform: booleanAttribute });
}
```

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `key` | `string \| undefined` | `undefined` | 리사이즈 설정 저장 키 |
| `position` | `"top" \| "bottom" \| "right" \| "left"` | `"top"` | 도킹 위치 |
| `resizable` | `boolean` | `false` | 크기 조절 가능 여부 |

## Usage

필터·도구 바는 `position="top"` (기본값이므로 생략 가능), 하단 액션 바는 `[position]="'bottom'"`으로 배치한다.

```html
<sd-dock-container>
  <sd-dock>
    <!-- 상단 필터/도구 바 (기본 position="top") -->
  </sd-dock>
  <!-- 메인 콘텐츠 -->
  <sd-dock [position]="'bottom'">
    <!-- 하단 액션 바 -->
  </sd-dock>
</sd-dock-container>
```

> **CRITICAL — modal 하단 바에 `[position]="'bottom'"` 반드시 명시**
> 기본값은 `"top"`이다. modal 하단 액션 바에 `[position]`을 누락하면 상단에 렌더링되어 레이아웃이 깨진다.

### 실사용 예

- [crud-list.md §3 최소 뼈대: 조회 전용 page](../recipes/crud-list.md#3-최소-뼈대-조회-전용-page) — 필터 영역 dock(top)
- [crud-list.md §8 확장 D: 선택 모달 전환](../recipes/crud-list.md#8-확장-d-선택-모달-전환) — modal 하단 선택 바 dock(bottom)
- [crud-detail.md §7 확장 C: modal 뷰](../recipes/crud-detail.md#7-확장-c-modal-뷰) — modal 하단 액션 바 dock(bottom)
- [crud-detail.md §8 확장 D: control 뷰](../recipes/crud-detail.md#8-확장-d-control-뷰) — control 상단 바 dock(top)

## `SdGap`

간격(gap) 컴포넌트. 요소 사이에 공간을 추가한다.

```typescript
@Component({ selector: "sd-gap" })
class SdGap { }
```
