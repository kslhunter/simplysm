# Feature 1.2 sd-select-button 스타일 복원 — LLM 검증

## 검증 항목

### 기본 스타일 복원

- SCSS에 `background: var(--control-color)` 존재: `sd-select-button.ts:28` 확인
- SCSS에 `font-weight: bold` 존재: `sd-select-button.ts:29` 확인
- SCSS에 `color: var(--theme-primary-default)` 존재: `sd-select-button.ts:30` 확인

### 전환 효과 복원

- SCSS에 `transition: background 0.1s linear` 존재: `sd-select-button.ts:31` 확인

### hover 스타일 복원

- `&:hover`에 `color: var(--theme-primary-darker)` 존재: `sd-select-button.ts:34` 확인
- `&:hover`에 `background: var(--theme-gray-lightest)` 존재: `sd-select-button.ts:35` 확인 (기존 `var(--trans-lighter)` 대체 완료)

### v14 개선사항 유지 확인

- `display: inline-flex` 유지: `sd-select-button.ts:20` 확인 (v12 `display: block`이 아님)
- `align-items: center; justify-content: center` 유지: `sd-select-button.ts:21-22` 확인
- `position: relative; overflow: hidden` 유지: `sd-select-button.ts:26-27` 확인 (ripple 효과용)
