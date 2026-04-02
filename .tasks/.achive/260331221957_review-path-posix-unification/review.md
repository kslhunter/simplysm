# 코드 리뷰: path-posix-unification 최종 심층 리뷰

| 항목 | 내용 |
|------|------|
| 분석 대상 | `.tasks/260331174926_path-posix-unification` 태스크 변경 범위 전체 |
| 일시 | 2026-03-31 |
| 분석 파일 수 | 30+ (core-node, sd-cli, service-server, angular 관련 전체) |
| 발견 이슈 | 2건 (Low: 2) |

## 분석 요약

path-posix-unification 태스크의 핵심 목표는 `norm()`/`NormPath` 제거, `posix()`/`posixResolve()`/`PosixPath` 도입, ad-hoc `.replace(/\\/g, "/")` 패턴 제거였다.

### 정상 완료 확인 항목

- `PosixPath` 브랜드 타입, `posix()`, `posixResolve()` 정의 및 테스트 완비
- `NormPath`, `norm()` 코드베이스 전체에서 완전 제거
- `FsWatcherChangeInfo.path` 타입 `PosixPath`로 변경, 내부 정규화 `posix()` 적용
- `library-build.worker.ts` 원래 버그 지점 — `lastSourceFilePaths`(posix) vs `c.path`(PosixPath) 비교 정상 동작
- `server-build.worker.ts` — watch 경로 `pathx.posixResolve()` 사용, FsWatcher 비교 정상
- `AngularCompiler` — `AngularSourceFileCache.invalidate()`에서 `pathx.posix()` 정규화, 리소스 의존성 비교 양쪽 모두 정규화
- `capacitor.ts` — Java 경로 이스케이프(`\\` → `\\\\`) 보존 (올바르게 제외)
- `electron.ts` — `pathx.posixResolve()` 일관 사용
- `service-server/auto-update-service.ts` — `pathx.posix()` 정상 사용
- commands/, utils/ 전체 — `pathx.posix()` / `pathx.posixResolve()` 일관 사용
- SCSS 의존성 경로 — `extractDependencies()`가 `URL.pathname`에서 POSIX 형식 반환, 비교 정합성 확보

## 이슈 목록

### CONSIST-001

```
id: CONSIST-001
severity: Low
category: 일관성
location: packages/sd-cli/src/vitest-plugin.ts:123
title: 로컬 normalizePath() 함수가 pathx.posix()를 중복 구현
description: |
  vitest-plugin.ts에 `function normalizePath(p: string): string { return p.replace(/\\/g, "/"); }` 로컬 함수가 남아있다.
  이는 pathx.posix()와 동일한 동작이며, 이 태스크에서 제거 대상이었던 ad-hoc `.replace(/\\/g, "/")` 패턴이다.
  기능상 문제는 없지만, 다른 모든 파일이 pathx.posix()로 통일된 상태에서 이 파일만 로컬 함수를 사용하여 일관성이 깨진다.
suggestion: |
  normalizePath() 함수를 제거하고 pathx.posix()로 대체한다.
  vitest-plugin.ts는 현재 @simplysm/core-node를 import하지 않으므로, import 추가가 필요하다.
  단, 이 파일은 vitest 환경에서 실행되므로 core-node 의존성 추가가 적절한지 확인이 필요하다.
```

### CONSIST-002

```
id: CONSIST-002
severity: Low
category: 일관성
location: packages/sd-cli/src/workers/ngtsc-build.worker.ts:236-248
title: watch 경로 생성에 path.join() 사용 (다른 worker는 pathx.posixResolve())
description: |
  ngtsc-build.worker.ts의 watch 경로 생성(236~248행)이 path.join()을 사용한다.
  동일 역할의 library-build.worker.ts(173~178행)와 server-build.worker.ts(570~580행)는
  pathx.posixResolve()를 사용하여 일관성이 깨진다.

  FsWatcher 내부에서 chokidar에 전달하기 전 extractGlobBase()가 양쪽 구분자를 처리하고,
  glob 매칭도 posix()로 정규화하므로 기능상 문제는 없다.
  그러나 이 태스크의 목표가 "경로 처리 통일"인 점에서 의도와 어긋난다.
suggestion: |
  path.join() 호출을 pathx.posixResolve()로 교체하여 다른 worker와 동일한 패턴으로 통일한다.
```

## 결론

path-posix-unification 태스크는 **핵심 목표를 달성**했다. 원래 버그(library-build.worker.ts의 경로 비교 실패)가 해결되었고, `norm()`/`NormPath`가 완전 제거되었으며, 24건의 ad-hoc `.replace(/\\/g, "/")` 패턴이 거의 모두 `pathx.posix()`/`pathx.posixResolve()`로 대체되었다.

발견된 2건의 이슈는 모두 Low severity 일관성 문제로, 기능적 버그를 유발하지 않는다.
