# 코드 리뷰: perf-impl-final

## LOGIC-001 [Medium] sideEffectScssDeps 미갱신으로 증분 재컴파일 누락

- **위치:** `packages/sd-cli/src/workers/library-build.worker.ts:207`

`.ts` 파일에 새 side-effect SCSS import를 추가하고 SCSS 파일 자체는 변경하지 않은 경우, `changedScssFiles.size === 0`이어서 `compileSideEffectScss`가 스킵된다. `writeEmitResults`가 새 SCSS를 registry에 등록하고 즉시 컴파일하지만(`ngtsc-build-core.ts:263`), `sideEffectScssDeps`에는 의존성이 기록되지 않는다. 이후 빌드에서 해당 SCSS의 의존성(예: `_variables.scss`)이 변경되면, `compileSideEffectScss` 증분 판별에서 `isDirectHit` = false, `isDepsHit` = false (의존성 정보 없음)가 되어 재컴파일이 건너뛰어진다.

근본 원인: `sideEffectScssDeps`는 `compileSideEffectScss` 함수 내부(`ngtsc-build-core.ts:147-149`)에서만 갱신되며, `writeEmitResults` 내부의 `compileScssFile` 호출(`ngtsc-build-core.ts:263`)에서는 갱신되지 않는다.

**개선 방향:** `writeEmitResults`에 `sideEffectScssDeps`를 전달하여 `compileScssFile` 호출 후 의존성을 기록하거나, `buildWatchEvent`에서 새 registry 항목이 추가된 경우 `changedScssFiles.size === 0`이어도 해당 항목에 대해 `sideEffectScssDeps`를 갱신해야 한다.

---
