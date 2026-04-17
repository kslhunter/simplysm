# WBS: sd-cli check 명령에서 test 타입 제거

## 프로젝트 개요

- **배경:** `sd-cli check --type test`의 `spawnVitest()`는 `pnpm vitest ...targets --run`의 단순 래퍼로, sd-cli가 부가가치를 제공하지 않음. 테스트는 `vitest run`을 직접 사용하는 것으로 충분함
- **환경:** simplysm 모노레포, `packages/sd-cli` 패키지
- **전제조건:** 없음
- **기술적 제약:** 없음
- **참조 자료:**
  - `packages/sd-cli/src/commands/check.ts` — 현재 check 명령 구현 (spawnVitest, CheckType, formatSection)
  - `packages/sd-cli/src/sd-cli-entry.ts:85-125` — check 명령 CLI 옵션 정의 (기본 types)
  - `packages/sd-cli/tests/commands/check.spec.ts` — check 명령 테스트

## Impact Mapping

- **Goal:** sd-cli check에서 불필요한 vitest 래퍼를 제거하여 CLI의 책임을 명확화
  - **Actor:** 개발자 (sd-cli 사용자)
    - **Impact:** 테스트 실행을 vitest에 직접 위임하여 불필요한 추상화 없이 사용
      - **Deliverable:** check 명령에서 test 타입 제거

## Feature Breakdown

### Epic 1. check 명령 test 타입 제거

#### [x] Feature 1.1 check 명령에서 test 타입 제거

**의존성:** 없음

**범위:**

- `CheckType`에서 `"test"` 제거
- `spawnVitest()` 함수 삭제
- `formatSection()`의 TEST 전용 분기 삭제
- `needsTest` 변수 및 `spawnVitest` 호출 삭제
- 결과 정렬 순서(`order` 배열)에서 `"TEST"` 제거
- CLI 옵션 기본값에서 `"test"` 제거 (`sd-cli-entry.ts:101`)
- CLI 옵션 유효성 검사에서 `"test"` 제거 (`sd-cli-entry.ts:113`)
- `@simplysm/core-node`의 `cpx` import 제거 (spawnVitest 삭제로 미사용)
- `@simplysm/core-common`의 `err` import — 유지 (check.ts:199 Promise.allSettled rejected 처리에서 사용)
- 테스트에서 vitest/test 관련 케이스 삭제 및 수정
- CLAUDE.md의 check 명령 설명 업데이트

**경계:**

- `sdAngularPlugin` (vite-angular-plugin.ts)은 이 Feature에서 다루지 않음 (vitest 실행 자체에 필요한 Vite 플러그인)
- `pnpm test` 스크립트(package.json)는 이 Feature에서 다루지 않음

**근거:**

- 사용자 요청: "sd-cli에서 vitest 관련 로직은 빼는게 좋지 않을까", "vitest run이면 충분할것도 같은데"
- 사용자 선택: A안 (test 타입 완전 제거)

## 제외 사항

- `sdAngularPlugin` 제거 — vitest에서 Angular AOT 컴파일에 필요하므로 제외 (사용자 확인: "1번을 말하는거긴해")
- `pnpm test` 스크립트 변경 — 범위 초과
