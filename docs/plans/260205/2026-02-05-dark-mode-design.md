# 다크 모드 UI 디자인 개선

## 개요

solid 패키지의 다크 모드 UI를 개선하여 블루 틴트 다크 테마를 적용하고, 디자인 시스템 일관성을 향상시킨다.

## 디자인 원칙

1. **블루 틴트 다크 (slate 계열)**: 차갑고 모던한 느낌
2. **강조색 채도 향상**: 다크 모드에서 primary 색상을 더 밝고 선명하게
3. **역할별 색상 분리**:
   - 레이아웃 컴포넌트 (Sidebar, Topbar 등): `slate` 계열
   - 폼 컨트롤 (Button, Select 등): `neutral` 계열

## 색상 명세

### 1. 기본 색상 (Background)

| 용도           | 라이트 모드 | 다크 모드     |
| -------------- | ----------- | ------------- |
| 페이지 배경    | `white`     | `slate-900`   |
| 사이드바 배경  | `gray-100`  | `slate-800`   |
| 카드/패널 배경 | `white`     | `slate-800`   |
| 드롭다운 배경  | `white`     | `neutral-800` |

### 2. 테두리 (Border)

| 용도            | 라이트 모드   | 다크 모드     |
| --------------- | ------------- | ------------- |
| 사이드바 테두리 | `gray-200`    | `slate-700`   |
| 입력필드 테두리 | `neutral-300` | `neutral-600` |
| 드롭다운 테두리 | `neutral-200` | `neutral-700` |

### 3. 텍스트 (Text)

| 용도        | 라이트 모드   | 다크 모드     |
| ----------- | ------------- | ------------- |
| 기본 텍스트 | `gray-900`    | `slate-100`   |
| 보조 텍스트 | `gray-500`    | `slate-400`   |
| placeholder | `neutral-400` | `neutral-500` |

### 4. 강조색 (Primary)

| 상태           | 라이트 모드   | 다크 모드     |
| -------------- | ------------- | ------------- |
| solid 배경     | `primary-500` | `primary-500` |
| solid hover    | `primary-600` | `primary-400` |
| outline 텍스트 | `primary-600` | `primary-400` |
| outline 테두리 | `primary-300` | `primary-600` |
| focus ring     | `primary-500` | `primary-400` |

### 5. Gray 버튼 (slate 계열로 변경)

| 상태           | 라이트 모드   | 다크 모드   |
| -------------- | ------------- | ----------- |
| solid 배경     | `neutral-600` | `slate-600` |
| solid hover    | `neutral-700` | `slate-500` |
| outline 텍스트 | `neutral-600` | `slate-300` |
| outline 테두리 | `neutral-300` | `slate-600` |

## 컴포넌트별 변경 사항

### base.css

- `html.dark`: `bg-gray-950` → `bg-slate-900`
- `text-gray-100` → `text-slate-100`
- 스크롤바 색상 slate 계열로 변경

### 레이아웃 컴포넌트

- **Sidebar.tsx**: `bg-gray-900` → `bg-slate-800`, 테두리 `slate-700`
- **SidebarMenu.tsx**: 선택/hover 색상 slate 계열
- **SidebarUser.tsx**: 텍스트 및 아바타 색상 slate 계열
- **Topbar.tsx**: 배경 및 텍스트 slate 계열

### 폼 컨트롤

- **Button.tsx**: gray 테마 slate 계열로, semantic 색상 채도 향상
- **Select.tsx**: focus 색상 `primary-400`
- **ThemeToggle.tsx**: hover 색상 slate 계열

### 데이터/피드백

- **Card.tsx**: `bg-gray-900` → `bg-slate-800`
- **Dropdown.tsx**: 그림자 강화 `shadow-black/30`
- **List.tsx**: hover/선택 색상 조정

## 구현 순서

1. base.css 수정
2. 레이아웃 컴포넌트 (Sidebar, Topbar)
3. 폼 컨트롤 (Button, Select, ThemeToggle)
4. 데이터/피드백 (Card, Dropdown, List)
5. 기타 컴포넌트
