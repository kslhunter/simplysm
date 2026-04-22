# 크로스 참조 정합성 검증 — LLM 검증

## 검증 항목

### Slice 1: recipes 내부 링크

- **진입점 → 확장 파일 (13건)**: crud-list.md §5~§11의 7개 `→ [상세 문서](./crud-list/extension-*.md)` 링크 + crud-detail.md §5~§10의 6개 동일 패턴 링크가 실제 파일에 매핑되는지 / Glob으로 13개 파일 전수 존재 확인
- **확장 → 진입점 상단 역링크 (13건)**: 각 확장 파일 1행 `← [CRUD 리스트|상세폼 레시피 진입점](../crud-list|detail.md)` → 대상 파일 존재 확인
- **확장 → 진입점 하단 역링크 (13건)**: 각 확장 파일 하단 Cross-reference "진입점: [crud-list.md](../crud-list.md)" 스타일 → 대상 파일 존재 확인
- **확장 파일 간 상호 참조**: extension-a↔f(crud-list), extension-b→c/d, extension-d→e, extension-e→d/f, extension-a→c/d(crud-detail), extension-b→c/d, extension-c→d, extension-d→c 등 → 같은 디렉토리 내 상대 경로 대상 파일 존재 확인
- **확장 → docs 앵커 참조**: `../../ui-data/sd-sheet.md#sdsheetcolumn`, `#sdsheetcolumncelltemplate`, `#cumulativeselection-사용-패턴`, `../../providers/sd-modal-provider.md#편집-모달-호출`, `../../provider-types/sd-modal-content-def.md#구현-패턴`, `#selectmodaloutputresult`, `../../utils/setup-functions.md#setupcandeactivate`, `../../utils/inject-routing-signals.md#injectviewtypesignal` 등 → 대상 파일 존재 + 헤딩 slug 매칭 확인
- **page-modal-container.md → crud-list (6건)**: `./crud-list.md#8-확장-d-선택-모달-전환`, `#9-확장-e-조회-전용-modal`, `#modal-뷰--반드시-선택-모달인-것은-아니다` 등 → 진입점 앵커 존재 확인
- **data-select-button.md → crud-list/extension-d (1건)**: `./crud-list/extension-d-select-modal.md` → 확장 파일 존재 확인
- **data-select-button.md → _common-rules (2건)**: `./_common-rules.md#시트-셀-내부-컨트롤에-insettrue-sizesm을-명시한다`, `./_common-rules.md#input-의존-데이터-로딩에-void-this_initasync를-사용하지-않는다` → 공통 규칙 앵커 존재 확인

### Slice 2: docs → recipes 역링크 앵커 (약 46건)

- **sd-sheet.md (10건)**: `#3-최소-뼈대-조회-전용-page`, `#5-확장-a-inline-편집저장`, `#6-확장-b-선택-기능--선택-삭제복구`, `#7-확장-c-inline-삭제-열`, `#8-확장-d-선택-모달-전환`, `#10-확장-f-복합-상세-내부-sd-sheet` → crud-list/detail 진입점 헤딩 slug 매칭
- **sd-anchor.md (5건)**: `#5-확장-a-inline-편집저장`, `#7-확장-c-inline-삭제-열`, `#10-확장-f-모달-편집-모드`, `#7-확장-c-modal-뷰`, `#10-확장-f-복합-상세-내부-sd-sheet`
- **sd-button.md (7건)**: `#3-최소-뼈대-조회-전용-page`, `#5-확장-a-inline-편집저장`, `#11-확장-g-엑셀-업로드다운로드`, `#3-최소-뼈대-읽기-전용-상세-폼`, `#5-확장-a-편집저장`, `#6-확장-b-삭제복구-토글`, `#7-확장-c-modal-뷰`, `#8-확장-d-control-뷰`
- **sd-dock.md / sd-dock-container.md (각 4건)**: `#3-최소-뼈대-조회-전용-page`, `#8-확장-d-선택-모달-전환`, `#7-확장-c-modal-뷰`, `#8-확장-d-control-뷰`
- **sd-form.md (4건)**: `#3-최소-뼈대-조회-전용-page`, `#5-확장-a-inline-편집저장`, `#3-최소-뼈대-읽기-전용-상세-폼`, `#5-확장-a-편집저장`
- **sd-textfield.md (5건)**: `#3-최소-뼈대-조회-전용-page`, `#5-확장-a-inline-편집저장`, `#3-최소-뼈대-읽기-전용-상세-폼`, `#5-확장-a-편집저장`, `#10-확장-f-복합-상세-내부-sd-sheet`
- **sd-checkbox.md (1건)**: `#5-확장-a-inline-편집저장`
- **sd-shared-data-select.md (2건)**: `#5-확장-a-inline-편집저장`, `#9-확장-e-보조-기능-영역`
- **sd-busy-container.md (3건)**: `#3-최소-뼈대-조회-전용-page`, `#11-확장-g-엑셀-업로드다운로드`, `#3-최소-뼈대-읽기-전용-상세-폼`
- **sd-topbar-container.md (6건)**: `#3-최소-뼈대-조회-전용-page`, `#5-확장-a-inline-편집저장`, `#11-확장-g-엑셀-업로드다운로드`, `#3-최소-뼈대-읽기-전용-상세-폼`, `#5-확장-a-편집저장`, `#7-확장-c-modal-뷰`
- **sd-topbar.md (4건)**: `#3-최소-뼈대-조회-전용-page`, `#5-확장-a-inline-편집저장`, `#3-최소-뼈대-읽기-전용-상세-폼`, `#7-확장-c-modal-뷰`
- **setup-functions.md (3건)**: `#5-확장-a-inline-편집저장`, `#5-확장-a-편집저장`, `#7-확장-c-modal-뷰`
- **inject-routing-signals.md (8건)**: `#3-최소-뼈대-조회-전용-page`, `#3-최소-뼈대-읽기-전용-상세-폼`, `#7-확장-c-modal-뷰`, `#8-확장-d-선택-모달-전환`, `#8-확장-d-control-뷰`
- **mark.md (4건)**: `#5-확장-a-inline-편집저장`, `#6-확장-b-선택-기능--선택-삭제복구`, `#5-확장-a-편집저장`, `#10-확장-f-복합-상세-내부-sd-sheet`

→ 모든 앵커가 진입점 파일의 헤딩 slug에 매칭되는지 확인

### Slice 3: README.md 링크 (4건)

- `./docs/recipes/crud-list.md` (2건: line 142, 291) → 파일 존재 확인
- `./docs/recipes/crud-detail.md` (2건: line 143, 292) → 파일 존재 확인
