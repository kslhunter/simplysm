# Feature 4.2 page-modal-container.md 재작성 — LLM 검증

대상 파일: `packages/angular/docs/recipes/page-modal-container.md`

## 검증 항목

### Rule: T1 템플릿 섹션 순서 준수

- H2 순서: `When to use / When NOT to use` → `전제조건` → `기본 레시피` → `변형` → `🚫 흔한 실수` → `관련 Entry`
- 검증: Grep으로 `^## ` 추출 후 순서 확인

### Rule: When to use / When NOT to use 명시

- "한 컴포넌트를 page · modal · control 중 둘 이상으로 재사용" 진입 조건 등장
- page/modal/control 전용도 분기 골라 사용 가능 명시
- 단일 추상 컨테이너(`<sd-base-container>`) 금지 사유와 대안 명시
- 리스트 → `crud-list.md`, 상세 → `crud-detail.md` 안내

### Rule: 기본 레시피는 self-contained 코드

- import 구문 포함: `SdBusyContainer`, `SdTopbarContainer`, `SdTopbar`, `injectViewTypeSignal`, `injectViewTitleSignal`, `NgIcon`, `tablerAlertTriangle`, Angular core
- `@Component`에 `selector`/`changeDetection: ChangeDetectionStrategy.OnPush`/`encapsulation: ViewEncapsulation.None`/`standalone: true`/`imports` 명시
- 분기: `<sd-busy-container>` → `@if (initialized() == null || initialized())` → `@if (restricted())` → `@else if (viewType() === "page")` → `@else if (viewType() === "modal")` → `@else (control)`
- `viewType`/`viewTitle`이 필드 이니셜라이저에서 `injectViewTypeSignal()`/`injectViewTitleSignal()` 호출
- `initialized() == null || initialized()` 옆에 의도 주석 1줄 존재
- `injectViewTypeSignal` 자동 판정 규칙(modal 우선 → 라우트 selector 비교 → control)이 본문에 명시

### Rule: 변형 섹션이 분기 생략 기준 제공

- 표 행: page 분기+topbar / modal 분기 / control 분기 / busy·busyMessage / initialized / restricted / `injectViewTitleSignal()` 7행 이상
- 각 행에 "포함 조건"과 "생략 예시" 컬럼 모두 채워짐
- `override` input 기반 viewType 수동 오버라이드 코드 + "추상화 복원 부추김, 자동 판정 권장" 주의 1줄

### Rule: 흔한 실수에 ❌/✅ + 근거

- `<sd-base-container>` 재도입 항목: ❌/✅ 코드블록 + `**근거**:` 1줄
- `useBaseContainer()` 헬퍼 추출 항목: ❌/✅ + `**근거**:` 1줄
- `viewType() === "modal"` 만으로 선택 모달 단정 항목: ❌/✅ + `**근거**:` 1줄, (a) `crud-list/extension-d-select-modal.md`·(b) `crud-list/extension-e-readonly-modal.md` 1-level 링크
- `injectViewTypeSignal()` 호출 시점 위반 항목: 1줄 요약 + `_common-rules.md` 해당 규칙으로 1-level 링크

### Rule: 공통 규칙 위임 (1-level)

- `injectViewTypeSignal()` 호출 시점 → `./_common-rules.md#...` 링크
- page 컴포넌트의 `<sd-topbar>` 소유 → `./_common-rules.md#...` 링크
- 위임 링크가 정의·코드를 본 문서에 중복하지 않음

### Rule: 시그니처 인용은 소스 기준

- 인용 형식: `packages/angular/src/...:라인` 형태
- 인용된 라인 번호가 실제 소스와 일치 (`injectViewTypeSignal.ts:7`, `injectViewTitleSignal.ts:7,14`, `sd-activated-modal.provider.ts:8`)
- `SdBusyContainer`의 input 시그니처(`busy`/`message`/`type`/`progressPercent`)가 본 문서에 등장하는 형태와 일치

### Rule: 3인칭 서술 + 시간 민감 정보 부재

- "여러분", "당신", "우리" 등장하지 않음
- 영문 1·2인칭 ("I ", "You ") 등장하지 않음
- "한때", "이전에는", "v13까지", "20XX년" 등 시간 만료 표현 등장하지 않음

### Rule: 경계 — 다른 Feature 범위 침범 금지

- 본문에 `<sd-sheet>`/`<sd-form>` 코드 없음 (placeholder 주석만 허용)
- 선택 모달의 `implements SdSelectModal<T>` 본문 코드는 ❌ 예시(올바른 사용법은 링크 위임)로만 등장
- 리스트·상세 본문 채우기는 `crud-list.md`·`crud-detail.md` 링크로 안내
