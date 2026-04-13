# DESIGN-004: SdDataDetailBase queueMicrotask 에러 처리 — LLM 검증

## 검증 항목

- [x] `_errorHandler` 필드가 `inject(ErrorHandler)`로 선언됨: `sd-data-detail.base.ts:52` — `private readonly _errorHandler = inject(ErrorHandler)` 확인
- [x] `ErrorHandler`가 import에 포함됨: `sd-data-detail.base.ts:4` — `ErrorHandler` 추가 확인
- [x] `queueMicrotask(async () => { ... })` 내부에 try-catch 추가됨: `sd-data-detail.base.ts:78-95` — `try { ... } catch (err) { this._errorHandler.handleError(err); }` 확인
- [x] 기존 로직(cancelled 검사, canUse, withBusy, initialized)이 try 블록 내에 보존됨: 모든 기존 코드가 try 블록 안에 그대로 존재 확인
