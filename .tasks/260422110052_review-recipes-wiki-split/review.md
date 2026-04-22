# 코드 리뷰: recipes-wiki-split

## 총평

`.tasks/260422023446_angular-recipes-wiki-split/` WBS의 Feature 1.1(crud-list 분해), 1.2(crud-detail 분해), 1.3(크로스 참조 정합성 검증) 구현 산출물을 5가지 관점에서 심층 리뷰한 결과, **Critical/Medium 이슈는 발견되지 않았다.** 모든 요구명세(gherkin scenario)가 충족되며, 링크/앵커 120건+ 전수 검사에서 깨진 링크가 없고, Feature 1.1 ↔ 1.2 포맷이 일관되며, 주의사항/관용규칙 분산이 설계대로 이루어졌다. Low 이슈 2건만 존재한다.

---

## CONSIST-001 [Low] crud-detail 진입점에 관용규칙이 2개만 남아 "규칙 1", "규칙 2"로 표기

- **위치:** packages/angular/docs/recipes/crud-detail.md:435-456

crud-list.md는 관용규칙 3개(규칙 1, 2, 3)를 모두 유지하지만, crud-detail.md는 설계 결정 D5에 따라 "규칙 3(setupCanDeactivate 뷰타입 분기)"을 extension-c-modal-view.md로 이동시켰다. 그 결과 진입점에 "규칙 1", "규칙 2"만 남아 있는데, 이는 설계 결정대로의 정상 결과이다. 다만 원래 3개였던 것이 2개로 줄어 "규칙 3이 빠졌는가?"라는 의문을 유발할 수 있다.

**현재 상태:** extension-c-modal-view.md:199에 `## setupCanDeactivate는 뷰 타입에 따라 분기` 헤딩으로 해당 내용이 존재하여 규칙 3은 올바르게 이동됨.

**개선 방향:** 진입점 §13 상단에 "규칙 3은 확장 C 특화이므로 [extension-c-modal-view.md](./crud-detail/extension-c-modal-view.md#setupcandeactivate는-뷰-타입에-따라-분기)로 이동" 한 줄 안내를 추가하면 추적성이 올라간다. 단, 설계 결정 자체에는 문제 없으므로 수정하지 않아도 기능적 영향은 없음.

---

## CONSIST-002 [Low] crud-detail 최소 뼈대(§3)의 `injectPermsSignal` 호출 패턴이 crud-list와 다름

- **위치:** packages/angular/docs/recipes/crud-detail.md (진입점 §3 코드, 줄 718-722) vs packages/angular/docs/recipes/crud-list.md (진입점 §3 코드, 줄 206)

crud-list 최소 뼈대의 `injectPermsSignal`은 배열 직접 전달 형태:
```typescript
perms = injectPermsSignal(["sales.customer"], ["use"]);
```

crud-detail 최소 뼈대는 화살표 함수 래퍼 형태:
```typescript
perms = injectPermsSignal(
  () => ["sales.customer"],
  () => ["use"],
);
```

두 호출 패턴 모두 `injectPermsSignal` API가 지원하는 유효한 오버로드이므로 기능상 차이는 없다. 단, 두 레시피가 동일 개념을 다른 문법으로 보여주면 LLM이 따라할 때 혼란을 줄 수 있다.

**개선 방향:** 둘 중 하나로 통일. 단, 이 차이는 두 레시피가 원본부터 다른 패턴을 사용하고 있었을 가능성이 높고, wiki 분해 WBS의 범위("코드 스니펫 내용 변경 없음")에 해당하지 않으므로 본 WBS에서는 수정하지 않는 것이 적절하다.

---

## 검증 결과 요약

### (1) WBS/Feature 요구명세 충족 여부

