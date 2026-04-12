# _normalizeResult 서브클래스 사용 — LLM 검증

## 검증 항목

- [x] TscEngine._callBuild()가 this._normalizeResult(result)를 호출한다: TscEngine.ts:56 확인 — `return this._normalizeResult(result);`
- [x] NgtscEngine._callBuild()가 this._normalizeResult(result)를 호출한다: NgtscEngine.ts:55 확인 — `return this._normalizeResult(result);`
- [x] ServerEsbuildEngine._callBuild()가 this._normalizeResult(result)를 호출한다: ServerEsbuildEngine.ts:60 확인 — `return this._normalizeResult(result);`
- [x] BaseEngine._normalizeResult()의 입력 타입이 Worker 반환 구조와 호환된다: build.errors?/warnings?가 optional이고, diagnostics가 SerializedDiagnostic[]로 일치
- [x] 3개 서브클래스에서 인라인 normalization 코드가 완전히 제거되었다: 각 파일에서 `result.build.errors ??` 패턴이 더 이상 없음
