# @simplysm/solid

ERP, MES 등 기업용 백오피스 애플리케이션을 위한 SolidJS UI 컴포넌트 라이브러리. 데이터 중심의 폼, 테이블, 사이드바 레이아웃 등 관리 화면에 필요한 컴포넌트를 제공하며, Tailwind CSS 스타일링, 다크 모드, 반응형 레이아웃을 지원합니다.

## 설치

```bash
pnpm add @simplysm/solid
```

**Peer Dependencies:**
- `solid-js` ^1.9
- `tailwindcss` ^3.4

## 설정

### Tailwind CSS

```typescript
// tailwind.config.ts
import simplysmPreset from "@simplysm/solid/tailwind.config";

export default {
  darkMode: "class",
  presets: [simplysmPreset],
  content: [
    "./src/**/*.{ts,tsx}",
    ...simplysmPreset.content,
  ],
};
```

### Provider 설정

```tsx
import { ConfigContext, ThemeProvider } from "@simplysm/solid";

function App() {
  return (
    <ConfigContext.Provider value={{ clientName: "my-app" }}>
      <ThemeProvider>
        {/* 앱 내용 */}
      </ThemeProvider>
    </ConfigContext.Provider>
  );
}
```

### 기본 CSS

```typescript
// entry point (예: index.tsx)
import "@simplysm/solid/base.css";
```

## 컴포넌트

### Form Control

#### Button

```tsx
import { Button } from "@simplysm/solid";

<Button theme="primary" variant="solid">확인</Button>
<Button theme="danger" variant="outline" size="sm">삭제</Button>
<Button variant="ghost">취소</Button>
```

| Prop | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `theme` | `"primary" \| "info" \| "success" \| "warning" \| "danger" \| "base"` | `"base"` | 색상 테마 |
| `variant` | `"solid" \| "outline" \| "ghost"` | `"outline"` | 스타일 변형 |
| `size` | `"sm" \| "lg"` | - | 크기 |
| `inset` | `boolean` | - | 인셋 스타일 |

#### TextField

```tsx
import { TextField } from "@simplysm/solid";

<TextField value={name()} onValueChange={setName} placeholder="이름 입력" />
<TextField type="password" />
<TextField format="XXX-XXXX-XXXX" />
```

| Prop | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `value` | `string` | `""` | 입력 값 |
| `onValueChange` | `(value: string) => void` | - | 값 변경 콜백 |
| `type` | `"text" \| "password" \| "email"` | `"text"` | 입력 타입 |
| `format` | `string` | - | 입력 포맷 (예: `"XXX-XXXX-XXXX"`) |
| `size` | `"sm" \| "lg"` | - | 크기 |
| `disabled` | `boolean` | - | 비활성화 |
| `readonly` | `boolean` | - | 읽기 전용 |
| `error` | `boolean` | - | 에러 상태 |
| `inset` | `boolean` | - | 인셋 스타일 |

#### NumberField / DateField / DateTimeField / TimeField

TextField와 동일한 패턴으로 숫자, 날짜, 날짜시간, 시간 입력을 지원합니다.

#### Select

```tsx
import { Select } from "@simplysm/solid";

// items 방식
<Select
  items={["사과", "바나나", "딸기"]}
  value={fruit()}
  onValueChange={setFruit}
  placeholder="과일 선택"
/>

// children 방식 (Compound Components)
<Select value={fruit()} onValueChange={setFruit} renderValue={(v) => v}>
  <Select.Item value="사과">사과</Select.Item>
  <Select.Item value="바나나">바나나</Select.Item>
</Select>

// 다중 선택
<Select items={options} value={selected()} onValueChange={setSelected} multiple />
```

| Prop | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `value` | `T \| T[]` | - | 선택 값 |
| `onValueChange` | `(value: T \| T[]) => void` | - | 값 변경 콜백 |
| `items` | `T[]` | - | 항목 배열 (items 방식) |
| `multiple` | `boolean` | - | 다중 선택 |
| `placeholder` | `string` | - | 플레이스홀더 |
| `renderValue` | `(value: T) => JSX.Element` | - | 값 렌더링 함수 |
| `disabled` | `boolean` | - | 비활성화 |

#### ColorPicker

색상 선택 컴포넌트.

#### ThemeToggle

다크/라이트/시스템 테마 토글 버튼.

### Display

#### Card

```tsx
import { Card } from "@simplysm/solid";

<Card>카드 내용</Card>
```

#### Label

```tsx
import { Label } from "@simplysm/solid";

<Label theme="primary">라벨</Label>
<Label theme="danger">에러</Label>
```

| Prop | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `theme` | `"primary" \| "info" \| "success" \| "warning" \| "danger" \| "base"` | `"base"` | 색상 테마 |

#### Note

```tsx
import { Note } from "@simplysm/solid";

<Note theme="info">안내 메시지</Note>
<Note theme="warning">주의 사항</Note>
```

| Prop | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `theme` | `"primary" \| "info" \| "success" \| "warning" \| "danger" \| "base"` | `"base"` | 색상 테마 |

#### Icon

```tsx
import { Icon } from "@simplysm/solid";
import { IconCheck } from "@tabler/icons-solidjs";

<Icon icon={IconCheck} />
<Icon icon={IconCheck} size="2em" />
```

| Prop | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `icon` | `Component` | - | Tabler icon 컴포넌트 |
| `size` | `string \| number` | `"1.25em"` | 아이콘 크기 |

### Layout

#### SidebarContainer / Sidebar

