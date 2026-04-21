# esbuild context dispose 안전성 -- LLM 검증

## 검증 항목

- try-finally 패턴 적용: `server-build.worker.ts:434-442` — oldContext 캡처 후 try 블록에서 새 context 생성, finally에서 oldContext.dispose() 호출
- 성공 시 dispose: try 블록에서 새 context 생성 성공 → finally에서 oldContext.dispose() 실행
- 실패 시 dispose: createEsbuildWatchContext() 예외 시 → finally에서 oldContext.dispose() 실행 보장
- null 안전: `if (oldContext != null)` 가드로 oldContext가 없는 경우(output.js=false 등) 안전
