# WBS

## Impact Mapping

- **Goal:** Windows 경로 구분자 불일치로 인한 런타임 버그(watch 리빌드 스킵 등) 근본 제거
  - **Actor:** Windows에서 sd-cli를 사용하는 개발자
    - **Impact:** 경로 비교/매칭이 OS에 관계없이 일관되게 동작한다
      - **Deliverable:** `posix()` + `posixResolve()` + `PosixPath`로 경로 처리 통일

## Feature Breakdown

> 각 Feature의 범위 힌트(`-` 불릿)는 대표 예시이며 전체 목록이 아니다. 정식 분해는 `/sd-dev-spec`에서 수행한다.

### Epic 1. core-node 경로 유틸리티 기반

- [x] Feature 1.1 PosixPath 타입 및 posixResolve 함수 도입
  - `PosixPath` 브랜드 타입 정의
  - `posix()` 반환 타입을 `PosixPath`로 변경
  - `posixResolve()` 함수 추가
  - `norm()`, `NormPath` 삭제
  - `isChildPath` 등 내부 유틸리티 마이그레이션

- [x] Feature 1.2 FsWatcher 경로 타입 마이그레이션
  - `FsWatcherChangeInfo.path` 타입을 `PosixPath`로 변경
  - FsWatcher 내부 경로 정규화를 `posix()`로 통일

### Epic 2. sd-cli 빌드 유틸리티

- [x] Feature 2.1 TypeScript 빌드 유틸리티 마이그레이션
  - tsc-build, tsconfig, diagnostic-utils, typecheck 관련 유틸리티
  - TypeScript compiler 경로(`sf.fileName`) 정규화 통일

- [x] Feature 2.2 Angular/ngtsc 빌드 유틸리티 마이그레이션
  - ngtsc-build-core, angular-compiler, vite-angular-plugin
  - SCSS 경로 처리 포함

- [x] Feature 2.3 esbuild/Vite 설정 유틸리티 마이그레이션
  - esbuild-config, vite-config, vite 플러그인
  - output-path-rewriter

### Epic 3. sd-cli 빌드 워커

- [x] Feature 3.1 library/server 빌드 워커 마이그레이션
  - library-build.worker (watch 리빌드 경로 비교 포함 — 원래 버그 수정 지점)
  - server-build.worker

- [x] Feature 3.2 ngtsc/client 빌드 워커 마이그레이션
  - ngtsc-build.worker (ad-hoc replace 4건)
  - client.worker (변경 불필요 — ad-hoc replace 0건, Vite 위임 구조)

### Epic 4. sd-cli 오케스트레이터 및 명령어

- [x] Feature 4.1 오케스트레이터/명령어 마이그레이션
  - DevWatchOrchestrator, BuildOrchestrator
  - publish, lint, typecheck 명령어

- [x] Feature 4.2 파일 복사/배포 유틸리티 마이그레이션
  - copy-src, copy-public, replace-deps
  - sd-config, package-utils, build-env

### Epic 5. sd-cli 네이티브 앱 빌드

- [x] Feature 5.1 Capacitor/Electron 빌드 마이그레이션
  - capacitor.ts, electron.ts
  - 네이티브 앱 경로 처리 (Java 경로 이스케이프 등 주의)

### Epic 6. 기타 패키지

- [x] Feature 6.1 service-server 및 기타 패키지 마이그레이션
  - service-server의 `posix()` 사용처 갱신
  - 기타 패키지 확인 및 마이그레이션

## 참조 자료

### 현재 경로 유틸리티 구현

- `pathx.norm(...paths)` — `path.resolve(...paths) as NormPath`. 절대 경로 + 플랫폼 구분자
- `pathx.posix(...args)` — `path.join(...args).replace(/\\/g, "/")`. POSIX 슬래시 + 상대 경로 유지
- `NormPath` — 브랜드 타입 `string & { [NORM]: never }`

### 변경 방향

- `posix(p)` — `p.replace(/\\/g, "/") as PosixPath`. 슬래시 변환만
- `posixResolve(...args)` — `path.resolve(...args).replace(/\\/g, "/") as PosixPath`. 절대 경로 + 슬래시 변환
- `PosixPath` — 브랜드 타입 `string & { [POSIX]: never }`
- `norm()`, `NormPath` — 삭제

### 원래 버그

- `library-build.worker.ts`에서 `lastSourceFilePaths`(POSIX)와 FsWatcher `c.path`(Windows) 비교 실패 → 리빌드 스킵

### Ad-hoc 정규화 패턴

sd-cli 전역에 24건의 `.replace(/\\/g, "/")` 산재. `posix()` 또는 `posixResolve()`로 통합 대상.

### 주의 사항

- `capacitor.ts`의 Java 경로 이스케이프(`\\` → `\\\\`)는 POSIX 변환 대상이 아님
- `vite-postcss-inline-plugin.ts`의 CSS 텍스트 내 이스케이프도 경로 변환이 아님
- Node.js `fs` API는 POSIX 경로(`D:/foo/bar`)를 정상 처리함

### 참조 파일

- `packages/core-node/src/utils/path.ts` — `norm()`, `posix()`, `NormPath`, `isChildPath` 정의. 변경 기반
- `packages/core-node/src/features/fs-watcher.ts` — `FsWatcherChangeInfo.path`가 `NormPath` 사용. API 변경 필요
- `packages/sd-cli/src/workers/library-build.worker.ts:189-197` — 원래 버그 지점. `lastSourceFilePaths` vs `c.path` 비교
- `packages/core-node/tests/utils/path.spec.ts` — `norm()` 테스트 12건. `posixResolve()` 테스트로 교체 필요

## 제외 사항

- sd-cli 이외 패키지의 `path.resolve/join` 전수 마이그레이션 (core-node, orm-node, storage 등의 내부 로직은 파일시스템 API 직접 사용이므로 POSIX 통일 불필요)
- `posix()` 현재 구현의 `path.join` 동작 제거 — 기존 `posix("a", "b")` 호출은 `posix(path.join("a", "b"))`로 교체 필요하며, `posix()`는 단일 인자만 받도록 변경
