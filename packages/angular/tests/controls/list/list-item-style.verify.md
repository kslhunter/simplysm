# Feature 2.1 sd-list-item 스타일 검증 — LLM 검증

## 검증 항목

### Slice 1: selected-icon 스타일 복원

- SCSS에 `[data-sd-has-selected-icon="true"][data-sd-selected="true"]` 선택자 존재: `sd-list-item.ts:79` — `color: var(--text-trans-default)` 적용 확인
- hover 시 `background: var(--trans-lighter)` 규칙 존재: `sd-list-item.ts:82-84` — `&:hover { background: var(--trans-lighter); }` 확인
- host 바인딩에 `data-sd-has-selected-icon` 존재: `sd-list-item.ts:121` — `"[attr.data-sd-has-selected-icon]": "selectedIcon() !== undefined"` 확인
- SCSS 선택자와 host 바인딩 값 정합성: 선택자 `[data-sd-has-selected-icon="true"]` ↔ 바인딩 `selectedIcon() !== undefined` → boolean "true"/"false" 문자열 출력 → 정합

### Slice 2: accordion child padding + flat scope 보정

- accordion child list padding 규칙 존재: `sd-list-item.ts:97-101` — `&[data-sd-layout="accordion"] > sd-collapse > ._content > sd-list { padding: var(--gap-xs) 0; }` 확인
- 선택자 경로 정합성: sd-list-item 템플릿(line 48) `<sd-collapse>` → sd-collapse 템플릿 `<div class="_content">` → projected `<sd-list>` — DOM 경로 `sd-list-item > sd-collapse > ._content > sd-list`와 일치
- flat 선택자에 `[data-sd-has-children="true"]` 조건 포함: `sd-list-item.ts:103` — `&[data-sd-layout="flat"][data-sd-has-children="true"]` 확인
- flat + hasChildren=false인 항목에 dimmed 스타일 미적용: 선택자 `[data-sd-has-children="true"]`가 있으므로 `data-sd-has-children="false"`인 요소에 매칭되지 않음

### ~~mobile 테마 hover 비복원~~ (Slice 4에서 복원으로 변경)

- ~~[x] SCSS에 `.sd-theme-mobile` 관련 규칙 없음~~ — 후속 Slice 4에서 모바일 hover 투명화 복원

### Slice 3: sd-list display 복원

- sd-list SCSS에서 호스트 display가 `flex`이고 `flex-direction: column`이다: `sd-list.ts:21-22` — `display: flex; flex-direction: column;` 확인

### Slice 4: _content 레이아웃 복원

- `._content`의 gap이 `var(--gap-xs)`이다: `sd-list-item.ts:62` — `gap: var(--gap-xs);` 확인
- `._content`에 `align-items: center`가 없다: `sd-list-item.ts:58-67` — `align-items` 속성 없음 확인
- `._label`의 flex가 `1 1 auto`이고 overflow가 `auto`이다: `sd-list-item.ts:65-66` — `flex: 1 1 auto; overflow: auto;` 확인

### Slice 5: hover/스타일 복원

- hover 배경 스타일이 accordion 전용이다: `sd-list-item.ts:89-94` — `&[data-sd-layout="accordion"] { &:not([data-sd-readonly="true"]) { > ._content:hover { ... } } }` 확인
- accordion hover에 `:not([data-sd-readonly="true"])` 가드가 있다: `sd-list-item.ts:90` 확인
- 전역 `&:hover > ._content` 스타일이 없다: 전체 SCSS 블록(55-116) 검색 — 전역 hover 없음 확인
- readonly의 별도 hover override가 없다: `sd-list-item.ts:83-87` — `cursor: default`만 있고 hover override 없음 확인
- flat + hasChildren 스타일에 `display: block`, `font-size: var(--font-size-sm)`, `background: transparent`가 있다: `sd-list-item.ts:101-108` 확인
- `.sd-theme-mobile > sd-list-item > ._content:hover { background: transparent }` 스타일이 있다: `sd-list-item.ts:112-116` 확인