```tsx
import { SidebarContainer, Sidebar, SidebarMenu, SidebarUser } from "@simplysm/solid";

<SidebarContainer>
  <Sidebar>
    <SidebarUser name="홍길동" description="관리자" />
    <SidebarMenu items={menuItems} />
  </Sidebar>
  <main>{/* 메인 콘텐츠 */}</main>
</SidebarContainer>
```

반응형: 520px 미만에서 자동으로 모바일 UI (backdrop + 오버레이). 열림/닫힘 상태는 localStorage에 저장됩니다.

#### Topbar / TopbarContainer

상단 네비게이션 바. Sidebar와 동일한 Compound Components 패턴.

#### FormGroup

```tsx
import { FormGroup } from "@simplysm/solid";

<FormGroup>
  <FormGroup.Item label="이름">
    <TextField value={name()} onValueChange={setName} />
  </FormGroup.Item>
  <FormGroup.Item label="이메일">
    <TextField type="email" value={email()} onValueChange={setEmail} />
  </FormGroup.Item>
</FormGroup>

// 인라인 모드
<FormGroup inline>
  <FormGroup.Item label="검색">
    <TextField />
  </FormGroup.Item>
</FormGroup>
```

#### FormTable

폼 테이블 레이아웃 컴포넌트.

### Data

#### Table

```tsx
import { Table } from "@simplysm/solid";

<Table>
  <thead><tr><th>이름</th><th>나이</th></tr></thead>
  <tbody><tr><td>홍길동</td><td>30</td></tr></tbody>
</Table>
```

| Prop | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `inset` | `boolean` | - | 인셋 스타일 |
| `inline` | `boolean` | - | 인라인 스타일 |

#### List / ListItem

```tsx
import { List, ListItem } from "@simplysm/solid";

<List>
  <ListItem>항목 1</ListItem>
  <ListItem>항목 2</ListItem>
</List>
```

키보드 네비게이션 지원 (Arrow, Space/Enter, Home/End).

### Disclosure

#### Collapse

```tsx
import { Collapse } from "@simplysm/solid";

<Collapse open={expanded()}>
  <p>접히는 내용</p>
</Collapse>
```

| Prop | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `open` | `boolean` | `false` | 열림 여부 |

#### Dropdown

```tsx
import { Dropdown } from "@simplysm/solid";

let triggerRef!: HTMLButtonElement;

<button ref={triggerRef}>열기</button>
<Dropdown triggerRef={() => triggerRef} open={open()} onOpenChange={setOpen}>
  <p>드롭다운 내용</p>
</Dropdown>
```

| Prop | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `triggerRef` | `() => HTMLElement` | - | 트리거 요소 참조 |
| `position` | `{ x: number; y: number }` | - | 절대 위치 (triggerRef와 택일) |
| `open` | `boolean` | - | 열림 상태 |
| `onOpenChange` | `(open: boolean) => void` | - | 상태 변경 콜백 |
| `maxHeight` | `number` | `300` | 최대 높이 (px) |

### Feedback

#### Notification

```tsx
import { NotificationProvider, NotificationBanner, NotificationBell } from "@simplysm/solid";

<NotificationProvider>
  <NotificationBanner />
  <header>
    <NotificationBell />
  </header>
  <MyApp />
</NotificationProvider>
```

Context를 통해 알림을 관리합니다:

```tsx
import { useNotification } from "@simplysm/solid";

const notification = useNotification();
notification.info("알림", "작업이 완료되었습니다.");
notification.success("성공", "저장되었습니다.");
notification.warning("경고", "주의가 필요합니다.");
notification.danger("오류", "문제가 발생했습니다.");
```

## Context & Hooks

### useTheme

```tsx
import { useTheme } from "@simplysm/solid";

const theme = useTheme();
theme.mode();          // "light" | "dark" | "system"
theme.resolvedTheme(); // "light" | "dark"
theme.setMode("dark");
theme.cycleMode();     // light → system → dark → light
```

### usePersisted

```tsx
import { usePersisted } from "@simplysm/solid";

const [value, setValue] = usePersisted("key", defaultValue);
```

localStorage 기반 영속 시그널.

### createPropSignal

```tsx
import { createPropSignal } from "@simplysm/solid";

const [value, setValue] = createPropSignal({
  value: () => props.value,
  onChange: () => props.onValueChange,
});
```

Controlled/Uncontrolled 패턴을 자동으로 처리하는 signal hook.

## Directives

### ripple

```tsx
import { ripple } from "@simplysm/solid";
// directive 등록을 위한 참조 유지
void ripple;

<button use:ripple={true}>클릭</button>
<button use:ripple={!props.disabled}>클릭</button>
```

Material Design ripple 효과. `prefers-reduced-motion` 감지하여 자동 비활성화.

## Tailwind 테마

### 시맨틱 색상

| 이름 | 기반 색상 | 용도 |
|------|-----------|------|
| `primary` | blue | 주요 액션 |
| `info` | cyan | 정보 |
| `success` | emerald | 성공 |
| `warning` | amber | 경고 |
| `danger` | red | 위험/에러 |
| `base` | zinc | 중립 (배경, 테두리 등) |

### 커스텀 크기

- `h-field` / `size-field`: 기본 필드 높이
- `h-field-sm` / `size-field-sm`: 작은 필드 높이
- `h-field-lg` / `size-field-lg`: 큰 필드 높이

### z-index 계층

- `z-sidebar`: 100
- `z-sidebar-backdrop`: 99
- `z-dropdown`: 1000

## 데모

`solid-demo` 패키지에서 모든 컴포넌트의 실제 사용 예시를 확인할 수 있습니다:

```bash
pnpm watch solid solid-demo
# http://localhost:40080
```

## 라이선스

MIT
