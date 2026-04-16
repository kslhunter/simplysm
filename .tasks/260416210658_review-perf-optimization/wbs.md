# WBS: sd-cli 성능 극한 최적화

## 프로젝트 개요

- **배경:** sd-cli 코드 리뷰에서 성능 병목 8건이 식별됨. dev/watch 모드의 빌드 사이클, Angular SCSS 파이프라인, esbuild 후처리, publish/replace-deps CLI 유틸리티에서 불필요한 I/O·순회·재컴파일이 발생함.
- **환경:** pnpm 모노레포, TypeScript ESM, Node.js 20, Angular 21, esbuild
- **전제조건:** 동작(observable behavior)에 변화가 없어야 함. API 시그니처 변경은 허용하되, 최종 산출물(빌드 결과, 파일 출력, 컴파일 결과 등)은 동일해야 함. API 변경에 따른 테스트 수정은 허용.
- **기술적 제약:** Chrome 61+ 브라우저 호환성 (sd-cli 자체는 Node.js 전용이므로 이 제약은 빌드 산출물에만 해당)
- **참조 자료:**
  - `.tasks/260416210658_review-perf-optimization/review.md` — 성능 리뷰 원문 (8개 이슈 상세)
  - `packages/sd-cli/CLAUDE.md` — sd-cli 아키텍처 개요

## Impact Mapping

- **Goal:** sd-cli dev/watch 리빌드 지연을 50~200ms 단축하고, Angular SCSS 증분 컴파일로 불필요한 재컴파일을 90% 제거한다
  - **Actor:** Simplysm 모노레포 개발자
    - **Impact:** 빌드 피드백 루프가 짧아져 코드 저장 후 결과 확인까지의 대기 시간이 줄어든다
      - **Deliverable:** client.worker mtime 증분 추적, Angular SCSS 역방향 인덱스 + 증분 컴파일, PostCSS 문자열 교체 청크화
    - **Impact:** publish/replace-deps 실행 시간이 단축되어 배포 워크플로가 빨라진다
      - **Deliverable:** version-upgrade I/O 병렬화, replace-deps 탐색 인덱싱

## Feature Breakdown

### Epic 1. watch/dev 빌드 사이클 최적화

#### [x] Feature 1.1 client.worker mtime 증분 추적

**의존성:** 없음

**범위:**

- `createSourceFileCachePlugin`의 `onEnd` 핸들러에서 `prevMtimes.clear()` 후 전체 순회하는 패턴을 증분 방식으로 전환
- `onStart` 핸들러에서 변경 감지된 파일의 mtime만 갱신하고, 신규 파일(prevMtimes에 없는 파일)만 stat 호출
- `onEnd` 핸들러에서는 `onStart`에서 감지된 변경 파일 + 새로 추가된 watchTargets만 mtime 갱신

**경계:**

- esbuild의 sourceFileCache 무효화 로직 자체는 변경하지 않음 (invalidate 호출 방식은 유지)
- `onStart`/`onEnd` 이외의 빌드 파이프라인은 변경하지 않음

**근거:**

- PERF-001 [Critical]: `packages/sd-cli/src/workers/client.worker.ts:199-248`
- 리뷰 원문: "대규모 프로젝트(1000~2000+ 파일)에서 매 빌드 완료 시 동기 I/O가 수천 회 발생"

**설계 결정:**

- 비동기 stat 병렬화 대신 증분 방식 채택 (esbuild onEnd는 void 반환이므로 비동기 불가)
- `lastChangedFiles` 클로저 변수로 onStart→onEnd 간 변경 파일 목록 공유
- 삭제된 파일 정리: currentWatchTargets Set 차집합으로 처리
- Feature 문서: `1.1-client-worker-mtime-incremental-tracking.md`

#### [x] Feature 1.2 Angular SCSS 빌드 파이프라인 최적화

**의존성:** 없음
**Feature 문서:** [1.2-angular-scss-pipeline-optimization.md](./1.2-angular-scss-pipeline-optimization.md)

**범위:**

- **역방향 SCSS 의존성 인덱스:** `combinedScssDeps` 갱신 시점(`updateCombinedScssDeps`)에서 `Map<의존성경로, Set<소유파일>>` 역방향 인덱스를 동시 구축하여, `library-build.worker.ts` onChange에서 O(1) 조회로 전환. `compileSideEffectScss` 호출 후 side-effect deps 반영을 위해 `rebuildReverseScssDeps()` 재호출.
- **side-effect SCSS 증분 컴파일:** `compileSideEffectScss` 함수에 `changedScssFiles`와 `sideEffectScssDeps` 인자를 추가하여, 변경된 SCSS 파일 또는 그 의존성이 변경된 항목만 재컴파일. `buildWatchEvent` 시그니처를 `hasScssChanges: boolean` → `changedScssFiles: ReadonlySet<string>`로 변경.
- **emit 레지스트리 역방향 인덱스:** `SideEffectScssOptions`에 `registryReverseIndex` 필드를 추가하여, `writeEmitResults` 내부에서 삭제/등록 시 O(1) 동기화. [설계 결정 D1]

