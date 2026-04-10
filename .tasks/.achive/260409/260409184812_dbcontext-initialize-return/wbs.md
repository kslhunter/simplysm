# WBS: DbContext.initialize() 마이그레이션 적용 여부 반환

## 프로젝트 개요

- **배경:** `DbContext.initialize()`가 `Promise<void>`를 반환하여, 호출자가 마이그레이션 적용 여부를 알 수 없음. 후속 동작(캐시 무효화, 리로드 등)을 결정하기 위해 boolean 반환이 필요함.
- **환경:** `@simplysm/orm-common@14.0.30` 모노레포 내 패키지
- **전제조건:** 없음
- **기술적 제약:** 기존 `initialize()` 호출자의 하위 호환성 유지 필요 (void → boolean 변환은 기존 코드에 영향 없음)
- **참조 자료:**
  - GitHub issue #21: 기능 요청 원문
  - `packages/orm-common/src/db-context.ts`: DbContext 클래스 및 initialize() 메서드
  - `packages/orm-common/src/ddl/initialize.ts`: initializeImpl 핵심 구현

## Impact Mapping

- **Goal:** 호출자가 마이그레이션 적용 여부를 프로그래밍적으로 판단하여 후속 동작을 자동화한다
  - **Actor:** DbContext를 사용하는 서버 개발자
    - **Impact:** initialize() 호출 후 마이그레이션 적용 여부에 따라 조건부 로직을 작성한다
      - **Deliverable:** initialize()가 boolean을 반환하도록 수정

## Feature Breakdown

### Epic 1. initialize 반환 타입 변경

#### [x] Feature 1.1 initialize() boolean 반환

**의존성:** 없음

**범위:**

- `initializeImpl()` 함수가 마이그레이션 적용 여부를 `boolean`으로 반환 (`true`: 마이그레이션이 적용됨, `false`: 적용된 마이그레이션 없음)
- `DbContext.initialize()` 메서드가 `initializeImpl`의 반환값을 그대로 반환 (`Promise<boolean>`)
- `DbContextBase` 인터페이스의 `initialize` 시그니처 업데이트

**경계:**

- 마이그레이션 적용 상세 정보(어떤 마이그레이션이 적용되었는지 등)는 이 Feature에서 다루지 않음
- `force: true`로 전체 재생성한 경우의 반환값 정의: 마이그레이션 등록은 수행하지만 실제 `up()` 실행이 아니므로 `false` 반환

**근거:**

- GitHub issue #21: "initialize()가 마이그레이션 적용 여부를 boolean으로 반환하여, 호출자가 후속 동작(예: 캐시 무효화, 리로드 등)을 결정할 수 있다"
- 설계 결정 D1: pending migration up() 실행 시만 true, force/새 환경은 false
- 설계 결정 D2: DbContextBase 인터페이스에 initialize가 없으므로 인터페이스 변경 불필요

## 제외 사항

- 마이그레이션 적용 상세 목록 반환 (issue에서 boolean만 요청, 범위 초과)
