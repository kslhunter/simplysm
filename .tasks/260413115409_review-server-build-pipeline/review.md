# 코드 리뷰: server-build-pipeline-integration

## 분석 범위

`.tasks/260412211237_server-build-pipeline-integration/*.md`에 명시된 Feature 1.1~3.1의 구현 코드 전체:

- `packages/sd-cli/src/esbuild/esbuild-tsc-plugin.ts` (Feature 1.1 — 신규)
- `packages/sd-cli/src/workers/server-esbuild-context.ts` (Feature 1.2 — 수정)
- `packages/sd-cli/src/workers/server-build.worker.ts` (Feature 1.3 — 수정)
- `packages/sd-cli/src/workers/server-watch-manager.ts` (Feature 1.2 — 변경 없음 확인)
- `packages/sd-cli/tests/esbuild/esbuild-tsc-plugin.spec.ts` (Feature 2.1)
- `packages/sd-cli/tests/esbuild/esbuild-tsc-plugin.acc.spec.ts` (Feature 2.1)
- `packages/sd-cli/tests/workers/server-esbuild-context.spec.ts` (Feature 2.2)
- `packages/sd-cli/CLAUDE.md` (Feature 3.1)

## 분석 요약

WBS/plan 문서와 구현의 일치성, 로직 버그, 일관성, 성능, 설계 관점에서 심층 분석을 수행했다. 전반적으로 코드가 WBS와 정확히 일치하며, 테스트 커버리지도 충분하다. 심각한 이슈는 발견되지 않았다.

## LOGIC-001 [Low] rebuild()에서 context.rebuild() throw 시 tsc 에러 누락

- **위치:** packages/sd-cli/src/workers/server-esbuild-context.ts:79

`rebuild()` 함수는 `context.rebuild()` 결과에서 esbuild 에러와 tsc 에러를 병합하여 반환한다 (`:89-91`). 하지만 esbuild가 빌드 에러를 감지하면 `context.rebuild()`가 `BuildFailure`를 throw하므로, 에러 병합 코드(`:89-91`)에 도달하지 못한다. 이 경우 tsc 에러는 플러그인 내부에 저장되어 있지만 조회되지 않은 채 예외가 호출자로 전파된다.

반면 `build()` 함수(`server-build.worker.ts:168-185`)에서는 `.catch()` 패턴으로 esbuild 예외를 잡아 `jsResult`로 변환한 후 `tscPlugin.getErrors()`를 별도 조회하여 양쪽 에러를 병합한다. 즉, one-shot build와 watch rebuild의 에러 처리 경로가 비대칭이다.

**실질적 영향**: `context.rebuild()`가 throw하는 상황(모듈 해석 실패, esbuild 내부 에러)은 매우 드물고, watch 모드에서는 다음 빌드에서 tsc 에러가 정상 표시된다.

**개선 방향:** `rebuild()`에서 `context.rebuild()`를 try-catch로 감싸고, catch에서 `BuildFailure.errors`와 `tscPlugin?.getErrors()`를 병합하여 반환. 또는 현재 동작을 수용하고 코드 주석으로 에지 케이스를 문서화.

---

## 거짓양성 필터링

분석 과정에서 다음 후보가 탐지되었으나 거짓양성으로 판정하여 제외했다:

| 후보 | 위치 | 사유 | 필터링 근거 |
|------|------|------|-------------|
| parseTsconfig 중복 호출 | server-build.worker.ts:140 + esbuild-tsc-plugin.ts:42 | build() js=true에서 entryPoints용 + tsc용으로 두 번 호출 | **의도적 설계**: 플러그인이 독립적으로 tsconfig를 파싱하는 것은 watch 모드 갱신을 위한 설계. one-shot build에서는 성능 영향 미미 |
| result.errors.map() dead code | server-esbuild-context.ts:89 | esbuild는 errors가 있으면 throw하므로 resolve된 result에는 항상 빈 배열 | **방어적 코딩**: esbuild API 변경에 대한 안전장치. 기존 코드베이스의 일관된 패턴 |
| tscErrors = [] 패턴 | server-build.worker.ts:287 | rebuildAll() js=true에서 tsc 에러가 이미 esbuildCtx.rebuild()에 병합됨을 빈 배열로 표현 | **의도적 설계**: js=true/false 경로의 후처리 로직(`:325-326`)을 통일하기 위한 패턴. 동작 정확성에 영향 없음 |
