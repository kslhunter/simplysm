# sd-review: test directory targets 지원

## 요약

| 항목 | 값 |
|------|-----|
| 분석 대상 | `packages/sd-cli/src/commands/check.ts`, `typecheck.ts`, `utils/package-utils.ts` |
| 분석 일시 | 2026-03-27 23:20 |
| 대상 파일 수 | 3 |
| 발견 이슈 | 1건 (Low 1) |

## 이슈 목록

### Low

```
id: LOGIC-001
severity: Low
category: 로직
location: packages/sd-cli/src/commands/typecheck.ts:188
title: ts.findConfigFile이 상위 디렉토리로 올라가 root tsconfig를 찾을 수 있음
description: |
  ts.findConfigFile(testDir, ts.sys.fileExists, "tsconfig.json")은 testDir부터 시작해
  상위 디렉토리로 올라가며 tsconfig.json을 탐색한다. 만약 test 디렉토리에 tsconfig.json이
  없으면, root tsconfig.json을 찾아 사용하게 되어 의도와 다른 파일 목록으로 typecheck이 실행된다.
  현재 tests/orm, tests/service 모두 자체 tsconfig.json이 있으므로 실제 문제는 발생하지 않지만,
  향후 tsconfig.json 없는 test 디렉토리가 추가되면 잘못된 동작이 발생할 수 있다.
suggestion: |
  찾은 configPath가 testDir 내부에 있는지 검증하거나,
  path.join(testDir, "tsconfig.json")을 직접 확인하여 없으면 skip하는 방식으로 변경.
```
