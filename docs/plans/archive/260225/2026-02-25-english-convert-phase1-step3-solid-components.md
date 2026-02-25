# English Conversion — Phase 1 Step 3: solid/src/components Comments

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** Convert all Korean comments, JSDoc, and region labels in `packages/solid/src/components/` to English.

**Architecture:** Read each file → translate comments/JSDoc/regions to English → build → test → commit.

**Tech Stack:** TypeScript, SolidJS, pnpm, vitest

**Reference:** `docs/plans/2026-02-24-codebase-english-conversion-design.md`

**Checklist:** `docs/references/codebase-english-conversion-checklist.md`

**Dependency:** Steps 1-2 should be progressing in parallel or completed.

---

## Global Translation Rules

### What to Translate
- `//` single-line comments
- `/* */` block comments
- `/** */` JSDoc comments
- `//#region` and `//#endregion` labels

### What to KEEP (Korean)
- String literals in JSX (not comments) — handled in Phase 2
- String literals in error/alert messages — handled in Phase 2

### Translation Style
- **Concise**: `// 구현` → `// Implementation`
- **UI terms**: Keep consistency with solid/UI terminology

---

## Files to Process

**Total: ~80 source files in `packages/solid/src/components/`**

### By Category

**Data Components** (~30 files)

Calendar
- [ ] `data/calendar/Calendar.tsx`
- [ ] `data/calendar/CalendarContext.ts`
- [ ] `data/calendar/CalendarProvider.tsx`

Kanban
- [ ] `data/kanban/Kanban.tsx`
- [ ] `data/kanban/KanbanContext.ts`
- [ ] `data/kanban/KanbanItem.tsx`
- [ ] `data/kanban/KanbanSelection.tsx`
- [ ] `data/kanban/KanbanDragDropTypes.ts`
- [ ] (other kanban files)

List
- [ ] `data/list/List.tsx`
- [ ] `data/list/ListContext.ts`
- [ ] `data/list/ListItem.tsx`
- [ ] (other list files)

Table/DataSheet/Etc
- [ ] Other data component files (~15 more)

**Display Components** (~15 files)
- [ ] `display/icon/Icon.tsx`
- [ ] `display/badge/Badge.tsx`
- [ ] `display/label/Label.tsx`
- [ ] (other display files)

**Input Components** (~20 files)
- [ ] `input/text-input/TextInput.tsx`
- [ ] `input/select/Select.tsx`
- [ ] `input/checkbox/Checkbox.tsx`
- [ ] (other input component files)

**Layout Components** (~15 files)
- [ ] `layout/sidebar/Sidebar.tsx`
- [ ] `layout/topbar/Topbar.tsx`
- [ ] `layout/modal/Modal.tsx`
- [ ] (other layout files)

---

## Task: Translate All Comments

### Step 1: Scan for Korean

```bash
grep -rn '[가-힣]' packages/solid/src/components/ --include='*.ts' --include='*.tsx'
```

### Step 2: Translate by subdirectory

Process in this order for efficiency:

**Batch 1: data/calendar** (~5 files)
- Translate Calendar-related files
- Build/test

**Batch 2: data/kanban** (~8 files)
- Largest single component group
- Build/test

**Batch 3: data/list** (~8 files)
- Build/test

**Batch 4: data/other** (~9 files)
- Remaining data components
- Build/test

**Batch 5: display** (~15 files)
- All display components
- Build/test

**Batch 6: input** (~20 files)
- All input components
- Build/test

**Batch 7: layout** (~15 files)
- All layout components
- Build/test

### Step 3: Verify

```bash
grep -rn '[가-힣]' packages/solid/src/components/ --include='*.ts' --include='*.tsx' | grep -v 'throw\|console\.\|alert('
```

Expected: Only string literals with Korean remain (handled in Phase 2).

### Step 4: Build

```bash
pnpm build solid
```

### Step 5: Test

