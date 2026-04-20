# 디버그: TypeScript 5.9.3 내부 크래시 — SdTsCompiler 단일 try-catch 통합

## 출처

- **origin:** `direct` — 사용자 직접 입력 (후속 작업: `.tasks/260419140715_debug-ts59-overload-crash`의 부분 catch 방식으로는 완전 커버 안 됨)

## 문제 증상

- **유형:** 에러
- **증상:**
  ```
  ERROR  client-admin (client)                             sd:cli:output PM 7:47:25
    Angular compilation failed. [plugin sd-angular-compiler]

      Error: Debug Failure. No error for last overload signature
          at resolveCall (typescript.js:81152:19)
          at resolveCallExpression (typescript.js:81534:12)
          at resolveSignature (typescript.js:81962:16)
          at getResolvedSignature (typescript.js:81989:20)
          at checkCallExpression (typescript.js:82097:23)
          at checkExpressionWorker (typescript.js:85559:16)
          at checkExpression (typescript.js:85457:32)
          at checkNonNullExpression (typescript.js:79464:29)
          at checkPropertyAccessExpression (typescript.js:79543:162)
          at checkExpressionWorker (typescript.js:85548:16)
  ```
- **위치:** `packages/sd-cli/src/esbuild/esbuild-angular-compiler-plugin.ts:450` 외부 catch가 "Angular compilation failed."로만 보고
- **재현 절차:** `adtek` 프로젝트에서 `pnpm sd-cli dev` 실행 후 리빌드 반복

## 근본 원인

TypeScript 5.9.3의 알려진 컴파일러 버그 (microsoft/TypeScript#61524, #60229, #63094, #63195 등). `resolveCall`에서 overload resolution 실패 시 `Debug.assert`가 터진다.

선행 작업(`260419140715_debug-ts59-overload-crash`)에서 일부 호출 지점(`analyzeAsync`, `getSemanticDiagnostics`, `getSemanticDiagnosticsOfNextAffectedFile`, `builderProgram.emit`)에 try-catch를 추가했으나, **체커가 재진입하는 다음 지점들이 여전히 unwrapped**:

- `packages/sd-cli/src/ts-compiler/SdTsCompiler.ts:548` — `angularCompiler.getDiagnosticsForFile()` (템플릿 타입체크)
- `packages/sd-cli/src/ts-compiler/SdTsCompiler.ts:612` — `angularCompiler.prepareEmit()` (transformer 준비 중 체커 호출)
- `packages/sd-cli/src/ts-compiler/SdTsCompiler.ts:662` — `tsProgram.emit(sourceFile, ...)` (ngtsc transformer가 체커 호출)

이 중 하나에서 `Debug Failure`가 던져지면 `compileAsync`를 탈출해 `esbuild-angular-compiler-plugin.ts:450`의 외부 catch가 "Angular compilation failed."로 뭉뚱그려 표시한다.

## 해결 방안

- **방안:** `SdTsCompiler.compileAsync()` 본체를 단일 try-catch로 감싸고, 내부 산발적 try-catch 전부 제거. catch에서 단일 `"TsCompiler 내부 크래시: <message>"` 에러 진단을 리턴.
- **설명:**
  1. 필수 setup 구간(tsconfig 파싱, rootNames, compilerOptions, host/program 생성)은 체커를 타지 않으므로 try 밖에 유지.
  2. 위험 구간(`analyzeAsync`, `_findAffectedFiles*`, `_emit*`, `_collectDiagnostics*`)을 하나의 try로 통합.
  3. catch에서 SerializedDiagnostic 에러 1건을 `diagnostics`에 담아 degrade된 결과 리턴(`emitResults: undefined`, `affectedFiles: undefined`, `lint: undefined`).
  4. watch 루프는 계속 유지되어 다음 리빌드에서 자동 재시도.
- **선택 사유:**
  - 개별 호출 지점 catch는 TS 내부 API가 바뀔 때마다 새 크래시 지점을 다시 잡아야 해서 유지보수 비용이 크다.
  - 단일 래핑은 "크래시 = TS 컴파일러 오류"로 일관되게 보고. 메시지 라벨이 명확(`TsCompiler 내부 크래시`)해서 Angular plugin의 "Angular compilation failed." 오보와 구분됨.
  - 부분 복구(크래시 1건이 나도 나머지 파일 진단 수집)는 포기. 대신 다음 watch tick에서 전체 재시도.

### 수정 파일

- `packages/sd-cli/src/ts-compiler/SdTsCompiler.ts`
  - `compileAsync()` 본체: program 생성 이후 구간 전체를 단일 try-catch로 감싸고 catch에서 degrade 결과 리턴
  - 제거: `tsCrashDiagnostics` 배열, 내부 개별 try-catch 5곳
    - line 217-228 (`analyzeAsync`)
    - line 482-493 (`_collectDiagnosticsForTsc`의 `getSemanticDiagnostics`)
    - line 527-538 (`_collectDiagnosticsForAngular`의 `getSemanticDiagnostics`)
    - line 671-682 (`_emitAngular`의 `builderProgram.emit`)
    - line 697-711 (`_findAffectedFilesForTsc`)
    - line 736-771 (`_findAffectedFilesForAngular`)
  - `_findAffectedFilesForTsc` / `_findAffectedFilesForAngular` 반환 타입에서 `crashDiagnostics` 필드 제거
  - `_emitAngular` 파라미터에서 `crashDiagnostics` 제거
