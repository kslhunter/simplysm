# sd-select-item 스타일 복원 — LLM 검증

## 검증 항목

대상 파일: `packages/angular/src/controls/select/sd-select-item.ts` styles 섹션

### Rule: 기본 상태에서 control-color 배경 표시

- `> ._content` 선택자에 `background: var(--control-color)` 존재: sd-select-item.ts:44 확인

### Rule: hover/focus 시 배경 전환에 transition 효과 적용

- `> ._content` 선택자에 `transition: background 0.1s ease-in` 존재: sd-select-item.ts:45 확인
- `> ._content:hover`에 `transition: background 0.1s ease-out` 존재: sd-select-item.ts:49 확인
- `> ._content:focus`에 `transition: background 0.1s ease-out` 존재: sd-select-item.ts:55 확인

### Rule: selected 상태에서 텍스트가 primary 색상

- `&[data-sd-selected="true"] > ._content`에 `color: var(--theme-primary-default)` 존재: sd-select-item.ts:60 확인

### Rule: disabled 상태에서 회색 배경 표시

- `&[data-sd-disabled="true"] > ._content`에 `background: var(--theme-gray-default)` 존재: sd-select-item.ts:67 확인
