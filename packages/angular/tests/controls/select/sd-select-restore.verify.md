# Feature 2.2 sd-select / sd-select-button / sd-select-item 복원 — LLM 검증

## 검증 항목

### sd-select
- placeholder 클래스 `sd-text-color-gray-default`: sd-select.ts:57 확인 — `<span class="sd-text-color-gray-default">`
- multi vertical 구분자 `<div class='p-sm-0'>` + `<span style="display: inline">` 래핑: sd-select.ts:403-410 확인 — separator가 `<div class='p-sm-0'></div>`, 모든 항목이 `<span style="display: inline">` 래핑 (v12 원본 일치)
- `dropdownOpen`이 `model(false)`: sd-select.ts:272 확인 — `dropdownOpen = model(false)`

### sd-select-button
- display `block`: sd-select-button.ts:19 확인 — `display: block`
- `align-items`, `justify-content` 없음: sd-select-button.ts:18-28 확인 — 해당 속성 없음
- `tabindex` 호스트 바인딩 없음: sd-select-button.ts:37 확인 — `host: {}`

### sd-select-item
- tabindex/click/keydown가 호스트에 바인딩: sd-select-item.ts:80-87 확인 — host에 `[attr.tabindex]`, `(click)`, `(keydown)` 존재
- `data-sd-select-mode` 호스트 속성: sd-select-item.ts:82 확인 — `"[attr.data-sd-select-mode]": "_parentControl.selectMode()"`
- `_content` div에 tabindex 없음: sd-select-item.ts:26 확인 — `<div class="_content" style="display: inline-block;">`에 tabindex 없음
- hover 배경색 `rgba(0, 0, 0, 0.07)`: sd-select-item.ts:50 확인
- focus 배경색 `rgba(0, 0, 0, 0.07)`: sd-select-item.ts:56 확인
- selected 배경색 `rgba(0, 0, 0, 0.07)`: sd-select-item.ts:62 확인
- CSS가 `> ._content` 자식이 아닌 호스트 직접 적용: sd-select-item.ts:44-72 확인 — 모든 스타일이 `sd-select-item` 호스트에 직접 적용
- onClick에 preventDefault/stopPropagation 포함: sd-select-item.ts:125-127 확인
