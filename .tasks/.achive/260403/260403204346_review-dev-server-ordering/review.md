# 코드 리뷰: Feature 1.1 dev 모드 서버 시작 순서 보장

| 항목 | ��용 |
|------|------|
| 분석 대상 | `.tasks/260403202740_fix-dev-server-ordering/1.1-dev-server-start-ordering.md` 구현 |
| 일시 | 2026-04-03 |
| 대상 파일 | 1개 (`packages/sd-cli/src/orchestrators/DevWatchOrchestrator.ts`) |
| 발견 이슈 | 1건 (Medium: 1) |

## 구현 평가 요약

핵심 목표(초기 빌드 시 모든 엔진 완료 ��� 서버 시작, URL 출력 단일 경로화, watch 기존 동작 유지)는 정확히 달성되었다:

- `batchComplete` 핸들러를 `_startDevMode()` 끝으로 이동하여 초기 빌드 중 조기 서버 시작을 방지
- `_restartServers()`에서 `_schedulePrintServers()` 제거, `serverReady` 이벤트 단일 경로로 URL 출력 통일
- `_startDevMode()` 끝에서 독립 클라이언트 URL 출력 처리
- 테스트가 새 동작에 맞게 업데��트됨

## 이슈 목록

### LOGIC-001

```
id: LOGIC-001
severity: Medium
category: 로직
location: packages/sd-cli/src/orchestrators/DevWatchOrchestrator.ts:418
title: 초기 빌드 시 printErrors() 중복 호출
description: |
  _startDevMode()에서 printErrors()를 호출(라인 418)한 직후
  await this._restartServers()를 호출하는데, _restartServers() 내부(라인 482)에서도
  printErrors()를 호출한다. printErrors()는 ResultCollector의 동일한 Map 참조를
  순회하므로, 빌드 에���가 존재하면 같은 에러가 콘솔에 2회 출력된다.

  watch 리빌드 경로��서는 _onDevBatchComplete() → _restartServers()로 1회만 출���되어
  초기 빌드와 watch 리빌드 간 에러 출력 횟수가 불일치한다.

  재현 조건: 서버/클라이언트 빌드에서 에러가 발생하는 초기 빌드
suggestion: |
  _restartServers()에서 printErrors() 호출을 제거하고, 각 호출 경로에서 명시적으로 처리:
  - _startDevMode(): printErrors() → _restartServers() → printErrors() (기존 라인 418 유지)
  - _onDevBatchComplete(): _restartServers() 후 printErrors() 추가
  또는 _startDevMode()의 라인 418 printErrors()를 제거하여
  _restartServers() 내부의 단일 호출에 위임.
```
