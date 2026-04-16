# Feature 1.1 sd-button / sd-modal-select-button 복원 — LLM 검증

## 검증 항목

- [x] sd-button link 테마 `background: transparent` 존재: `sd-button.ts:105`에 `background: transparent;` 확인됨
- [x] sd-modal-select-button 호스트 `width: 100%` 존재: `sd-modal-select-button.ts:75`에 `width: 100%;` 확인됨
- [x] sd-modal-select-button 호스트 `min-width: 3em` 존재: `sd-modal-select-button.ts:76`에 `min-width: 3em;` 확인됨
- [x] 템플릿에서 `$event` 전달: `sd-modal-select-button.ts:60`에 `(click)="onSearchClick($event)"` 확인됨
- [x] `onSearchClick`에서 `preventDefault()` 호출: `sd-modal-select-button.ts:194`에 `event.preventDefault();` 확인됨
- [x] `onSearchClick`에서 `stopPropagation()` 호출: `sd-modal-select-button.ts:195`에 `event.stopPropagation();` 확인됨
