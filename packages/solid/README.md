# @simplysm/solid

SolidJS + Tailwind CSS 기반 엔터프라이즈 UI 컴포넌트 라이브러리. 폼 컨트롤, 데이터 테이블, 다이얼로그, 알림, 테마, i18n, CRUD, 권한 관리 등 100+ 컴포넌트를 제공한다.

## 설치

```bash
npm install @simplysm/solid
```

**주요 의존성:** SolidJS, @solidjs/router, Tailwind CSS 3, Tiptap, Tabler Icons
**선택 의존성:** echarts (ECharts 차트 사용 시)

## 문서

| 카테고리 | 설명 |
|---------|------|
| [폼 컨트롤](docs/form-controls.md) | TextInput, NumberInput, Select, Combobox, DatePicker, DateRangePicker, Checkbox, RadioGroup, CheckboxGroup, ColorPicker, RichTextEditor, Numpad, StatePreset 등 |
| [레이아웃 & 데이터](docs/layout-data.md) | FormGroup, FormTable, Sidebar, Topbar, Table, DataSheet, List, Calendar, Kanban, Pagination 등 |
| [디스플레이 & 피드백](docs/display-feedback.md) | Card, Alert, Icon, Link, Tag, Barcode, Echarts, Dialog, Dropdown, Collapse, Tabs, Notification, Busy, Progress, Print 등 |
| [프로바이더 & 훅](docs/providers-hooks.md) | SystemProvider, ThemeProvider, I18nProvider, SharedDataProvider, useDialog, useBusy, useNotification, createAppStructure 등 |
| [기능 컴포넌트](docs/features.md) | CrudSheet, CrudDetail, DataSelectButton, SharedDataSelect, SharedDataSelectButton, SharedDataSelectList, PermissionTable, AddressSearch 등 |

## 빠른 시작

### SystemProvider (권장)

`SystemProvider`는 모든 필수 프로바이더를 한 번에 감싸는 편의 컴포넌트다.

```tsx
import { SystemProvider } from "@simplysm/solid";

function App() {
  return (
    <SystemProvider clientName="my-app" busyVariant="spinner">
      <MyPage />
    </SystemProvider>
  );
}
```

내부적으로 다음 프로바이더를 순서대로 감싼다:
`ConfigProvider` > `I18nProvider` > `SyncStorageProvider` > `LoggerProvider` > `NotificationProvider` > `ErrorLoggerProvider` > `PwaUpdateProvider` > `ClipboardProvider` > `ThemeProvider` > `ServiceClientProvider` > `SharedDataProvider` > `BusyProvider`

### 개별 프로바이더 조합

```tsx
import { ThemeProvider, I18nProvider, NotificationProvider, BusyProvider } from "@simplysm/solid";

function App() {
  return (
    <ThemeProvider>
      <I18nProvider>
        <NotificationProvider>
          <BusyProvider>
            <MyPage />
          </BusyProvider>
        </NotificationProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
```

### 기본 폼 예제

```tsx
import { createSignal } from "solid-js";
import { Card, FormGroup, TextInput, Select, Button } from "@simplysm/solid";

function MyPage() {
  const [name, setName] = createSignal("");
  const [role, setRole] = createSignal<string>();

  return (
    <Card>
      <FormGroup>
        <FormGroup.Item label="이름">
          <TextInput value={name()} onValueChange={setName} required />
        </FormGroup.Item>
        <FormGroup.Item label="역할">
          <Select
            value={role()}
            onValueChange={setRole}
            items={["admin", "user", "guest"]}
            renderValue={(item) => <span>{item}</span>}
          />
        </FormGroup.Item>
      </FormGroup>
      <Button theme="primary" onClick={() => save()}>저장</Button>
    </Card>
  );
}
```

## 공통 타입

### ComponentSize

모든 폼 컨트롤과 대부분의 컴포넌트가 `size` prop을 지원한다.

```typescript
type ComponentSize = "xs" | "sm" | "md" | "lg" | "xl";
```

### SemanticTheme

의미론적 색상 테마.

```typescript
type SemanticTheme = "base" | "primary" | "success" | "warning" | "danger" | "info";
```

### 스타일 유틸리티

Tailwind 클래스 프리셋. 테마 일관성을 위해 사용한다.

```typescript
import { bg, border, text, pad, gap, themeTokens } from "@simplysm/solid";

// 배경색
bg.surface   // 흰색 / 다크: base-900
bg.muted     // base-100 / 다크: base-800
bg.subtle    // base-200 / 다크: base-700

// 테두리색
border.default  // base-200 / 다크: base-700

// 텍스트색
text.default     // base-900 / 다크: base-100
text.muted       // base-400 / 다크: base-500
text.placeholder // placeholder 전용

// 패딩/갭 프리셋
pad.md  // px-2 py-1
gap.md  // gap-1

// 테마 토큰 (semantic theme별 solid/light/text/hoverBg/border)
themeTokens.primary.solid    // bg-primary-500 text-white
themeTokens.danger.text      // text-danger-600 dark:text-danger-400
```

### 라이트/다크 테마

`ThemeProvider`와 `useTheme()` 훅으로 라이트/다크/시스템 모드를 제어한다. localStorage에 설정이 자동 저장된다.
