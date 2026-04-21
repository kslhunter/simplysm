# sd-modal 인라인 SCSS — LLM 검증

## 검증 항목

- SCSS import 경로: `@use "../../../../scss/commons/variables"`, `@use "../../../../scss/commons/mixins"`, `@use "sass:map"` — 형제 컴포넌트(sd-busy-container)와 동일 경로 패턴. 실제 파일 존재 확인됨.
- z-index 값: `map.get(variables.$vars, z-index, modal)` — _variables.scss에서 `modal: 4000` 확인됨.
- 호스트 기본: `display: none` + `&[data-sd-open] { display: block }` — template의 `[attr.data-sd-open]="open() || undefined"` 바인딩과 일치. open=false → attribute 없음 → display:none, open=true → attribute 존재 → display:block.
- backdrop: `position: absolute; top/left/right/bottom: 0; background: rgba(0,0,0,0.3)` — 전체 화면 커버 + 반투명.
- dialog 중앙 정렬: `position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%)` — 표준 중앙 정렬 패턴.
- dialog 배경/그림자: `background: var(--control-color)` + `@include mixins.elevation(8)` — CSS 변수 시스템 활용, elevation 8.
- dialog max 크기: `max-width: calc(100vw - var(--gap-xxl) * 2); max-height: calc(100vh - var(--gap-xxl) * 2)` — 화면 넘침 방지.
- header 레이아웃: `display: flex; align-items: center; padding; border-bottom` — flex row 레이아웃, 하단 보더.
- title: `flex-grow: 1; font-weight: bold` — 좌측 확장, 볼드.
- close-btn: `border: none; background: transparent; cursor: pointer; &:hover { background: var(--trans-lightest) }` — 버튼 리셋 + 호버 효과.
- content: `flex-grow: 1; overflow: auto` — 남은 공간 채움 + 스크롤.
- resize-handle 8방향: top/bottom(ns-resize), left/right(ew-resize), top-left/bottom-right(nwse-resize), top-right/bottom-left(nesw-resize) — 모든 방향별 커서 정확.
- float 변형: backdrop 투명 + dialog min-width 축소(15rem) + elevation 4 — float 모달 시각적 차별화.
- fill 변형: dialog `top/left/right/bottom: var(--gap-default); transform: none; max-width/max-height: none` — 전체 채움.
- position bottom-right: `top: auto; left: auto; right/bottom: var(--gap-default); transform: none` — 우하단 고정.
- position top-right: `top: var(--gap-default); left: auto; right: var(--gap-default); bottom: auto; transform: none` — 우상단 고정.
- 모바일 반응형: `@media (max-width: variables.$breakpoint-mobile)` — dialog가 하단 정렬, max-height 80vh.
- SCSS 컴파일 성공: `pnpm test angular` 1258개 테스트 전체 통과 — 컴파일 에러 없음 확인.
- ViewEncapsulation.None 패턴 일치: 호스트 셀렉터 `sd-modal { ... }` — 형제 컴포넌트와 동일 패턴.
- CSS 변수 사용: --control-color, --border-radius-default, --gap-*, --border-color-light, --theme-primary-default, --text-trans-default, --trans-lightest — 모두 _variables.scss에 정의된 기존 변수.