**설계 결정:**

- writeEmitResults 레지스트리 역방향 인덱스는 `SideEffectScssOptions`에 `registryReverseIndex` 필드로 외부 전달, writeEmitResults 내부에서 삭제/등록 시 동기화
- 세부기능 6개를 SPIDR 분리 없이 3개 Slice로 구현 (역방향 인덱스 공유 이점)

**경계:**

- `compileScssFile`/`compileScssString` 함수 자체의 성능은 이 Feature에서 다루지 않음 (sass 컴파일러 내부)
- `compileGlobalScss` 함수는 단일 파일이므로 최적화 대상 아님
- client(Vite) 빌드의 SCSS 처리는 이 Feature에서 다루지 않음 (별도 경로)

**근거:**

- PERF-002 [Medium]: `packages/sd-cli/src/workers/library-build.worker.ts:269-276`
- PERF-003 [Medium]: `packages/sd-cli/src/angular/ngtsc-build-core.ts:96-114`
- PERF-004 [Medium]: `packages/sd-cli/src/angular/ngtsc-build-core.ts:178-184`
- 리뷰 원문: "side-effect SCSS 50개 중 1개만 변경되어도 50개 전체를 재컴파일하는 것은 심각한 낭비"

### Epic 2. esbuild 후처리 최적화

#### [x] Feature 2.1 PostCSS 문자열 교체 청크화

**의존성:** 없음

**범위:**

- `esbuild-postcss-plugin.ts`의 JS 파일 styles 교체 로직을 역순 slice 반복에서 청크 배열 + join 방식으로 전환
- 정방향으로 순회하며 원본 텍스트 구간과 PostCSS 처리된 교체 텍스트를 청크 배열에 수집한 뒤 `join('')`으로 결합

**경계:**

- CSS 파일 처리 로직(라인 25-42)은 변경하지 않음 (단일 파일 전체 처리이므로 해당 없음)
- PostCSS processor 자체의 성능은 이 Feature에서 다루지 않음

**근거:**

- PERF-005 [Medium]: `packages/sd-cli/src/esbuild/esbuild-postcss-plugin.ts:92-100`
- 리뷰 원문: "교체 1회당 전체 문자열이 메모리에 복사... O(replacements × fileSize)"

### Epic 3. CLI 유틸리티 I/O 최적화

#### [x] Feature 3.1 replace-deps 탐색/watch 인덱싱

**의존성:** 없음

**범위:**

- `resolveAllReplaceDepEntries`에서 `entries.some()` 배열 선형 검색을 `Set<string>` O(1) 중복 검사로 전환
- 동일 함수에서 replaceDeps 패턴별 순차 glob 호출을 `Promise.all` 병렬화
- `watchReplaceDeps`의 onChange 핸들러에서 전체 entries 순회 대신, watcher 생성 시점에 해당 `resolvedSourcePath`에 해당하는 entries를 사전 필터링하여 클로저에 캡처

**경계:**

- `setupReplaceDeps`의 복사 로직(copyWithUnlink)은 변경하지 않음
- `resolveReplaceDepEntries`의 정규식 매칭 로직은 변경하지 않음

**근거:**

- PERF-007 [Low]: `packages/sd-cli/src/deps/replace-deps/replace-deps-resolve.ts:203`
- PERF-008 [Low]: `packages/sd-cli/src/deps/replace-deps/replace-deps.ts:258-276`

#### [x] Feature 3.2 publish 버전 업그레이드 I/O 병렬화

**의존성:** 없음

**범위:**

- `upgradeVersion`에서 패키지별 package.json 순차 읽기/쓰기를 `Promise.all` 병렬화
- `upgradeVersion`에서 템플릿 파일 순차 읽기/쓰기를 `Promise.all` 병렬화
- `computePublishLevels`에서 패키지별 package.json 순차 읽기를 `Promise.all` 병렬화

**경계:**

- 프로젝트 루트 package.json 버전 업그레이드는 순차 유지 (changedFiles 배열 첫 항목 보장)
- 위상 정렬 로직은 변경하지 않음

**근거:**

- PERF-006 [Low]: `packages/sd-cli/src/commands/publish/version-upgrade.ts:50-56, 86-102`
- 리뷰 원문: "패키지 30개면 60회(읽기+쓰기)의 순차 I/O... 각 패키지가 서로 독립적이므로 병렬화가 가능"

## 제외 사항

- sass 컴파일러(dart-sass) 내부 성능 최적화 — sd-cli 범위 밖 (외부 의존성)
- esbuild 자체의 빌드 속도 — sd-cli 범위 밖 (외부 의존성)
- FsWatcher의 내부 구현 최적화 — core-node 패키지 범위
- PostCSS processor 자체의 처리 속도 — 외부 의존성
