# PermissionTable 설계

> 작성일: 2026-02-10

## 개요

계층형 권한 트리를 테이블로 표시하고, 각 항목에 확장 가능한 권한 타입 체크박스를 제공하는 순수 UI 컴포넌트.

## 데이터 구조

```typescript
interface PermissionItem<TModule = string> {
  title: string;
  href?: string; // "/user/permission"
  modules?: TModule[]; // 표시 조건 모듈
  perms?: string[]; // ["use", "edit", "approve"] 확장 가능
  children?: PermissionItem<TModule>[];
}
```

- SidebarMenuItem과 동일한 `href` + `children` 트리 패턴
- 그룹 노드: `children`만 있고 `perms` 없음

### 권한 키 형식

`href + "/" + perm` → 경로 스타일 통일

```
href="/user/permission" + perm="use" → "/user/permission/use"
```

권한 상태: `Record<string, boolean>`

```typescript
{
  "/user/permission/use": true,
  "/user/permission/edit": false,
}
```

## 컴포넌트 API

```tsx
<PermissionTable
  items={permissionItems} // PermissionItem[]
  value={permRecord()} // Record<string, boolean>
  onValueChange={setPermRecord} // (value: Record<string, boolean>) => void
  modules={activeModules()} // TModule[] — 활성 모듈 목록
  disabled={false} // 전체 비활성화
/>
```

## 동작 규칙

1. **modules 필터링**: `modules` prop이 있으면, 아이템의 `modules`와 교차가 없는 행은 숨김
2. **Cascading down**: 상위 체크 → 하위 전부 체크, 상위 해제 → 하위 전부 해제
3. **첫 번째 perm이 기본 권한**: `perms[0]` (예: `"use"`)이 해제되면 나머지 (`"edit"` 등)도 자동 해제 + 비활성화

## 테이블 렌더링

```
┌──────────────────────────┬───────┬───────┬─────────┐
│ 권한 항목                 │  use  │  edit │ approve │
├──────────────────────────┼───────┼───────┼─────────┤
│ ▾ 사용자 관리             │  ☑    │  ☑   │         │
│   ├ 권한 설정             │  ☑    │  ☐   │   ☑    │
│   └ 사용자 목록           │  ☑    │  ☑   │         │
│ ▸ 시스템 설정             │  ☐    │  ☐   │         │
└──────────────────────────┴───────┴───────┴─────────┘
```

- **헤더 열**: 모든 아이템의 `perms`를 합쳐서 고유한 perm 타입 목록 → 열로 표시
- **트리 행**: `<For>`로 재귀 렌더링, depth에 따라 `padding-left` 들여쓰기
- **접기/펼치기**: children 있는 행에 화살표 아이콘 + `<Show>`로 토글
- **셀**: 해당 아이템에 perm이 없으면 빈 칸, 있으면 CheckBox
- 자체 `<table>` 마크업 사용 (기존 Table 컴포넌트 미사용)

## 파일 구조

```
packages/solid/src/components/data/permission-table/
  ├── PermissionTable.tsx         // 메인 컴포넌트 + PermissionItem 타입 export
  ├── PermissionTable.styles.ts   // 스타일 클래스
  └── PermissionTableRow.tsx      // 재귀 행 렌더링 (내부, export 안 함)
```

- `index.ts`에서 `PermissionTable`과 `PermissionItem` 타입만 export
- compound component 패턴 미사용 (서브 컴포넌트 불필요)
