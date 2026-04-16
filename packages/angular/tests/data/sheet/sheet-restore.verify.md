# Feature 4.1 sd-sheet 복원 — LLM 검증

## Slice 1: trackByFn 기본값 + 정렬 아이콘

- [x] trackByFn 기본값: `sd-sheet.ts:539` — `input<...>((item) => item)` 으로 기본값 설정됨. v12의 `(item) => item`과 일치
- [x] tbody track 표현식: `sd-sheet.ts:210` — `track trackByFn()(item, $index)` 으로 단순화됨. trackByFn이 항상 존재하므로 fallback 불필요
- [x] 정렬 아이콘 비교: `sd-sheet.ts:162-166` — `_sortDef?.desc === false` (ascending), `_sortDef?.desc === true` (descending) 명시적 비교. v12 패턴과 일치

## Slice 2: 선택 동작 복원

- [x] hasSelectable 가드: `sd-sheet.ts:92` — `selection.hasSelectable() && selectMode() === "multi"`. v12 패턴 복원
- [x] 헤더 체크박스 valueChange: `sd-sheet.ts:95` — `(valueChange)="selection.toggleAll()"`. v12 패턴 복원
- [x] 헤더 체크박스 theme: `sd-sheet.ts:97` — `[theme]="'white'"` 추가됨
- [x] 바디 체크박스 valueChange: `sd-sheet.ts:230` — `(valueChange)="selection.toggle(item)"`. v12 패턴 복원
- [x] 바디 체크박스 theme: `sd-sheet.ts:233` — `[theme]="'white'"` 추가됨
- [x] 바디 체크박스 disabled: `sd-sheet.ts:234` — `[disabled]="_selectable !== true"` 추가됨
- [x] 바디 체크박스 title: `sd-sheet.ts:235` — `[attr.title]="_selectable"` 추가됨
- [x] 싱글 선택 canChangeFn 가드: `sd-sheet.ts:239` — `_selectable === true && selection.getCanChangeFn(item)` 조건. v12 패턴 복원
- [x] 싱글 선택 pointerdown: `sd-sheet.ts:242` — `(pointerdown)="selection.toggle(item)"`. v12 패턴 복원
- [x] 싱글 선택 title: `sd-sheet.ts:243` — `[attr.title]="_selectable"` 추가됨
- [x] onSelectCheckboxClick 메서드 제거 확인: 템플릿에서 미사용으로 제거됨

## Slice 3: DOM 속성 + Feature cell fixing

- [x] 헤더 feature-cell data-c: `sd-sheet.ts:88` — `[attr.data-c]="_fc"` 추가됨 (_fc = hasExpandable ? -2 : -1)
- [x] 헤더 feature-cell style.left.px: `sd-sheet.ts:89` — `[style.left.px]="featureFixedLeftMap().get(_fc)"` 추가됨
- [x] 헤더 feature-cell sdResize: `sd-sheet.ts:90` — `(sdResize)="onFeatureCellResize($event, _fc)"` 추가됨
- [x] 헤더 expand-cell data-c: `sd-sheet.ts:107` — `[attr.data-c]="-1"` 추가됨
- [x] 헤더 expand-cell style.left.px: `sd-sheet.ts:108` — `[style.left.px]="featureFixedLeftMap().get(-1)"` 추가됨
- [x] 헤더 expand-cell sdResize: `sd-sheet.ts:109` — `(sdResize)="onFeatureCellResize($event, -1)"` 추가됨
- [x] 헤더 비-마지막행 data-c: `sd-sheet.ts:126` — `[attr.data-c]="c"` 추가됨
- [x] 헤더 마지막행 data-c: `sd-sheet.ts:143` — `[attr.data-c]="c"` 추가됨
- [x] summary data-c: `sd-sheet.ts:196` — `[attr.data-c]="c"` 추가됨 (for loop에 `let c = $index` 추가)
- [x] 바디 feature-cell data-r/data-c: `sd-sheet.ts:221-222` — `[attr.data-r]="rowIdx"`, `[attr.data-c]="_fc"` 추가됨
- [x] 바디 feature-cell style.left.px: `sd-sheet.ts:223` — `[style.left.px]="featureFixedLeftMap().get(_fc)"` 추가됨
- [x] 바디 expand-cell data-r/data-c: `sd-sheet.ts:253-254` — `[attr.data-r]="rowIdx"`, `[attr.data-c]="-1"` 추가됨
- [x] 바디 expand-cell style.left.px: `sd-sheet.ts:255` — `[style.left.px]="featureFixedLeftMap().get(-1)"` 추가됨
- [x] featureFixedLeftMap computed: `sd-sheet.ts:603-615` — hasExpandable 시 select(-2)=0, expand(-1)=selectWidth, 단일 시 select(-1)=0
- [x] onFeatureCellResize 메서드: `sd-sheet.ts:816-823` — widthChanged 체크 후 Map에 width 등록
