# sd-cli 리팩토링 분석 리포트

| 항목 | 내용 |
|------|------|
| **분석 대상** | `packages/sd-cli/src/` |
| **분석 일시** | 2026-04-15 |
| **파일 수** | ~106개 TypeScript 파일 |
| **발견 이슈** | 2건 (Medium 0, Low 2) |

## 아키텍처 전체 평가

sd-cli 패키지는 전반적으로 **우수한 구조**를 가지고 있다.

- **순환 의존성**: 없음 (전체 디렉토리 간 import 그래프 검증 완료)
- **레이어링**: `commands → orchestrators → engines → workers` 방향 준수, 역방향 import 없음
- **utils 격리**: commands/orchestrators/engines/workers로부터의 import 없음 — 순수 크로스커팅 레이어
- **설계 패턴**: BaseEngine 템플릿 메서드, engine-factory 전략, OrchestratorLifecycle 인터페이스 모두 적절
- **Worker 격리**: Worker Thread가 orchestrators/commands를 import하지 않음 — 진정한 리프 노드

---

## 이슈 목록

### DESIGN-001: `onStart` 콜백 과대화

| 항목 | 내용 |
|------|------|
| **id** | DESIGN-001 |
| **severity** | Low |
| **category** | 설계 |
| **location** | `packages/sd-cli/src/esbuild/esbuild-angular-compiler-plugin.ts:303-508` |
| **title** | `createAngularCompilerPlugin().setup()` 내 `onStart` 콜백이 ~205줄, 7개 관심사 포함 |

**description:**

`onStart` 콜백이 다음 7개의 독립적 관심사를 단일 함수에 포함한다:

1. 증분 빌드 처리 (316-383, ~67줄) — HMR 감지, 캐시 무효화, templateUpdates 수집
2. 첫 빌드 초기화 (384-409, ~25줄) — AngularCompiler 생성, 플래그 결정
3. processWebWorker 콜백 정의 (412-456, ~44줄) — Worker 파일 esbuild 번들링
4. emit (459-464, ~6줄) — emitAffectedFiles + typeScriptFileCache 적재
5. diagnostics 수집 (467-474, ~8줄) — Angular + TS 진단 변환
6. stylesheet 의존성 브릿징 (477-488, ~12줄) — FileReferenceTracker 등록
7. 에러 핸들링 (491-503, ~13줄) — 전체 catch 블록

HMR 로직이나 emit 로직을 변경할 때 205줄 함수 내에서 해당 섹션을 찾아야 하므로 탐색 비용이 발생한다.

**suggestion:**

상위 3개 큰 관심사를 `setup` 스코프 내의 이름 있는 함수로 추출한다. 클로저 상태(angularCompiler, typeScriptFileCache 등)는 `setup` 스코프에서 공유되므로 파라미터 전달 없이 추출 가능하다.

```typescript
// 추출 대상:
// 1. handleIncrementalBuild(errors, warnings) — 316-383줄
// 2. handleFirstBuild(errors) — 384-409줄
// 3. createWebWorkerProcessor(errors, warnings) — 412-456줄

build.onStart(async () => {
  const errors: esbuild.PartialMessage[] = [];
  const warnings: esbuild.PartialMessage[] = [];

  if (angularCompiler != null && sourceFileCache?.modifiedFiles.size > 0) {
    handleIncrementalBuild(errors, warnings);
  } else if (angularCompiler == null) {
    await handleFirstBuild();
  }

  const processWebWorker = createWebWorkerProcessor(errors, warnings);
  // ... emit, diagnostics, stylesheet bridging (~40줄 유지)
});
```

영향 범위: `esbuild-angular-compiler-plugin.ts` 단일 파일 내부 리팩토링. 외부 API 변경 없음.

---

### DESIGN-002: `startWatch` 함수 과대화

| 항목 | 내용 |
|------|------|
| **id** | DESIGN-002 |
| **severity** | Low |
| **category** | 설계 |
| **location** | `packages/sd-cli/src/workers/client.worker.ts:189-417` |
| **title** | `startWatch` 함수가 ~228줄, 인라인 esbuild 플러그인(~57줄)과 onEnd 콜백(~59줄) 포함 |

**description:**

`startWatch` 함수가 228줄로, 11개 설정 단계를 수행하면서 두 개의 대형 인라인 구조를 포함한다:

1. `sd-build-start` 인라인 플러그인 (251-308, ~57줄) — `onStart`에서 sourceFileCache 무효화 + mtime 추적, `onEnd`에서 mtime 기록
2. `onEnd` 콜백 (310-369, ~59줄) — index.html 재생성 + HMR 디스패치 + 초기 빌드 resolve + 에러 처리

이 두 구조가 인라인으로 포함되어 `startWatch`의 전체 설정 흐름(dist 초기화 → public 복사 → polyfills 감지 → dev server 생성 → HMR 생성 → esbuild context → watch 시작 → index.html 감시 → 이벤트 전송)을 파악하기 어렵다.

**suggestion:**

인라인 플러그인과 onEnd 콜백을 모듈 스코프의 이름 있는 함수로 추출한다. 클로저 변수(esbuildResult, hmrService, sender 등)는 모듈 스코프에 있으므로 접근 가능하다.

```typescript
// 추출 대상:
// 1. createSourceFileCachePlugin() — 251-308줄 → 별도 함수
// 2. createDevBuildEndHandler(basePath, outdir, ...) — 310-369줄 → 별도 함수

async function startWatch(info: ClientBuildInfo): Promise<ClientBuildResult> {
  // ... 1~6 설정 (~25줄, 유지)

  esbuildResult = await createClientEsbuildContext({
    // ...
    plugins: [createSourceFileCachePlugin()],
    onEnd: createDevBuildEndHandler(basePath, actualPort, outdir, entryNames),
  });

  // ... 8~11 설정 (~35줄, 유지)
}
```

영향 범위: `client.worker.ts` 단일 파일 내부 리팩토링. Worker API 변경 없음.
