# DESIGN-003: SdModal void async 에러 처리 — LLM 검증

## 검증 항목

- `_errorHandler` 필드가 `inject(ErrorHandler)`로 선언됨: `sd-modal.ts:289` — `private readonly _errorHandler = inject(ErrorHandler)` 확인
- `ErrorHandler`가 import에 포함됨: `sd-modal.ts:6` — `ErrorHandler` 추가 확인
- `_restoreConfig` 호출에 `.catch()` 추가됨: `sd-modal.ts:353` — `void this._restoreConfig(k).catch((err) => this._errorHandler.handleError(err))` 확인
- `_saveConfig` (onEnd 콜백)에 `.catch()` 추가됨: `sd-modal.ts:320` — `void this._saveConfig().catch((err) => this._errorHandler.handleError(err))` 확인
- `_saveConfig` (_requestClose)에 `.catch()` 추가됨: `sd-modal.ts:396` — `void this._saveConfig().catch((err) => this._errorHandler.handleError(err))` 확인
- `.catch()` 콜백이 `this._errorHandler.handleError(err)`를 호출: 3곳 모두 동일 패턴 확인
