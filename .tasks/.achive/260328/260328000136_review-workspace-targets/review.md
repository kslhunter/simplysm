# sd-review: workspace 기반 check 타겟 지원

## 요약

| 항목 | 값 |
|------|-----|
| 분석 대상 | `check.ts`, `typecheck.ts`, `package-utils.ts` |
| 분석 일시 | 2026-03-28 00:01 |
| 대상 파일 수 | 3 |
| 발견 이슈 | 1건 (Medium 1) |

## 이슈 목록

### Medium

```
id: LOGIC-001
severity: Medium
category: 로직
location: packages/sd-cli/src/utils/package-utils.ts:34
title: workspace 패키지명 충돌 시 무경고 덮어쓰기
description: |
  discoverWorkspacePackages에서 packages/와 tests/ 하위를 순회하며 Map.set(entry.name, ...)을
  호출한다. 만약 packages/orm과 tests/orm이 동시에 존재하면, Map에서 나중에 set된 값("tests/orm")이
  먼저 set된 값("packages/orm")을 에러 없이 덮어쓴다. 결과적으로 "orm" 타겟이 잘못된 경로로
  매핑되어 의도하지 않은 디렉토리가 typecheck/lint/test 대상이 된다.
  현재 프로젝트에서는 패키지명과 테스트 디렉토리명이 겹치지 않아 발생하지 않는다.
suggestion: |
  Map.set 전에 이미 존재하는 키인지 확인하고, 충돌 시 SdError를 throw하여 조기에 알림.
```
