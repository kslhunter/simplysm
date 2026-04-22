# `SdDock`

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
  </sd-dock>
  <sd-dock [position]="'bottom'" [resizable]="true" [key]="'my-page-bottom-dock'">
    <!-- 하단 조절 가능 영역 -->
  </sd-dock>
  <ng-content /> <!-- 나머지 영역 -->
</sd-dock-container>
```

### 실사용 예

- [crud-list.md §3 최소 뼈대: 조회 전용 page](../recipes/crud-list.md#3-최소-뼈대-조회-전용-page) — 필터 영역 dock(top)
- [crud-list.md §8 확장 D: 선택 모달 전환](../recipes/crud-list.md#8-확장-d-선택-모달-전환) — modal 하단 선택 바 dock(bottom)
- [crud-detail.md §7 확장 C: modal 뷰](../recipes/crud-detail.md#7-확장-c-modal-뷰) — modal 하단 액션 바 dock(bottom)
- [crud-detail.md §8 확장 D: control 뷰](../recipes/crud-detail.md#8-확장-d-control-뷰) — control 상단 바 dock(top)
