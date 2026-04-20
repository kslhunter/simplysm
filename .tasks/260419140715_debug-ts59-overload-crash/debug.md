# 디버그: TypeScript 5.9.3 내부 크래시 — overload resolution 실패

## 출처

- **origin:** `direct` — 사용자 직접 입력
- **완료 시 참고:** 없음

## 문제 증상

- **유형:** 에러
- **증상:** `Error: Debug Failure. No error for last overload signature`
- **위치:** `sd-cli dev` 실행 중 Angular compilation 단계 (`[plugin sd-angular-compiler]`), adtek 프로젝트 client-admin 패키지
- **재현 절차:** `pnpm dev -t client-admin` 실행 시 증분 빌드마다 반복 발생

## 근본 원인

TypeScript 5.9.3의 알려진 컴파일러 버그 (GitHub #55217, #61524).

`relateVariances` 함수에서 `reportErrors=false`일 때 `Ternary.False`를 반환하지만, `reportErrors=true`로 재검사하면 다른 코드 경로를 타서 성공한다. 마지막 overload signature에 대한 에러 진단이 생성되지 않아 `Debug.assert`가 실패한다.

`SdTsCompiler`에서 `analyzeAsync()`, `getSemanticDiagnostics`, `getSemanticDiagnosticsOfNextAffectedFile` 호출 시 이 크래시가 발생할 수 있었으나, 기존 catch 블록들이 크래시를 **무시**하고 진단을 삼키는 방식이어서 에러 정보가 소실되거나, catch가 없는 `analyzeAsync()`에서는 "Angular compilation failed."로 뭉뚱그려 표시되었다.

## 해결 방안

- **방안:** 크래시 catch → 에러 진단 리턴 (기존 "무시" 패턴 → "보고" 패턴으로 변경)
- **설명:** 모든 TypeScript checker API 호출에 try-catch를 적용하되, 크래시 발생 시 해당 사실을 `ts.Diagnostic` 에러로 생성하여 정상 진단 경로로 리턴한다. 크래시가 발생해도 다른 파일의 컴파일은 계속 진행되며, 사용자에게는 어디서 크래시가 발생했는지 명확히 표시된다.
- **선택 사유:** 에러를 삼키지 않으면서도 프로세스 중단을 방지. TS 7.0에서 근본 수정이 나올 때까지의 방어.

### 수정 파일

- `packages/sd-cli/src/ts-compiler/SdTsCompiler.ts`
  - `compileAsync()`: `tsCrashDiagnostics` 배열 도입, `rawDiagnostics`에 합산
  - `analyzeAsync()` 호출 (line 216): try-catch 추가, 크래시 진단 생성
  - `_collectDiagnosticsForAngular` → `getSemanticDiagnostics`: 크래시 시 에러 진단 리턴 (기존: 빈 배열)
  - `_collectDiagnosticsForTsc`: `getSemanticDiagnostics` try-catch 추가
  - `_findAffectedFilesForAngular`: 반환 타입에 `crashDiagnostics` 추가, 크래시 시 에러 진단 리턴
  - `_findAffectedFilesForTsc`: 반환 타입 변경, try-catch 추가, 크래시 시 에러 진단 리턴
  - `_emitAngular`: `crashDiagnostics` 파라미터 추가, `builderProgram.emit` 크래시 시 경고 진단 리턴
