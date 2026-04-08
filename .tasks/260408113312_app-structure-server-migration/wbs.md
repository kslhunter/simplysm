# WBS: AppStructure 서버 이관

## 프로젝트 개요

- **배경:** 현재 `appStructureItems`가 클라이언트(angular)에서 정의되어, 서버의 permission 초기화 시 클라이언트가 items를 서버에 전달해야 하는 역전된 의존 관계가 존재한다. 서버가 items를 소유하고 API로 제공하는 구조로 정상화한다.
- **환경:** simplysm 모노레포 라이브러리. 소비 프로젝트에서 서버 1개가 복수 클라이언트 앱을 서빙하는 구조.
- **전제조건:** 없음
- **기술적 제약:**
  - `types.ts`, `utils.ts`는 Angular 의존성 없음 (순수 TypeScript)
  - `utils.ts`는 `@simplysm/core-common`의 Array 확장(`.single()`, `.last()`) 사용
  - `service-common`은 `core-common`에 의존하므로 이동 시 확장 메서드 사용 가능
  - angular 패키지는 이미 `service-common`에 의존
  - UI 컴포넌트 입력 타입(`ISdMenu`, `ISdFlatMenu`, `ISdPermission`)은 angular에 유지해야 함 — service-common 없이 angular만 사용하는 패키지도 이 타입에 접근 가능해야 하므로
- **참조 자료:**
  - `packages/angular/src/core/providers/sd-app-structure.types.ts` — 이동 대상 타입 정의 (61줄)
  - `packages/angular/src/core/providers/sd-app-structure.utils.ts` — 이동 대상 유틸 클래스 (350줄)
  - `packages/angular/src/core/providers/sd-app-structure.provider.ts` — 리팩토링 대상 Provider (47줄)
  - `packages/service-server/src/core/define-service.ts` — 서비스 정의 패턴 참조 (`defineService`, `ServiceContext`)
  - `packages/service-server/src/services/auto-update-service.ts` — 기존 서비스 구현 패턴 참조

## Impact Mapping

- **Goal:** 서버 permission 초기화 시 클라이언트 의존 제거 (데이터 흐름 단방향화: 서버 → 클라이언트)
  - **Actor:** simplysm 라이브러리 소비 프로젝트 개발자
    - **Impact:** 서버에서 appStructureItems를 정의하고, 클라이언트는 서버에서 받아 사용한다
      - **Deliverable:** AppStructure 타입/유틸 공유 패키지 이동, 서버 서비스, 클라이언트 Provider 리팩토링

## Feature Breakdown

### Epic 1. AppStructure 서버 이관

#### [x] Feature 1.1 공유 타입/유틸을 service-common으로 추출

**의존성:** 없음

**범위:**

- `service-common/src/app-structure/app-structure.types.ts`에 공유 타입 생성:
  - `TSdAppStructureItem<TModule>` (+ `ISdAppStructureGroupItem`, `ISdAppStructureLeafItem`, `ISdAppStructureSubPermission`)
  - `ISdFlatPermission<TModule>`
- `service-common/src/app-structure/app-structure.utils.ts`에 공유 유틸 생성:
  - `getFlatPermissions` — standalone 함수
  - `isUsableModules` — 모듈 활성화 단일 체크 (공개 export, angular에서도 import하여 사용)
  - `isUsableModulesChain` — 모듈 체인 활성화 체크 (공개 export, angular에서도 import하여 사용)
- `service-common/src/index.ts`에 export 추가
- angular 패키지 변경:
  - `sd-app-structure.types.ts`에서 공유 타입을 `@simplysm/service-common`에서 re-export
  - `sd-app-structure.utils.ts`에서:
    - `getFlatPermissions`는 `@simplysm/service-common`의 함수를 import하여 위임
    - `_isUsableModules`, `_isUsableModulesChain`을 `@simplysm/service-common`의 `isUsableModules`, `isUsableModulesChain`으로 대체

**경계:**

- 클라이언트 전용 타입(`ISdMenu`, `ISdFlatMenu`, `ISdPermission`)은 angular에 유지 — UI 컴포넌트(`SdSidebarMenu`, `SdTopbarMenu`, `SdPermissionTable`) 입력 타입이므로 service-common 없이 사용 가능해야 함
- 클라이언트 전용 유틸(`getMenus`, `getFlatMenus`, `getPermissions`)은 angular에 유지 — 반환 타입이 angular 전용(`ISdMenu`, `ISdPermission`)이므로 service-common에 넣으면 역방향 의존 발생
- 정보 조회 유틸(`getTitleByFullCode`, `getPermsByFullCode`, `getItemChainByFullCode`)은 angular에 유지 — Provider 전용 + 빈번한 호출(네비게이션/렌더링마다)로 로컬 처리 적합
- Provider(`sd-app-structure.provider.ts`)는 이 Feature에서 변경하지 않음
- 서비스 정의는 Feature 1.2에서 다룸

**근거:**

- 대화: 서버에서 실제 필요한 것은 items 정의 타입과 `getFlatPermissions`(permission DB 초기화용)
- 코드 분석: 추출 대상에 Angular 의존성 없음, `core-common` Array 확장만 사용 → service-common에서 사용 가능
- 대화: angular이 이미 service-common에 의존하여 의존 방향 변경 없음
- 대화: 헬퍼 함수(`_isUsableModules`, `_isUsableModulesChain`)는 service-common에서 public export하고 angular에서 import하는 단일 소스 방식 채택 — 코드 중복 방지
- 대화: `ISdMenu` 등 UI 타입은 angular에 유지 — service-common을 쓰지 않는 패키지도 UI 컴포넌트를 사용할 수 있어야 함
- 대화: 서버에서 계산까지 수행하는 방안 검토 → `getTitleByFullCode`, `getPermsByFullCode`가 네비게이션/렌더링마다 호출되어 서버 round-trip 부적합, items를 클라이언트에서 보유 + 로컬 계산이 적합

