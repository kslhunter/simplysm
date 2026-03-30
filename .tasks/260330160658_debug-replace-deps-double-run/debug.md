# 디버그: sd-cli replace-deps 명령이 2번 실행됨

## 출처

- **origin:** `direct`

## 에러 증상

- **에러 메시지:** 에러 없음. `replace-deps` 설정 + postinstall 전체 프로세스가 2회 반복 실행됨
- **위치:** `packages/sd-cli/src/sd-cli.ts:29-55`
- **재현:** `sd-cli replace-deps` 실행 시 항상 발생

## 근본 원인 추적 (ACH)

### ACH 매트릭스

|    | 증거1: 로그 1.5초 간격 2회 실행 | 증거2: sd-cli.ts Phase1이 커맨드 무관하게 실행 | 증거3: commands/replace-deps.ts가 setupReplaceDeps 호출 |
|----|-------------------------------|---------------------------------------------|------------------------------------------------------|
| H1: Phase1 무조건 실행 + Phase2 커맨드 중복 | C | C | C |
| H2: sd-cli-entry 초기화에서 별도 호출 | I → 폐기 | N | N |

### 결과: 확정 — H1

`sd-cli.ts` 프로덕션 모드에서:
1. Phase 1 (라인 29-39): 커맨드 종류와 무관하게 `setupReplaceDeps` 실행 → 1회째
2. Phase 2 (라인 41-55): `sd-cli-entry.js replace-deps`를 spawn → `runReplaceDeps` → `setupReplaceDeps` 실행 → 2회째

## 해결 방안

### 방안 A: Phase 1에서 replace-deps 커맨드일 때 skip

- **설명:** `sd-cli.ts` Phase 1에 커맨드명 체크 조건 추가
  ```ts
  const command = process.argv[2];
  if (command !== "replace-deps" && sdConfig.replaceDeps != null) {
    await setupReplaceDeps(process.cwd(), sdConfig.replaceDeps);
  }
  ```
- **장점:** 변경 최소, Phase 2의 replace-deps 커맨드가 정상 담당
- **반론:** Phase 1에서 커맨드 문자열을 직접 비교하는 패턴 추가. 향후 alias나 커맨드명 변경 시 동기화 필요
- **점수:** 안정성 9/10, 정확성 9/10, 유지보수성 7/10 → **평균 8.3/10**

### 수행 안 함

- **장점:** 코드 변경 없음
- **반론:** 불필요한 중복 작업 발생. 성능 낭비 + 혼란스러운 로그
- **점수:** 안정성 10/10, 정확성 5/10, 유지보수성 8/10 → **평균 7.7/10**

## 선택 결과

**방안 A** (평균 8.3/10)

Phase 1에서 `replace-deps` 커맨드일 때 `setupReplaceDeps` 호출을 skip하여 중복 실행 제거
