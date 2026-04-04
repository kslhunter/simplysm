# 디버그: Angular 라이브러리 watch 리빌드 시 .d.ts에 Angular 메타데이터 누락

## 출처

- **origin:** `direct` — 사용자 직접 발견

## 에러 증상

- **에러 메시지:** `.d.ts` 파일에 `static ɵcmp`, `static ɵfac` 등 Angular 메타데이터가 없음. 일반 tsc가 생성한 `.d.ts`와 동일한 형태.
- **위치:** `packages/sd-cli/src/utils/angular-compiler.ts:emitAffectedFiles()`
- **재현:** `pnpm watch` (전체 패키지) → 의존성 패키지 소스 변경 → angular 리빌드 트리거 → 로그: `total=270, js=0, dts=135`

## 근본 원인 추적 (ACH)

### ACH 매트릭스

|    | E1: js=0,dts=135 로그 | E2: emitDeclarationOnly=false | E3: TS 소스 131686-131694줄 | E4: @angular/build 동일 API |
|----|----------------------|-------------------------------|---------------------------|---------------------------|
| H1: builder program emitKind=DTS-only | C(code) | C(code) | C(code) | C(code) |
| H2: writeFileCallback .js 필터링 | I → 폐기 | N | N | I → 폐기 |
| H3: TraitCompiler class lookup 실패 | I → 폐기 | N | N | N |

### 결과: 확정 — H1

TypeScript 5.9의 `EmitAndSemanticDiagnosticsBuilderProgram.emitNextAffectedFile()`이 내부적으로 `getNextAffectedFilePendingEmit()`에서 DTS-only `emitKind`를 결정하면, `state.program.emit(..., emitOnly=1 /* Dts */, ...)`을 호출한다. 이는 호출자가 전달한 `emitOnlyDtsFiles=false`와 **무관한 builder program 내부 최적화**이다.

DTS-only emit 시 `.js`가 생성되지 않으므로 Angular의 `before` transformer(`ivyTransformFactory`)가 `.js` 코드를 생성하지 않고, 이에 따라 `DtsTransformRegistry`에 메타데이터가 등록되지 않아 `.d.ts`에 Angular 메타데이터가 누락된다.

## 해결 방안

### 방안 A: ts.Program.emit() 직접 호출 (NgtscProgram.emit 패턴 채택)

- **설명:** `emitAffectedFiles()`에서 `builderProgram.emitNextAffectedFile()`/`builderProgram.emit()` 대신 `ts.Program.emit()`을 직접 사용. builder program은 affected file 탐지와 진단 수집에만 사용.
- **장점:** Angular 공식 라이브러리 emit 패턴과 동일. builder program 내부 최적화에 의존하지 않아 안정적.
- **반론:** builder program의 emit-level incremental 추적을 사용하지 않게 됨. 하지만 Angular의 `safeToSkipEmit`이 자체 incremental 추적을 제공하므로 실질적 영향 없음.
- **점수:** 안정성 10/10, 정합성 10/10, 성능 8/10 → **평균 9.3/10**

### 방안 B: dts-only 감지 후 재emit

- **점수:** 평균 4.7/10 — 우회 패턴으로 탈락

### 방안 C: builder program 완전 제거

- **점수:** 평균 7.0/10 — 진단 성능 저하로 탈락

## 선택 결과

**방안 A** (평균 9.3/10)

Angular 공식 라이브러리 emit 패턴(NgtscProgram.emit)과 동일한 접근. builder program은 진단용으로만 유지.
