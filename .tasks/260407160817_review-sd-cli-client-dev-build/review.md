# Code Review: sd-cli client dev/build

| 항목 | 값 |
| --- | --- |
| 분석 대상 | `packages/sd-cli/src/` 중 client dev/build 경로 |
| 일시 | 2026-04-07 |
| 분석 파일 수 | 15 |
| 발견 이슈 | 3건 (Critical: 1, Medium: 1, Low: 1) |

## 분석 파일 목록

- `workers/client.worker.ts` - 클라이언트 빌드/워치 워커
- `engines/ViteEngine.ts` - Vite 기반 클라이언트 엔진
- `engines/types.ts` - 엔진 인터페이스 정의
- `engines/index.ts` - 엔진 팩토리
- `orchestrators/DevWatchOrchestrator.ts` - dev/watch 모드 오케스트레이터
- `orchestrators/BuildOrchestrator.ts` - 프로덕션 빌드 오케스트레이터
- `commands/dev.ts`, `commands/build.ts` - CLI 커맨드
- `angular/vite-angular-plugin.ts` - Angular AOT Vite 플러그인
- `angular/vite-postcss-inline-plugin.ts` - PostCSS 인라인 플러그인
- `angular/client-transform-stylesheet.ts` - SCSS 변환
- `utils/vite-config.ts` - Vite 설정 생성
- `utils/package-utils.ts` - 패키지 분류
- `utils/vite-scope-watch-plugin.ts` - replaceDeps HMR 플러그인
- `utils/rebuild-manager.ts` - 리빌드 배치 관리
- `utils/output-utils.ts` - 출력 포맷팅

---

## Critical

### LOGIC-001: 프로덕션 빌드가 Angular 컴파일 에러를 무시함

```
id: LOGIC-001
severity: Critical
category: 로직
location: workers/client.worker.ts:414-446, engines/ViteEngine.ts:65-94
title: 프로덕션 빌드가 Angular 컴파일 에러를 결과에 반영하지 않음
```

**description:**

`client.worker.ts`의 `build()` 함수에서 `onBuild` 콜백이 `lint` 결과만 캡처하고, Angular 컴파일의 `success`/`errors`를 무시한다. 이로 인해 Angular AOT 컴파일에 에러가 있어도 항상 `{ success: true }`를 반환한다.

**흐름 추적:**

1. `sdAngularPlugin.buildStart()`가 Angular 컴파일 수행 후 `onBuild({ success: false, errors: [...] })`를 호출 (vite-angular-plugin.ts:310-315)
2. `client.worker.ts:build()`의 `onBuild` 콜백이 `lint`만 캡처하고 `success`/`errors`는 버림 (client.worker.ts:425-428)
3. `viteBuild()` 완료 후 항상 `{ success: true }` 반환 (client.worker.ts:446)
4. `ViteEngine.run()`도 `diagnostics: []`을 반환하여 TypeScript 진단 정보도 전파되지 않음 (ViteEngine.ts:90)
5. `BuildOrchestrator`가 `engineResult.build.success === true`로 판단하여 에러를 집계하지 않음

**영향:** Angular 컴파일 에러가 콘솔에는 출력되지만 (`reportDiagnostics`를 통해), 빌드 결과에는 반영되지 않아 `process.exitCode`가 0으로 유지된다. CI/CD 파이프라인이 에러가 있는 빌드를 성공으로 판단하게 된다.

**대조:** dev 모드에서는 `onBuild: (result) => sender.send("build", result)`로 전체 결과를 전달하여 정상 처리됨 (client.worker.ts:216). legacy watch에서도 동일하게 정상 (client.worker.ts:292).

**suggestion:**

`build()` 함수에서 `onBuild` 콜백의 `success`/`errors`/`warnings`를 캡처하여 반환값에 반영해야 한다:

```typescript
let buildSuccess = true;
let buildErrors: string[] | undefined;
let buildWarnings: string[] | undefined;
let lintResult: LintWithProgramResult | undefined;

const viteConfig = await createClientViteConfig({
  // ...
  onBuild: (result) => {
    buildSuccess = result.success;
    buildErrors = result.errors;
    buildWarnings = result.warnings;
    if (result.lint != null) {
      lintResult = result.lint;
    }
  },
});

await viteBuild(viteConfig);
// ...
return {
  success: buildSuccess,
  errors: buildErrors,
  warnings: buildWarnings,
  lint: lintResult,
};
```

---

## Medium

### DESIGN-001: `_getClientPort()` duck-typing으로 타입 안전성 우회

```
id: DESIGN-001
severity: Medium
category: 설계
location: orchestrators/DevWatchOrchestrator.ts:507-510
title: BuildEngine 인터페이스에 없는 ViteEngine.port를 duck-typing으로 접근
```

**description:**

`_getClientPort()`가 `BuildEngine`을 `{ port?: number }`로 캐스팅하여 `ViteEngine` 전용 `port` 프로퍼티에 접근한다. `BuildEngine` 인터페이스에는 `port`가 정의되어 있지 않으므로, 엔진 구현이 변경되거나 다른 엔진 타입이 사용되면 타입 시스템이 이를 감지하지 못한다.

```typescript
private _getClientPort(name: string): number | undefined {
  const engine = this._clientEngines.get(name) as { port?: number } | undefined;
  return engine?.port;
}
```

**suggestion:**

`BuildEngine` 인터페이스에 선택적 `port` 프로퍼티를 추가하거나, 클라이언트 엔진 전용 인터페이스를 분리하여 타입 안전하게 접근하는 방식을 고려한다:

```typescript
// 방법 1: BuildEngine에 선택적 프로퍼티 추가
export interface BuildEngine {
  // ...
  readonly port?: number;
}

// 방법 2: 별도 Map에 포트 정보 관리
private readonly _clientPorts = new Map<string, number>();
// ViteEngine의 serverReady 이벤트에서 포트 캡처
```

---

## Low

### DESIGN-002: `esbuildTarget as string[]` 잘못된 타입 단언

```
id: DESIGN-002
severity: Low
category: 설계
location: utils/vite-config.ts:209
title: esbuildTarget이 string일 수 있는데 string[]로 단언
```

**description:**

`browserslist`가 미설정일 때 `esbuildTarget`은 `"es2022"` (string)이지만, `optimizeDeps.esbuildOptions.target`에 전달할 때 `as string[]`로 단언한다. esbuild의 `target`은 `string | string[]` 모두 허용하므로 런타임 에러는 발생하지 않지만, 타입 단언이 실제 값과 일치하지 않는다.

```typescript
let esbuildTarget: string | string[] = "es2022";
// ...
optimizeDeps: {
  esbuildOptions: {
    target: esbuildTarget as string[], // "es2022" (string)을 string[]로 단언
  },
},
```

**suggestion:**

불필요한 타입 단언을 제거하고 `string | string[]` 그대로 전달한다:

```typescript
optimizeDeps: {
  esbuildOptions: {
    target: esbuildTarget,
  },
},
```

Vite의 `esbuildOptions.target` 타입이 `string[]`만 허용한다면, 명시적으로 배열로 정규화한다:

```typescript
const esbuildTargetArray = Array.isArray(esbuildTarget) ? esbuildTarget : [esbuildTarget];
```