#### [x] Feature 1.2 AppStructureService 서버 서비스 정의

**의존성:** Feature 1.1

**범위:**

- `service-server/src/services/`에 `app-structure-service.ts` 생성
- `AppStructureService(itemsMap)` 팩토리 함수 제공:
  - 인자: `itemsMap: Record<string, AppStructureItem[]>` (clientName → items 매핑, TModule 기본값 `unknown` 사용)
  - 반환: `ServiceDefinition` (`defineService` 사용)
  - `getItems()` 메서드: 전체 `itemsMap` 반환 (서버 내부 permission 초기화 및 관리자 앱의 타 클라이언트 권한 관리 용도)
- `AppStructureServiceType` 타입 export (클라이언트 타입 공유용, `ServiceMethods` 사용)
- `service-server/src/index.ts`에 export 추가

**경계:**

- permission 초기화 로직 자체는 소비 프로젝트의 영역 (이 Feature에서 다루지 않음)
- items 필터링(특정 클라이언트 것만 추출)은 소비 측 책임

**근거:**

- 대화: `AutoUpdateService` 패턴(`defineService` + `ServiceMethods` 타입 export)과 동일한 패턴 적용
- 대화: 서버 1개가 복수 클라이언트를 서빙하므로 `Record<string, items[]>` 맵 구조 채택
- 대화: `getItems()`는 항상 전체 맵 반환 — 관리자 앱에서 모든 클라이언트 권한을 관리해야 하므로 서버에서 필터링하지 않음
- 설계: `AppStructureService`는 함수 팩토리 패턴 (런타임 인자 `itemsMap`을 클로저로 캡처). `AutoUpdateService`의 `const = defineService(...)` 패턴과 차이점
- 설계: `AppStructureServiceType = ServiceMethods<ReturnType<typeof AppStructureService>>` — 팩토리 함수이므로 `ReturnType` 필요
- 설계: auth 래퍼 없음 — items는 설정 데이터, 인증 불필요
- Feature 문서: `1.2-app-structure-service-definition.md`

#### [x] Feature 1.3 SdAppStructureProvider 리팩토링

**의존성:** Feature 1.1, Feature 1.2

**범위:**

- `SdAppStructureProvider`에서 `abstract items` 제거, `WritableSignal<AppStructureItem<TModule>[]>` (초기값 `[]`)로 대체
- `abstract serviceKey: string` 추가 — consumer가 ServiceClient 키를 정의
- `fetchItems()` 메서드 추가 — `serviceKey`로 ServiceClient 획득, `AppStructureService.getItems()` 호출, `clientName`으로 필터링
- `service-common/src/service-types/app-structure-service.types.ts`에 `AppStructureService` 인터페이스 추가 (OrmService, AutoUpdateService 패턴)
- `usableMenus`, `usableFlatMenus` computed signal이 `items()` signal 변경에 반응하도록 업데이트
- `getTitleByFullCode`, `getItemChainByFullCode`, `getPermsByFullCode` 메서드가 `items()` 사용하도록 변경
- items 로딩 전 상태 처리: `getTitleByFullCode`는 throw 유지, 호출측(`SdBaseContainer`, `injectViewTitleSignal`)에서 try/catch → 빈 문자열 반환
- angular 패키지 내 사용처(`SdBaseContainer`, `injectViewTitleSignal`, `injectPermsSignal`)의 동작 호환성 유지
- 기존 테스트 수정

**경계:**

- `abstract usableModules`, `abstract permRecord`는 그대로 유지 (사용자 세션별 동적 데이터이므로 소비 프로젝트에서 구현)
- 소비 프로젝트에서의 Provider 상속 구현 변경은 이 Feature의 범위가 아님 (breaking change 문서화만 수행)

**근거:**

- 대화: items는 앱의 정적 설정 데이터이므로 connection 시 1회 fetch로 충분
- 코드 분석: `SdAppStructureProvider`의 `usableModules`, `permRecord`는 사용자별 동적 데이터 → 서버 이관 불가, abstract 유지
- 코드 분석: 사용처(`SdBaseContainer:104`, `injectViewTitleSignal:19`, `injectPermsSignal:8`)는 모두 Provider의 메서드/computed를 통해 간접 접근하므로, Provider 내부 변경 시 사용처 코드 변경 최소화 가능
- 설계: `abstract serviceKey` 패턴 채택 — 기존 abstract 멤버(`usableModules`, `permRecord`)와 일관
- 설계: service-common `service-types/`에 인터페이스 정의 — angular → service-server 직접 의존 방지, 기존 패턴 준용
- 설계: `getTitleByFullCode` throw 유지 — 에러 의미 명확, 호출측에서 try/catch로 안전 처리
- Feature 문서: `1.3-sd-app-structure-provider-refactoring.md`

## 제외 사항

- **소비 프로젝트 측 마이그레이션 가이드 작성** — 사유: simplysm 라이브러리 범위 외. 단, Feature 1.3에서 breaking change 사항은 문서화
- **permission 초기화 로직 구현** — 사유: 소비 프로젝트별 비즈니스 로직
- **items의 서버 측 영속화(DB 저장)** — 사유: items는 코드에서 정적으로 정의하는 설정 데이터. 사용자가 요청하지 않음
