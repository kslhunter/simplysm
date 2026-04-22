# 디버그: SdTsCompiler 에러 처리 고도화

## 출처

- **origin:** `direct` — 사용자 직접 입력 (adtek 프로젝트 `pnpm check` 시 TS 컴파일러 크래시 에러 메시지가 원인 파일을 알려주지 않는 문제)

## 문제 증상

- **유형:** 에러
- **증상:** `error TS0: TsCompiler 내부 크래시 @findAffectedFiles` — 에러 메시지에 사용자 코드의 어느 파일에서 크래시가 발생했는지 정보가 없어 디버깅 불가
- **위치:** `packages/sd-cli/src/ts-compiler/SdTsCompiler.ts` — `compileAsync()` 에러 처리 전반
- **재현 절차:** adtek 프로젝트에서 `pnpm check` 실행 → TS 5.9.3 컴파일러 내부 크래시 발생 → 에러 메시지에 원인 파일 정보 없음

## 근본 원인

`SdTsCompiler.compileAsync()`의 에러 처리 구조가 허술함:

1. **파일 추적 공백**: 파일 단위 루프 5곳 중 `_findAffectedFilesForTsc`, `_findAffectedFilesForAngular`, `_collectDiagnosticsForTsc`에서 현재 처리 중인 파일을 추적하지 않음
2. **크래시 시 전체 포기**: 5개 단계를 단일 try-catch로 감싸서, 한 단계 크래시 시 독립적으로 실행 가능한 후속 단계까지 전부 스킵
3. **per-file 프로브 한계**: 사후 프로브가 증분 경로 크래시를 재현하지 못할 수 있음 (코드 경로 차이)
4. **SdError 미활용**: 에러 cause chain 없이 평문 문자열 조립

## 해결 방안

- **방안:** 단계별 try-catch + 파일 추적 일원화 + SdError 활용 + per-file 프로브 제거
- **설명:**
  - A. 각 단계(analyzeAsync, findAffectedFiles, emit, collectDiagnostics, lintAndGlobalScss)를 개별 try-catch로 감싸서 한 단계 크래시 시에도 다음 단계 계속 진행
  - B. 파일 단위 루프가 있는 모든 곳에서 `_setCrashContext`로 현재 파일 추적 (`_findAffectedFiles*`에서는 `ignoreSourceFile` 콜백 활용)
  - C. 크래시 시 `SdError(원본에러, "단계명", "파일명")`로 감싸서 cause chain 보존
  - D. 단계별 try-catch + 파일 추적으로 per-file 프로브(`_probeCrashPerFileAngular`, `_probeCrashPerFileTsc`)가 불필요해지므로 제거
  - E. 바깥 try-catch는 최종 안전망으로 유지
- **선택 사유:** 에러 메시지에 원인 파일이 포함되어야 디버깅 가능. 부분 복구로 가용 정보 극대화.
