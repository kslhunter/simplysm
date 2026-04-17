# WBS: replace-deps 복사 필터를 files 필드 기반 화이트리스트로 전환

## 프로젝트 개요

- **배경:** replace-deps의 현재 복사 로직은 블랙리스트 방식(EXCLUDED_NAMES: node_modules, package.json, .cache, tests)으로, CLAUDE.md, tsconfig.json 등 불필요한 파일도 node_modules에 복사됨
- **환경:** sd-cli 패키지 (`packages/sd-cli/src/deps/replace-deps/replace-deps.ts`)
- **전제조건:** 모든 패키지의 package.json에 files 필드가 존재함 (전수 확인 완료)
- **기술적 제약:** glob 패턴 미지원 (단순 디렉토리/파일명 매칭만). 현재 모든 패키지가 단순 디렉토리명만 사용 중
- **참조 자료:**
  - `packages/sd-cli/src/deps/replace-deps/replace-deps.ts` — 현재 복사 필터 로직 (setupReplaceDeps, watchReplaceDeps)
  - `packages/sd-cli/src/deps/replace-deps/replace-deps-resolve.ts` — 교체 대상 해석 로직
  - `packages/sd-cli/tests/utils/replace-deps.spec.ts` — 기존 테스트

## Impact Mapping

- **Goal:** node_modules의 교체된 패키지 내용을 실제 npm 배포 상태와 일치시킨다
  - **Actor:** sd-cli 사용 개발자
    - **Impact:** 개발 환경이 프로덕션 환경과 일관되어 환경 차이로 인한 문제를 사전 방지한다
      - **Deliverable:** replace-deps 복사 필터를 files 필드 기반 화이트리스트로 전환

## Feature Breakdown

### Epic 1. replace-deps 복사 필터 개선

#### [x] Feature 1.1 files 필드 기반 화이트리스트 복사

**의존성:** 없음

**범위:**

- 소스 패키지의 package.json에서 `files` 필드를 읽어 복사 대상 화이트리스트 구성
- npm 기본 포함 파일(README*, LICENSE*, CHANGELOG*) 패턴 매칭 포함
- `package.json` 자체는 복사 제외 유지 (대상 node_modules의 기존 package.json 보존)
- `setupReplaceDeps`의 `fsx.copy` 호출에 화이트리스트 필터 적용
- `watchReplaceDeps`의 복사 필터에 동일한 화이트리스트 적용
- `watchReplaceDeps`의 감시 대상을 files 항목 경로로 제한 (불필요한 파일 변경에 반응하지 않음)
- 단순 디렉토리/파일명 매칭 (glob 패턴 미지원)

**경계:**

- npm의 full glob 패턴(`**/*.js` 등) 지원은 이 Feature에서 다루지 않음
- `fsx.copy` 함수 자체의 동작 변경 없음 (필터 함수만 교체)
- `replace-deps-resolve.ts`의 패턴 해석 로직은 변경하지 않음

**근거:**

- 사용자 제안: "files를 보고 files에 있는거 및 npm 배포에 기본적으로 배포되는 파일들 기준으로 복사"
- 사용자 선택: npm 기본 파일도 포함, 단순 매칭만, 복사할 파일만 감시
- 현재 코드: `replace-deps.ts:13` — `EXCLUDED_NAMES = new Set(["node_modules", "package.json", ".cache", "tests"])`
- 현재 불필요 복사 확인: core-common의 경우 CLAUDE.md, tsconfig.json이 복사됨
- 전체 패키지 files 필드 확인 결과: 모두 단순 디렉토리명 사용 (dist, src, scss, android, lib, scripts, claude, tests)

## 설계 결정 요약

| # | 결정사항 | 선택 | 근거 |
|---|---------|------|------|
| D1 | 복사 필터 방식 | 화이트리스트 (files 필드 기반) | 사용자 제안 |
| D2 | npm 기본 파일 포함 | 포함 (README*, LICENSE*, CHANGELOG*) | 사용자 선택 |
| D3 | glob 패턴 지원 | 단순 디렉토리/파일명 매칭만 | 현재 모든 패키지가 단순명 사용 |
| D4 | watch 감시 범위 | files 항목 경로만 감시 | 사용자 선택 |
| D5 | files 필드 미존재 시 | 경고 로그 후 건너뜀 | 사용자 선택 (replace-deps 대상은 항상 files 존재) |

## 제외 사항

- npm full glob 패턴 지원 — 사유: 현재 모든 패키지가 단순 디렉토리명만 사용하므로 불필요. 향후 필요시 확장 가능
