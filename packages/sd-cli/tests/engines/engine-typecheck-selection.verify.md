# TypecheckOrchestrator 원본 config 전달 — LLM 검증

## 검증 항목

- target 변환 로직 제거됨: `TypecheckOrchestrator.ts:133-142`에서 `config.target === "client" ? { target: "browser" as const } : config` 코드가 제거되고, 원본 `config`가 그대로 `_typecheckTasks`에 저장됨
- createTypecheckEngine 호출: `TypecheckOrchestrator.ts:209`에서 `createBuildEngine` 대신 `createTypecheckEngine`을 호출함
- import 변경: `TypecheckOrchestrator.ts:7`에서 `createBuildEngine` 대신 `createTypecheckEngine`을 import함
- createTypecheckEngine 내부 변환: `engines/index.ts`의 `createTypecheckEngine`이 client target을 `{ target: "browser" }`로 변환하여 `createBuildEngine`에 위임함
