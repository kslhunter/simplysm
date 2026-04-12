# Slice 3: 일관성 및 정리 — LLM 검증

## 검증 항목

- [x] CONSIST-001: TypecheckOrchestrator.ts:265-266에서 매직 넘버 대신 ts.DiagnosticCategory enum 사용
  - 확인: `d.category === ts.DiagnosticCategory.Error`와 `d.category === ts.DiagnosticCategory.Warning`으로 변경됨. `ts`는 이미 line 0에서 import됨.

- [x] CONSIST-002: WatchOrchestrator.ts:182에서 `this._watchHookWatchers.length = 0` → `this._watchHookWatchers = []`로 변경
  - 확인: 세 배열 모두 `= []` 재할당 패턴으로 통일됨 (180: _copySrcWatchers, 181: _distDeleteWatchers, 182: _watchHookWatchers)

- [x] DESIGN-004: engine-factory.ts에서 `resolvedReplaceDeps` 파라미터 제거, DevOrchestrator.ts에서 변수 생성/전달 코드 제거
  - 확인: engine-factory.ts의 options 인터페이스에서 제거됨. DevOrchestrator.ts에서 `const resolvedReplaceDeps = ...` 변수 및 전달 코드 제거됨. 3곳 모두 정리 완료.

- [x] DESIGN-005: storage-publisher.ts의 SSH error 이벤트에 `conn.end()` 추가
  - 확인: `conn.on("error", () => { conn.end(); resolve(false); });` — ready 핸들러와 동일하게 conn.end() 호출 후 resolve.

- [x] LOGIC-001: electron.ts의 cleanup 함수가 async로 변경되고 `await ctx.dispose()` 사용
  - 확인: `const cleanup = async () => { ... await ctx.dispose(); resolve(); };` — fire-and-forget에서 await 대기로 전환됨.
