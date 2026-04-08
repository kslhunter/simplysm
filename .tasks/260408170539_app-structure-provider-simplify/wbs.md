# WBS: SdAppStructureProvider 단순화 리팩토링

## 프로젝트 개요

- **배경:** `SdAppStructureProvider`가 abstract class로 되어 있어 소비 프로젝트에서 불필요한 서브클래스를 만들어야 함. `serviceKey`, `usableModules`, `permRecord`를 abstract 프로퍼티로 강제하는 것이 과도함.
- **환경:** `@simplysm/angular` 패키지 (Angular 21, signal-based)
- **전제조건:** 없음
- **기술적 제약:** 기존 public API (`injectPermsSignal`, `injectViewTitleSignal`, `SdBaseContainer` 등)의 동작이 유지되어야 함

## Impact Mapping

- **Goal:** SdAppStructureProvider 사용 시 보일러플레이트 제거
  - **Actor:** 소비 프로젝트 개발자
    - **Impact:** 서브클래스 없이 바로 사용
      - **Deliverable:** concrete class + initialize 메서드 + WritableSignal

## Feature Breakdown

### Epic 1. SdAppStructureProvider 단순화

#### [x] Feature 1.1 SdAppStructureProvider abstract → concrete 전환

**의존성:** 없음

**범위:**

- `abstract class` → `class`로 변경
- `abstract serviceKey` 제거 → `initialize(serviceKey: string)` 메서드의 파라미터로 이동
- `abstract usableModules: Signal<TModule[] | undefined>` → `readonly usableModules = signal<TModule[] | undefined>(undefined)` (WritableSignal)
- `abstract permRecord: Signal<Record<string, boolean> | undefined>` → `readonly permRecord = signal<Record<string, boolean> | undefined>(undefined)` (WritableSignal)
- `fetchItems()` → `initialize(serviceKey: string)`로 메서드명 변경 (내부 로직 동일)
- 기존 computed signal (`usableMenus`, `usableFlatMenus`) 및 메서드들은 동작 유지
- 기존 테스트 (`app-structure-provider.spec.ts`) 수정

**경계:**

- `injectPermsSignal`, `injectViewTitleSignal`, `SdBaseContainer` 등 inject 사용처는 메서드만 호출하므로 변경 불필요
- `SdAppStructureUtils`는 변경 없음
- 타입 (`AppStructureItem`, `SdFlatMenu`, `SdPermission` 등)은 변경 없음

**근거:**

- 사용자 요청: "fetchItems 대신에 그냥 initialize로 하고 serviceKey를 input으로 받으면 되잖아.. 그외에 usableModules나 permRecord는 signal로 해서 외부에서 set이나 update하게하고"
- 코드 확인: 패키지 내 프로덕션 상속 클래스 없음 (테스트 전용 `TestAppStructure`만 존재)
- 영향 파일: `packages/angular/src/core/providers/sd-app-structure.provider.ts`, `packages/angular/tests/core/providers/app-structure-provider.spec.ts`

## 제외 사항

- 없음
