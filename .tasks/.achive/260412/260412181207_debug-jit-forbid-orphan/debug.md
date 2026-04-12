# 디버그: Angular 클라이언트 빌드 시 supportJitMode/forbidOrphanComponents 충돌

## 출처

- **origin:** `direct` — 사용자 직접 입력 (adtek 프로젝트 `pnpm dev --debug` 실행 시 에러)
- **완료 시 참고:** 해당 없음

## 문제 증상

- **유형:** 에러
- **증상:** `Error: JIT mode support ("supportJitMode" option) cannot be disabled when forbidOrphanComponents is set to true`
- **위치:** `@angular/build`의 `createCompilerPlugin` → `@angular/compiler-cli`의 `_NgCompiler.makeCompilation`
- **재현 절차:** adtek 프로젝트에서 `pnpm dev` 실행 → client-admin, client-pda 초기 빌드에서 Angular 컴파일 초기화 실패

## 근본 원인 추적 (ACH)

### ACH 매트릭스

|                          | 증거1: `includeTestMetadata` 미설정 (`esbuild-client-config.ts:68-78`) | 증거2: `supportJitMode = !!pluginOptions.includeTestMetadata` (`@angular/build compiler-plugin.js:578`) | 증거3: `forbidOrphanComponents: true` (`angular/tsconfig.json:15`) | 증거4: Angular CLI 원본에서 `includeTestMetadata: !optimization.scripts` 설정 확인 |
| ------------------------ | ----- | ----- | ----- | ----- |
| H1: sd-cli가 `includeTestMetadata`를 전달하지 않아 `supportJitMode`가 `false`로 설정됨 | C(code) | C(code) | C(code) | C(doc) |
| H2: Angular 21.2 자체 버그 | N | I — 공식 CLI에서는 `includeTestMetadata` 전달로 정상 동작 | N | I |

### 결과: 확정 — H1

sd-cli의 `createCompilerPlugin` 호출 시 `includeTestMetadata` 옵션을 전달하지 않았다. `@angular/build@21.2.7`의 `compiler-plugin.js`에서 `supportJitMode = !!pluginOptions.includeTestMetadata`로 매핑하므로, `undefined` → `!!undefined` → `false`가 되어 `forbidOrphanComponents: true`와 충돌한다.

Angular CLI 원본(`createCompilerPluginOptions`)에서는 `includeTestMetadata: !optimizationOptions.scripts`로 명시적으로 전달하고 있었다.

## 해결 방안

### 방안 A: Angular CLI와 일치하는 전반적 옵션 정리

- **설명:** `includeTestMetadata: isDev` 추가, `browserOnlyBuild` 제거 (공식 인터페이스에 없음), `incremental: isDev`로 변경
- **장점:** Angular CLI와 동일한 동작, 불필요한 비공식 옵션 제거
- **반론:** `browserOnlyBuild` 제거가 SSR 관련 동작에 영향을 줄 수 있으나, sd-cli는 SSR을 사용하지 않으므로 무관
- **점수:** 호환성 10/10, 변경 리스크 9/10, 정확성 10/10 → **평균 9.7/10**

## 선택 결과

**방안 A** (평균 9.7/10)

Angular CLI 소스코드 분석 결과에 기반하여 `CompilerPluginOptions` 전반을 Angular CLI와 일치시킴.

### 변경 파일

1. `packages/sd-cli/src/esbuild/esbuild-client-config.ts:68-78` — `includeTestMetadata: isDev` 추가, `browserOnlyBuild` 제거, `incremental: isDev`
2. `packages/sd-cli/tests/utils/esbuild-client-config.acc.spec.ts:111` — `browserOnlyBuild` assertion → `includeTestMetadata` assertion