| Scenario | 결과 |
|---|---|
| **1.1** 진입점 파일명 유지 (`crud-list.md`) | ✓ 유지됨 |
| **1.1** 외부 앵커 유효 (`#5-확장-a-inline-편집저장` 등 23건+) | ✓ 모든 앵커 유효 |
| **1.1** 7개 확장 파일 생성 (`recipes/crud-list/`) | ✓ 7개 존재 |
| **1.1** 의존 확장 안내 (상단 `> **선행:**`) | ✓ 모든 파일에 존재 |
| **1.1** 공통 주의사항 진입점 유지 (5건) | ✓ §13에 5건 유지 |
| **1.1** 확장 특화 주의사항 인라인 | ✓ 각 확장 "포인트" bullet에 인라인 |
| **1.1** 부록 A 풀 스택 합본 제거 | ✓ 섹션 없음 |
| **1.1** 이관 후보 목록 제거 | ✓ 섹션 없음 |
| **1.2** 진입점 파일명 유지 (`crud-detail.md`) | ✓ 유지됨 |
| **1.2** 외부 앵커 유효 (44건) | ✓ 모든 앵커 유효 |
| **1.2** 6개 확장 파일 생성 (`recipes/crud-detail/`) | ✓ 6개 존재 |
| **1.2** Feature 1.1 포맷 답습 | ✓ 동일 포맷 |
| **1.2** 관용규칙 3 → extension-c 이동 (D5) | ✓ extension-c-modal-view.md:199에 존재 |
| **1.2** 부록 A/이관 후보 제거 | ✓ 없음 |
| **1.3** 진입점↔확장 링크 13건 유효 | ✓ |
| **1.3** 확장→진입점 역링크 26건 유효 | ✓ |
| **1.3** docs→recipes 앵커 역링크 46건+ 유효 | ✓ |
| **1.3** page-modal-container/data-select-button 링크 유효 | ✓ |
| **1.3** README.md 링크 유효 | ✓ |

### (2) 링크/앵커 정합성

120건+ 전수 검사 완료. 깨진 링크 **0건**.

### (3) 내용 누락/변질/오류

- 부록 A, 이관 후보: 올바르게 제거됨
- 부록 B 확장 매트릭스 표: 양쪽 진입점에 유지됨
- Cross-reference 섹션: 양쪽 진입점에 유지됨
- 최소 뼈대(§3): 양쪽 진입점에 코드 전문 유지됨
- 분해 설명(§4): 유지됨
- 뷰 타입 분기(§12/§11): 유지됨 + 확장 파일 링크로 갱신됨

### (4) Feature 1.1 ↔ 1.2 포맷 일관성

| 요소 | crud-list | crud-detail | 일치 |
|---|---|---|---|
| 진입점 §5~§11 네비게이션 | 한 줄 요약 + 선행 + 도입 요소 + 줄 수 + 상세 문서 링크 | 동일 포맷 | ✓ |
| 확장 파일 첫 줄 역링크 | `← [CRUD 리스트 레시피 진입점](../crud-list.md)` | `← [CRUD 상세폼 레시피 진입점](../crud-detail.md)` | ✓ |
| 확장 파일 `> **선행:**` | 있음 | 있음 | ✓ |
| 확장 파일 하단 Cross-reference | 있음 | 있음 | ✓ |
| 디렉토리 구조 | `recipes/crud-list/extension-*.md` | `recipes/crud-detail/extension-*.md` | ✓ |

### (5) 주의사항/관용규칙 분산

| 항목 | 위치 | 설계대로 |
|---|---|---|
| crud-list 공통 주의사항 5건 | 진입점 §13 | ✓ |
| crud-list 확장 특화 포인트 | 각 확장 파일 "포인트" bullet | ✓ |
| crud-list 관용규칙 3건 | 진입점 §14 | ✓ |
| crud-detail 공통 주의사항 6건 | 진입점 §12 | ✓ |
| crud-detail 관용규칙 1,2 | 진입점 §13 | ✓ |
| crud-detail 관용규칙 3 | extension-c-modal-view.md | ✓ (D5) |

### 파일 크기 축소 효과

| 파일 | 분해 전 | 분해 후 진입점 | 감소 |
|---|---|---|---|
| crud-list.md | 2,190줄 | 529줄 | -76% |
| crud-detail.md | 1,741줄 | 484줄 | -72% |
