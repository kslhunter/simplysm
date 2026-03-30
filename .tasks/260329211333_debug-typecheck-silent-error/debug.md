# 디버그: typecheck 에러 카운트만 출력되고 상세 내용이 표시되지 않음

## 출처

- **origin:** `direct`

## 에러 증상

- **에러 메시지:** `ERROR 타입체크 에러 발생 { errorCount: 1, warningCount: 0 }` — 에러 1개가 보고되지만 어떤 파일의 어떤 에러인지 상세 내용이 출력되지 않음
- **위치:** `packages/sd-cli/src/commands/typecheck.ts:226-228`
- **재현:** `pnpm check --type typecheck` 실행 시, 엔진 내부 예외가 발생하는 패키지가 있을 때

## 근본 원인 추적 (ACH)

### ACH 매트릭스

|    | E1: 엔진 모두 "완료" 출력 | E2: errorCount=1 | E3: 상세 출력 없음 | E4: "엔진 작업 실패" 메시지 없음 |
|----|----------------------|-----------------|-----------------|--------------------------|
| H1: 엔진 내부 예외 catch → dts.errors 카운트만 증가 | C (내부 catch로 정상 반환) | C (dts.errors.length) | C (allDiagnostics 비어있음) | C (engine.run() 정상 resolve) |
| H2: 비패키지 타입체크 에러 유실 | N | C | I → 폐기 (errorCount와 diagnostics가 동일 소스에서 파생) | N |

### 결과: 확정 — H1

엔진의 내부 try-catch(`tsc-build.ts:197`, `ngtsc-build-core.ts:393`, `server-build.worker.ts:418`)가 예외를 잡아 `dts: { success: false, errors: [message], diagnostics: [] }`를 반환한다. `typecheck.ts:226-228`에서 `dts.errors.length`로 에러 카운트를 증가시키지만, 이 문자열 에러는 `allDiagnostics`에 추가되지 않아 `formattedOutput`이 빈 문자열로 남는다. `check.ts:81`에서 빈 문자열은 falsy이므로 상세 내용이 출력되지 않는다.

## 해결 방안

### 방안 A: dts.errors를 formattedOutput에 직접 추가

- **설명:** 엔진 결과 집계 시 미포매팅 에러를 수집해두었다가, 진단 포매팅 후 formattedOutput에 추가
- **장점:** 최소 변경
- **반론:** 두 가지 출력 형식(ts.formatDiagnostics 포맷과 plain string)이 혼재
- **점수:** 안정성 9 / 일관성 6 / 근본성 7 → **평균 7.3/10**

### 방안 B: dts.errors를 합성 ts.Diagnostic으로 변환

- **설명:** 에러 문자열을 ts.Diagnostic 객체로 변환하여 allDiagnostics에 추가, 기존 파이프라인에 통합

```typescript
if (!engineResult.dts.success && dtsDiags.length === 0) {
  for (const errMsg of engineResult.dts.errors) {
    allDiagnostics.push({
      category: 1,
      code: 0,
      messageText: errMsg,
      file: undefined,
      start: undefined,
      length: undefined,
    });
  }
  totalErrorCount += engineResult.dts.errors.length || 1;
}
```

- **장점:** 단일 출력 파이프라인 유지, 일관된 포맷
- **반론:** code: 0, file: undefined인 합성 Diagnostic이므로 출력이 다소 어색할 수 있음
- **점수:** 안정성 8 / 일관성 9 / 근본성 8 → **평균 8.3/10**

### 방안 C: 수행 안 함

- **장점:** 코드 변경 없음
- **반론:** 매번 --debug를 붙여야 에러 내용을 확인 가능
- **점수:** 안정성 10 / 일관성 3 / 근본성 2 → **평균 5.0/10**

## 선택 결과

**방안 B** (평균 8.3/10)

dts.errors를 합성 ts.Diagnostic으로 변환하여 기존 진단 파이프라인에 통합. 일관된 출력 형식을 유지하면서 에러 정보 누락을 방지한다.
