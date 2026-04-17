# 코드 리뷰: tests-isolation

## 리뷰 대상

`.tasks/260415125039_sd-cli-tests-isolation/` — sd-cli의 tests/ 폴더 포함/제외 로직 정비 (Feature 1.1, 1.2, 1.3)

## 검증 결과 요약

- **소스 변경 7곳**: 모두 명세와 일치 (Feature 1.1: 1곳, Feature 1.2: 6곳)
- **테스트 변경/추가**: 모두 명세와 일치 (단위 2건, 인수 3건, orchestrator assertion 9건)
- **테스트 실행**: 전체 통과 (97/97 — collect-deps 5건 + orchestrator 92건)
- **로직 버그**: 없음
- **성능 이슈**: 없음

## CONSIST-001 [Low] `buildWorkspacePkgMap` JSDoc이 실제 구현과 불일치

- **위치:** `packages/sd-cli/src/deps/replace-deps/collect-deps.ts:15,39`

JSDoc(line 15)과 인라인 주석(line 39)에서 "pnpm-workspace.yaml 기반으로"라고 기술하지만, 실제 구현은 `discoverWorkspacePackages()` (`package-utils.ts:30-49`)를 호출하여 `packages/`와 `tests/` 디렉토리를 직접 스캔한다. pnpm-workspace.yaml을 읽는 로직은 존재하지 않는다.

이 주석은 이번 태스크의 변경 범위가 아니지만(line 22의 필터 1줄 추가만 해당), 코드를 읽는 개발자가 실제 탐색 메커니즘을 오해할 수 있다.

**개선 방향:** JSDoc과 인라인 주석을 "워크스페이스 디렉토리(packages/, tests/) 스캔 기반으로"로 수정

---

## 이슈 없음 확인 사항

### Feature 1.1 — collectDeps에서 tests/ 패키지 제외

`collect-deps.ts:22`의 `if (relDir.startsWith("tests/")) continue;` 필터가 정확히 명세대로 구현되었다. `mergeTestsPackagesIntoConfig` (`package-utils.ts:85`)의 동일 패턴과 일관성 있다.

인수 테스트(`collect-deps.acc.spec.ts`)가 3개 시나리오를 모두 커버한다:
- packages/ 패키지 포함 확인
- tests/ 패키지 제외 확인
- 혼합 의존성에서 tests/ 무시 확인

### Feature 1.2 — non-check 경로에서 includeTests: false 명시화

6곳 모두 명세의 파일/라인과 정확히 일치한다:
- `BuildOrchestrator.ts:319,352,388`
- `WatchOrchestrator.ts:130`
- `DevOrchestrator.ts:133,140`

테스트 assertion 8곳 + TypecheckOrchestrator의 `includeTests: true` 검증 1곳(line 126), 총 9곳이 모두 올바르게 업데이트되었다.

### Feature 1.3 — 테스트 검증 보강

WBS에서 명시한 5개 영역의 테스트가 모두 구현되었다:
- collectDeps 테스트 (5건)
- BuildOrchestrator 테스트 (3건 assertion)
- WatchOrchestrator 테스트 (3건 assertion)
- DevOrchestrator 테스트 (2건 assertion)
- TypecheckOrchestrator 테스트 (1건 assertion)
