# Solid 패키지 폴더 구조 개선 설계

## 목표

현재 9개로 세분화된 컴포넌트 카테고리를 6개의 직관적인 대분류로 재구성하여 폴더 탐색을 용이하게 한다.

## 새로운 카테고리 구조

| 카테고리         | 컴포넌트                                        | 역할                 |
| ---------------- | ----------------------------------------------- | -------------------- |
| **form-control** | Button, Select                                  | 사용자 입력/상호작용 |
| **layout**       | FormGroup, FormTable, Sidebar, Topbar, Collapse | 페이지 구조/배치     |
| **data**         | Table, List                                     | 데이터 표시          |
| **display**      | Icon, Label, Note, Card                         | 정보 표시 UI         |
| **overlay**      | Dropdown                                        | 오버레이/팝업        |
| **feedback**     | Notification                                    | 알림/피드백          |

## 파일 배치 규칙

- **단일 파일 컴포넌트**: 카테고리 폴더에 직접 배치 (예: `form-control/Button.tsx`)
- **복합 컴포넌트 (여러 파일)**: 하위 폴더로 그룹화 (예: `form-control/select/Select.tsx`)
- **폴더 이름**: kebab-case 사용

## 새로운 폴더 구조

```
packages/solid/src/
├── index.ts
├── base.css
├── components/
│   ├── form-control/
│   │   ├── Button.tsx
│   │   └── select/
│   │       ├── Select.tsx
│   │       ├── SelectItem.tsx
│   │       └── SelectContext.ts
│   │
│   ├── layout/
│   │   ├── Collapse.tsx
│   │   ├── FormGroup.tsx
│   │   ├── FormTable.tsx
│   │   ├── sidebar/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── SidebarContainer.tsx
│   │   │   ├── SidebarContext.ts
│   │   │   ├── SidebarMenu.tsx
│   │   │   └── SidebarUser.tsx
│   │   └── topbar/
│   │       ├── Topbar.tsx
│   │       ├── TopbarContainer.tsx
│   │       ├── TopbarMenu.tsx
│   │       └── TopbarUser.tsx
│   │
│   ├── data/
│   │   ├── Table.tsx
│   │   └── list/
│   │       ├── List.tsx
│   │       ├── ListItem.tsx
│   │       └── ListContext.ts
│   │
│   ├── display/
│   │   ├── Card.tsx
│   │   ├── Icon.tsx
│   │   ├── Label.tsx
│   │   └── Note.tsx
│   │
│   ├── overlay/
│   │   └── Dropdown.tsx
│   │
│   └── feedback/
│       └── notification/
│           ├── NotificationBanner.tsx
│           ├── NotificationBell.tsx
│           ├── NotificationContext.ts
│           ├── NotificationProvider.tsx
│           └── index.ts
│
├── contexts/           # 유지
├── directives/         # 유지
├── hooks/              # 유지
└── utils/              # 유지
```

## 마이그레이션 작업

### 1. packages/solid/src/components/ 폴더 구조 변경

| 기존                      | 신규                                  |
| ------------------------- | ------------------------------------- |
| `controls/Button.tsx`     | `form-control/Button.tsx`             |
| `form/select/*`           | `form-control/select/*`               |
| `navigation/*`            | `layout/sidebar/*`, `layout/topbar/*` |
| `disclosure/Collapse.tsx` | `layout/Collapse.tsx`                 |
| `data/List*.tsx`          | `data/list/*`                         |
| `layout/*`                | `layout/*` (유지)                     |
| `display/*`               | `display/*` (유지)                    |
| `notification/*`          | `feedback/notification/*`             |
| `overlay/Dropdown.tsx`    | `overlay/Dropdown.tsx` (유지)         |

### 2. packages/solid/src/index.ts 경로 수정

```typescript
// form-control
export * from "./components/form-control/Button";
export * from "./components/form-control/select/Select";

// layout
export * from "./components/layout/Collapse";
export * from "./components/layout/FormGroup";
export * from "./components/layout/FormTable";
export * from "./components/layout/sidebar/Sidebar";
export * from "./components/layout/topbar/Topbar";

// data
export * from "./components/data/Table";
export * from "./components/data/list/List";

// display
export * from "./components/display/Card";
export * from "./components/display/Icon";
export * from "./components/display/Label";
export * from "./components/display/Note";

// overlay
export * from "./components/overlay/Dropdown";

// feedback
export * from "./components/feedback/notification";
```

### 3. packages/solid-demo 변경

#### 라우터 (main.tsx)

| 기존 경로                   | 신규 경로                   |
| --------------------------- | --------------------------- |
| `/home/controls/button`     | `/home/form-control/button` |
| `/home/form/select`         | `/home/form-control/select` |
| `/home/disclosure/collapse` | `/home/layout/collapse`     |
| `/home/navigation/sidebar`  | `/home/layout/sidebar`      |
| `/home/navigation/topbar`   | `/home/layout/topbar`       |

#### 메뉴 (Home.tsx menuItems)

| 기존       | 신규                  |
| ---------- | --------------------- |
| Controls   | Form Control          |
| Form       | (Form Control에 병합) |
| Disclosure | (Layout에 병합)       |
| Navigation | (Layout에 병합)       |

#### 페이지 폴더 (pages/)

| 기존                          | 신규                          |
| ----------------------------- | ----------------------------- |
| `controls/ButtonPage.tsx`     | `form-control/ButtonPage.tsx` |
| `form/SelectPage.tsx`         | `form-control/SelectPage.tsx` |
| `disclosure/CollapsePage.tsx` | `layout/CollapsePage.tsx`     |
| `navigation/*Page.tsx`        | `layout/*Page.tsx`            |

### 4. 검증

```bash
pnpm lint packages/solid packages/solid-demo
pnpm typecheck packages/solid packages/solid-demo
```

## 외부 API 영향

- 외부 사용자는 `@simplysm/solid`에서 import하므로 **외부 API는 변경 없음**
- 내부 상대 경로 import만 수정 필요
