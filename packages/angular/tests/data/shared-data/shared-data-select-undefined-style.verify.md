# sd-shared-data-select "미지정" 옵션 스타일 — LLM 검증

## 검증 항목

- [x] padding 일치: sd-select-item ._content의 `padding: var(--gap-sm) var(--gap-default)`와 동일 → sd-shared-data-select.ts의 `._sd-shared-data-select-undefined`에 `padding: var(--gap-sm) var(--gap-default)` 정의 확인
- [x] cursor 일치: sd-select-item ._content의 `cursor: pointer`와 동일 → `cursor: pointer` 정의 확인
- [x] background 일치: sd-select-item ._content의 `background: var(--control-color)`와 동일 → `background: var(--control-color)` 정의 확인
- [x] transition 일치: sd-select-item ._content의 `transition: background 0.1s ease-in`와 동일 → `transition: background 0.1s ease-in` 정의 확인
- [x] hover background 일치: sd-select-item ._content:hover의 `background: var(--trans-lighter)`와 동일 → `&:hover { background: var(--trans-lighter) }` 정의 확인
- [x] hover transition 일치: `transition: background 0.1s ease-out` → `&:hover { transition: background 0.1s ease-out }` 정의 확인
- [x] focus outline 제거: sd-select-item ._content:focus의 `outline: none`와 동일 → `&:focus { outline: none }` 정의 확인
- [x] focus background 일치: `background: var(--trans-lighter)` → `&:focus { background: var(--trans-lighter) }` 정의 확인
- [x] 선택자 정합성: 컴포넌트의 `encapsulation: ViewEncapsulation.None` + 선택자가 `sd-shared-data-select { ._sd-shared-data-select-undefined { ... } }`로 컴포넌트 태그를 기준으로 스코핑 → 코드베이스 패턴 일치 확인
- [x] template 클래스 일치: template의 `class="_sd-shared-data-select-undefined"` (line 97)와 styles의 `._sd-shared-data-select-undefined` 선택자가 일치
