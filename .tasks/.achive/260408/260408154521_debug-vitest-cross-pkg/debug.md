# 디버그: angularVitestPlugin이 크로스 패키지 Angular 소스를 컴파일하지 못함

## 출처

- **origin:** `direct` -- 사용자 직접 입력
- **완료 시 참고:** 해당 없음

## 문제 증상

- **유형:** 동작 이상
- **증상:** 기대: 소비앱에서 tsconfig paths로 resolve되는 `@simplysm/*` Angular 소스가 AOT 컴파일됨 / 실제: 크로스 패키지 Angular 데코레이터가 변환되지 않아 런타임 에러 발생
- **위치:** `packages/sd-cli/src/vitest-plugin.ts:100-106` (emit 루프)
- **재현 절차:** 소비앱의 tsconfig에 `"paths": { "@simplysm/*": ["../simplysm/packages/*/src/index.ts"] }` 설정 후, `@simplysm/angular` 컴포넌트를 import하는 테스트를 vitest로 실행

## 근본 원인 추적 (ACH)

### ACH 매트릭스

|                                | 증거1: emit 루프가 sourceFiles만 순회 | 증거2: sdAngularPlugin은 동일 조건에서 동작함 | 증거3: NgtscProgram.analyzeAsync()는 전체 프로그램 분석 |
| ------------------------------ | ------------------------------------ | --------------------------------------------- | ------------------------------------------------------- |
| H1: emit 루프 범위 부족        | C(code) -- vitest-plugin.ts:100-106  | C(code) -- emitAffectedFiles()는 getSourceFiles() 전체 순회 | C(code) -- analyzeAsync() 후 transformers는 전체 파일에 동작 |
| H2: rootNames 범위 부족        | N                                    | I(code) -- sdAngularPlugin도 rootNames=src/만 사용하지만 정상 동작 | N |

### 결과: 확정 -- H1

**vitest-plugin.ts의 emit 루프가 `sourceFiles`(단일 패키지의 src/ + .fixture.)만 순회하여, tsProgram에 포함된 크로스 패키지 소스를 emit하지 않는 것이 근본 원인.**

비교:
- `sdAngularPlugin` (vite-angular-plugin.ts:287-289): `AngularCompiler.emitAffectedFiles()`를 사용하며, 이 메서드는 `tsProgram.getSourceFiles()` 전체를 순회하여 `ignoreForEmit`에 없는 모든 파일을 emit함 (angular-compiler.ts:499-519). sourceFilter 없이 호출되므로 크로스 패키지 포함.
- `angularVitestPlugin` (vitest-plugin.ts:100-106): 직접 `sourceFiles` 배열만 순회. 크로스 패키지 파일 누락.

## 해결 방안

### 방안 A: emit 루프 확장

- **설명:** vitest-plugin.ts의 emit 루프를 `sourceFiles` 순회에서 `tsProgram.getSourceFiles()` 순회로 변경. `AngularCompiler.emitAffectedFiles()`와 동일 패턴 적용.
- **장점:** 1개 파일의 emit 루프만 변경. sdAngularPlugin과 패턴 통일.
- **반론:** emit 대상 증가로 초회 빌드 시간 약간 증가 (1회만 실행되므로 미미)
- **점수:** 정확성 10/10, 변경 리스크 9/10, 유지보수성 10/10 -> **평균 9.7/10**

## 선택 결과

**방안 A** (평균 9.7/10)

emit 루프를 `tsProgram.getSourceFiles()` 기반으로 변경하여 `program.compiler.ignoreForEmit`으로 필터링. 변경 파일: `packages/sd-cli/src/vitest-plugin.ts` (emit 루프 6줄).
