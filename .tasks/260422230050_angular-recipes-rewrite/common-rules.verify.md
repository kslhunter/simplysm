# _common-rules.md 재작성 — LLM 검증

대상 파일: `packages/angular/docs/recipes/_common-rules.md`

## 검증 항목

### 섹션 구조 (Rule: T3 템플릿 섹션 순서 준수)

- H2 섹션 순서가 정확히 "적용 범위" → "✅ Always" → "⚠️ Ask first" → "🚫 Never" → "예외 케이스"인가 / Grep `^## `으로 순서 확인
- H2 섹션 수가 정확히 5개인가 / Grep `^## ` 카운트

### 규칙 분류 (Rule: 모든 규칙이 3-tier 중 하나로 분류)

- ✅ Always 하위 H3 4개 포함: "injectViewTypeSignal", "<sd-topbar>" 소유, 시트 셀 inset/size, input → filter 동기화
- ⚠️ Ask first 하위 H3 3개 포함: 공유 데이터 wait(), SdCommandDirective 중복, 삭제 방식 결정
- 🚫 Never 하위 H3 3개 포함: void this._initAsync(), signal 필드 초기값 signal 읽기, mark() 저장 감지 오용
- "예외 케이스" 하위 3개 포함: 시트 셀 예외, 공유 데이터 미사용 화면, isDeleted 부재

### 과거 유틸 이름 부재 (D1 설계 결정)

- `useCrudList`, `useDataSheet`, `useCrudDetail`, `useDataDetail`, `setupCumulateSelectedKeys2`, `setupDataDetail` 어떤 이름도 등장하지 않음 / Grep 0건

### Deprecated 섹션 부재 (D4 설계 결정)

- "Deprecated", "Legacy", "이전 버전", "한때" 문자열 부재 / Grep 0건

### ❌/✅ 대비 + 근거 (Rule: 각 규칙에 ❌/✅ 대비 블록과 근거 1줄)

- 코드 예시가 필요한 규칙(최소 5개: `_initAsync`, signal 필드, input→filter, `<sd-topbar>` 소유, `mark`)에 ❌ 와 ✅ 주석을 둘 다 포함한 코드블록이 있다
- 각 H3 규칙 하위에 `**근거**:` 라인이 최소 1회 등장한다 / Grep `\*\*근거\*\*:` 카운트 ≥ 9
- 🚫 Never 규칙에는 `**근거**:`와 함께 대안이 명시된다 (`**대안**:` 또는 본문 `// ✅` 블록)

### 적용 범위 (Rule: 적용 범위는 recipes 4계열 전반으로 확장)

- "적용 범위" 섹션에 `crud-list.md`, `crud-detail.md`, `data-select-button.md`, `page-modal-container.md` 4개 링크가 모두 등장

### 3인칭 서술 (Rule: 3인칭 서술)

- "여러분", "당신", "우리" 등장 0건 / Grep 확인
- "You" / "I can" 등장 0건 / Grep 확인

### 소스 경로 인용 (Rule: 문서 내 소스 경로 인용 유지)

- `injectViewTypeSignal` 규칙 근처에 `injectViewTypeSignal.ts` 또는 `sd-command.ts` 인용
- `mark` 규칙 근처에 `mark.ts` 또는 `obj.ts` 인용
- `_sdSharedData.wait()` 규칙 근처에 `sd-shared-data.provider.ts` 인용

### 앵커 안정성 (Rule: 다른 Feature에서의 참조 지점 제공)

- wbs Feature 2.6/3.2/3.4/3.5/3.7이 참조할 H3 키워드 5개가 존재: `injectViewTypeSignal`, `mark`, `sd-topbar`, `inset`, `_initAsync`
