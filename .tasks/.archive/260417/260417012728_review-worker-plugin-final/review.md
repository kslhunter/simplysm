# 코드 리뷰: esbuild Worker Plugin Node.js import.meta.resolve 지원

## 총평

구현이 전반적으로 **우수**하다. 핵심 로직(정규식 패턴 감지, Worker 번들링, 경로 치환)이 정확하고, 기존 브라우저 Worker 패턴과 일관된 구조로 확장되었다. 요구명세의 모든 시나리오가 단위 테스트 + 수락 테스트로 커버되어 있다. `core-node/worker.ts`의 `file://` URL 호환도 설계 문서(D2)에 근거하여 올바르게 처리되었다.

**Critical/Medium 이슈 없음.** Low 이슈 2건은 현재 동작에 영향이 없는 구조적 관찰이다.

---

## DESIGN-001 [Low] `bundleWorker()` 옵션 상속 범위가 암묵적

- **위치:** `packages/sd-cli/src/esbuild/esbuild-worker-plugin.ts:54-67`

`bundleWorker()`가 `build.initialOptions` 전체를 spread한 뒤 11개 옵션만 명시적으로 오버라이드한다. `banner`, `target`, `minify`, `tsconfig`, `logLevel`, `alias`, `inject` 등은 암묵적으로 상속된다.

현재 서버 빌드 설정(`esbuild-config.ts:77-97`)에서 상속되는 옵션은 모두 Worker 빌드에 적절하다:
- `banner` (`createRequire` shim + env) — Worker에서 CJS 의존성 로딩에 유용
- `target: "node20"` — Node.js Worker에 적합
- `minify` — 프로덕션/개발 모드 동기화

그러나 향후 메인 빌드에 `inject`, `alias`, `define` 등을 추가할 경우, Worker 빌드에 의도치 않은 영향을 줄 수 있다.

**개선 방향:** 현 시점에서 수정 불필요. 향후 메인 빌드 옵션을 추가할 때 Worker 빌드 영향을 고려하면 충분. 필요시 allowlist 방식(필요한 옵션만 명시적 선택)으로 전환 검토.

---

## DESIGN-002 [Low] Worker 출력 경로 계산이 flat output 구조를 가정

- **위치:** `packages/sd-cli/src/esbuild/esbuild-worker-plugin.ts:165`

```typescript
return path.relative(outdir, workerCodeFile.path).replaceAll("\\", "/");
```

이 경로는 `outdir` 기준의 상대 경로이다. 런타임에는 `new URL("worker-HASH.js", import.meta.url)`로 **메인 번들 파일 위치** 기준으로 해석된다. 현재 서버 빌드는 `bundle: true` + 단일 entry point이므로 메인 번들이 `outdir` 루트에 위치하여 문제없다.

그러나 `outbase` 설정이나 중첩 entry point 구조를 사용하면, 메인 번들이 `outdir/sub/main.js`에 출력되어 Worker 경로가 `worker-HASH.js`(= `outdir/sub/worker-HASH.js`로 해석)로 잘못 지정될 수 있다. 실제 Worker 파일은 `outdir/worker-HASH.js`에 있으므로 불일치 발생.

이 한계는 기존 브라우저 Worker 패턴(`processWorkerBundle` 공유)에도 동일하게 존재하는 pre-existing issue이다.

**개선 방향:** 현 시점에서 수정 불필요 (서버 빌드가 flat output 구조를 사용). 향후 `outbase` 도입 시, Worker 경로를 메인 번들 출력 파일 기준 상대 경로로 계산하도록 변경 필요.

---

## 검증 완료 항목

| 관점 | 결과 | 상세 |
|------|------|------|
| 정규식 정확성 | ✅ | 실제 사용 패턴(`protocol-wrapper.ts:35-36`) 정확히 포착. 상대경로만 감지, 절대 모듈 무시 |
| 경로 치환 호환성 | ✅ | `new URL("path", import.meta.url).href` → `file://` URL → `core-node/worker.ts:58` `fileURLToPath` 호환 |
| platform 계승 | ✅ | 서버 빌드 `platform: "node"` 정확히 계승, 브라우저 패턴은 `"browser"` 유지 |
| 에러 전파 | ✅ | Worker 빌드 에러 → `errors` 배열 → `onLoad` 결과 → 메인 빌드 에러로 전파 |
| 기존 동작 보존 | ✅ | 브라우저 Worker 패턴 변경 없음. `processWorkerBundle` 공통 함수로 통합 |
| 테스트 커버리지 | ✅ | 요구명세 10개 시나리오 전체 커버 (단위 + 수락) |
| write 모드 처리 | ✅ | `write: false` → `outputFiles` + `onEnd` 병합, `write: true` → 디스크 기록 |
| 패턴 간 교차 간섭 | ✅ | 브라우저/Node.js 치환 결과가 상호 패턴에 매칭 안됨 |
| Angular 플러그인 통합 | ✅ | `transformWorkerPatterns` 직접 호출 방식 유지, 기존 호출처 영향 없음 |
| `lastIndex` 리셋 | ✅ | 전역 regex `.test()` 후 `lastIndex = 0` 리셋 처리 |
