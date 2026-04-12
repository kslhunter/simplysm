# 코드 리뷰 리포트: packages/angular 디렉토리 카테고리화 리팩토링

| 항목 | 내용 |
|------|------|
| 분석 대상 | `.tasks/260411190928_refactor-angular/` (WBS, Feature 1.1~1.5, verify) + 구현 결과 코드 |
| 분석 일시 | 2026-04-12 |
| 발견 이슈 | 2건 (Critical 0 / Medium 1 / Low 1) |

## 전체 평가

리팩토링이 WBS 계획에 따라 정확하게 수행되었다. 5개 카테고리(core, controls, layout, data, features) 구조가 올바르게 생성되었고, sd-check(typecheck + lint + test 1339건) 전체 통과가 검증되었다.

주요 검증 결과:
- **디렉토리 구조**: WBS 계획과 100% 일치. src/ top-level에 5개 카테고리 + index.ts + scss.d.ts만 존재
- **import 경로**: 구 경로(`../button/` 등) 참조 잔존 0건. 모든 참조가 카테고리 경로 사용
- **카테고리 내 상호 참조**: 설계 결정 D2(같은 depth 이동 시 경로 변경 불필요)가 올바르게 적용됨
- **tests/ 미러링**: src/ 구조와 1:1 미러링 확인 (core, controls, layout, data, features 모두)
- **public API**: index.ts의 모든 export가 새 경로를 사용하며 심볼 보존 확인
- **코드 로직 불변**: import/export 경로 외 변경 없음 (verify.md의 sd-check 통과로 확인)

## 이슈 목록

### CONSIST-001: CLAUDE.md에 존재하지 않는 `core/navigation/` 디렉토리 기록

```
id: CONSIST-001
severity: Medium
category: 일관성
location: packages/angular/CLAUDE.md:27
title: CLAUDE.md에 실제 존재하지 않는 core/navigation/ 디렉토리가 기록되어 있음
description: |
  WBS Feature 1.1에서 `navigation/menu-utils.ts`는 `core/routing/`으로 통합되어
  `navigation/` 디렉토리는 삭제되었다. 그런데 CLAUDE.md 27행에 여전히
  `│   ├── navigation/       메뉴 유틸 (getMenuRouterLinkOption, getIsMenuSelected)`
  항목이 남아 있다.

  동시에 30행의 `routing/` 항목에 `menu-utils`가 이미 포함되어 있어 정보가 중복된다.

  CLAUDE.md 업데이트는 WBS Feature 1.5 범위에 명시되어 있었으므로
  ("packages/angular/CLAUDE.md 구조 문서 업데이트"), 이 누락은 구현 범위 내 결함이다.

  LLM이 이 문서를 참조하여 코드를 작성할 때 존재하지 않는 디렉토리를 참조할 수 있다.
suggestion: |
  CLAUDE.md 27행의 `navigation/` 항목을 삭제한다.
  routing/ 항목에 이미 menu-utils가 포함되어 있으므로 추가 수정은 불필요하다.
```

### CONSIST-002: index.ts 섹션 주석이 새 카테고리 구조와 불일치

```
id: CONSIST-002
severity: Low
category: 일관성
location: packages/angular/src/index.ts:77-79
title: index.ts의 구 카테고리 주석이 새 디렉토리 구조를 반영하지 않음
description: |
  index.ts의 섹션 주석이 리팩토링 이전의 분류를 그대로 유지하고 있어
  새 카테고리 구조와 불일치한다. 예시:

  - 77행 `// features/permission-table` → 실제 경로는 `./data/permission-table/` (data 카테고리)
  - 79행 `// features` → 실제 경로는 `./layout/base-container/`, `./data/data-sheet/` 등 (layout, data 카테고리)
  - 103행 `// ui/layout` → 실제 경로는 `./layout/dock/`, `./controls/gap/`, `./data/kanban/` (3개 카테고리 혼재)

  리팩토링의 범위가 "import/export 경로 수정"이었으므로 주석은 엄격히 범위 밖이나,
  코드 탐색 시 혼란을 줄 수 있다.
suggestion: |
  index.ts의 섹션 주석을 새 5개 카테고리 구조(core, controls, layout, data, features)에
  맞게 재편성하거나, 기존 주석을 제거한다.
```

## 거짓양성 필터링

| 후보 이슈 | 제외 사유 |
|------------|-----------|
| data/ 내 `state-preset/`에 대응 테스트 디렉토리 부재 | WBS에서 이미 인지 ("state-preset/은 tests/ 디렉토리 없음"). 리팩토링 전부터 테스트가 없었으며, 테스트 추가는 별도 작업 |
| core/ 루트 loose files가 너무 많음 (10개) | WBS에서 의도된 설계. 각 파일이 독립적이며 특정 클러스터에 속하지 않는 것이 분석으로 확인됨 |
| SCSS @use 경로 문제 | verify.md에서 발견 후 즉시 수정 완료로 기록됨. 현재 코드는 정상 |