```bash
pnpm vitest packages/solid/tests/ --run
```

### Step 6: Commit

```bash
git add packages/solid/src/components/
git commit -m "refactor: convert Korean comments to English in solid components"
```

---

## Translation Glossary (solid UI context)

| Korean | English |
|--------|---------|
| 컴포넌트 | Component |
| 요소 | Element |
| 속성 | Property |
| 프로퍼티 | Property |
| 상태 | State |
| 컨텍스트 | Context |
| 프로바이더 | Provider |
| 렌더링 | Rendering |
| 렌더 | Render |
| 이벤트 | Event |
| 핸들러 | Handler |
| 콜백 | Callback |
| 훅 | Hook |
| 스타일 | Style |
| 클래스 | Class |
| 스타일링 | Styling |
| 선택 | Selection |
| 포커스 | Focus |
| 활성화 | Active |
| 비활성화 | Disabled |
| 숨김 | Hidden |
| 보기 | Visible |
| 열기 | Open |
| 닫기 | Close |
| 스크롤 | Scroll |
| 드래그 | Drag |
| 드롭 | Drop |
| 리스트 | List |
| 아이템 | Item |
| 테이블 | Table |
| 행 | Row |
| 열 | Column |
| 셀 | Cell |
| 헤더 | Header |
| 푸터 | Footer |
| 사이드바 | Sidebar |
| 네비게이션 | Navigation |
| 메뉴 | Menu |
| 다이얼로그 | Dialog |
| 모달 | Modal |
| 팝업 | Popup |
| 툴팁 | Tooltip |
| 태그 | Tag |
| 배지 | Badge |
| 아이콘 | Icon |
| 라벨 | Label |
| 입력 | Input |
| 버튼 | Button |
| 링크 | Link |
| 폼 | Form |
| 필드 | Field |
| 밸류 | Value |
| 변경 | Change |
| 선택됨 | Selected |
| 체크됨 | Checked |
| 정렬 | Sort |
| 필터 | Filter |
| 그룹화 | Group |
| 페이지 | Page |
| 페이징 | Pagination |
| 검색 | Search |
| 로딩 | Loading |
| 에러 | Error |
| 경고 | Warning |
| 성공 | Success |
| 정보 | Information |
| 강조 | Emphasis |
| 호버 | Hover |
| 방문됨 | Visited |
| 제약 | Constraint |
| 반응형 | Responsive |
| 크기 | Size |
| 패딩 | Padding |
| 마진 | Margin |
| 정렬 | Alignment |
| 흐름 | Flow |
| 위치 | Position |
| 깊이 | Depth |
| 지연 | Delay |
| 애니메이션 | Animation |
| 전환 | Transition |

---

## Notes

1. **Calendar component**: Has Korean day names in constants. Keep `["일", "월", ...]` constants, but translate surrounding comments. (Will revisit in Phase 5)

2. **Kanban is complex**: This is a large, feature-rich component with many interactions. Take time to understand the logic. Multiple files related to selection, drag-drop, etc.

3. **Consistency**: UI term translations should match across all components (e.g., always "selection" not "select", "dialog" not "modal" unless that's the actual component name).

4. **JSX strings**: Don't confuse comments with JSX text content. Only translate comments in `{/* comment */}` or `//` lines, not string content in JSX like `<button>Delete</button>`.

5. **Work pace**: This is a large batch (~80 files). Plan 3-4 focused sessions. Can work in parallel with other phases.

---

## Success Criteria

- ✅ All Korean comments translated to English in solid/src/components/
- ✅ All Korean region labels translated
- ✅ All Korean JSDoc translated
- ✅ Korean day constants in Calendar preserved
- ✅ String literals (in JSX, error messages) left unchanged (Phase 2)
- ✅ `pnpm build solid` passes
- ✅ `pnpm vitest packages/solid/tests/ --run` passes
- ✅ Single commit with all changes

