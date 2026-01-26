# @simplysm/solid

심플리즘 프레임워크의 SolidJS UI 컴포넌트 패키지이다.

## 설치

```bash
npm install @simplysm/solid
# 또는
pnpm add @simplysm/solid
```

## 설정

### 스타일 import

애플리케이션 엔트리 포인트에서 스타일 파일을 import한다:

```typescript
import "@simplysm/solid/styles.css";
```

### Tailwind CSS 설정 (v4)

프로젝트의 CSS 파일에서 `@source` 지시문을 사용하여 이 패키지의 컴포넌트를 포함한다:

```css
@source "./node_modules/@simplysm/solid/dist/**/*.js";
```

## 사용법

```tsx
import { SdButton } from "@simplysm/solid";

function App() {
  return (
    <div>
      <SdButton>기본 버튼</SdButton>
      <SdButton theme="primary">Primary 버튼</SdButton>
      <SdButton theme="link-primary">Link Primary 버튼</SdButton>
      <SdButton size="sm">작은 버튼</SdButton>
      <SdButton inset>Inset 버튼</SdButton>
    </div>
  );
}
```

## 컴포넌트

### SdButton

버튼 컴포넌트이다.

| Prop | 기본값 | 설명 |
|------|--------|------|
| `theme` | `"default"` | 색상 테마. filled: `"default"` \| `"primary"` \| `"secondary"` \| `"info"` \| `"success"` \| `"warning"` \| `"danger"` \| `"gray"` \| `"slate"`, link: `"link-primary"` \| `"link-secondary"` \| `"link-info"` \| `"link-success"` \| `"link-warning"` \| `"link-danger"` \| `"link-gray"` \| `"link-slate"` |
| `size` | `"default"` | 크기. `"default"` \| `"sm"` \| `"lg"` |
| `inset` | `false` | 부모 요소에 삽입되는 형태. 테두리와 라운드를 제거한다. theme이 미지정이거나 'default'인 경우 link-primary가 자동 적용된다. |

HTML `<button>` 요소의 모든 표준 속성을 지원한다.

### SdAnchor

앵커(링크 스타일) 컴포넌트이다. `<a>` 태그 대신 `<span>` 요소를 사용한다.

| Prop | 기본값 | 설명 |
|------|--------|------|
| `theme` | `"primary"` | 색상 테마. `"primary"` \| `"secondary"` \| `"info"` \| `"success"` \| `"warning"` \| `"danger"` \| `"gray"` \| `"slate"` |
| `disabled` | `false` | 비활성화 상태 |

### SdCheckbox

체크박스 컴포넌트이다.

```tsx
import { SdCheckbox } from "@simplysm/solid";
import { createSignal } from "solid-js";

function Example() {
  const [checked, setChecked] = createSignal(false);

  return (
    <>
      {/* Uncontrolled */}
      <SdCheckbox defaultValue={false} onChange={(v) => console.log(v)}>
        동의합니다
      </SdCheckbox>

      {/* Controlled */}
      <SdCheckbox value={checked()} onChange={setChecked}>
        동의합니다
      </SdCheckbox>
    </>
  );
}
```

| Prop | 기본값 | 설명 |
|------|--------|------|
| `value` | - | 체크 상태 (controlled) |
| `defaultValue` | `false` | 초기 체크 상태 (uncontrolled) |
| `onChange` | - | 체크 상태 변경 콜백 |
| `canChangeFn` | - | 값 변경 전 호출되어 false 반환 시 변경 차단 |
| `icon` | `IconCheck` | 체크 아이콘 컴포넌트 |
| `disabled` | `false` | 비활성화 상태 |
| `size` | - | 크기. `"sm"` \| `"lg"` |
| `inline` | `false` | 인라인 스타일 |
| `inset` | `false` | 부모 요소에 삽입되는 형태 |
| `theme` | - | 테마 색상 |

### 필드 컴포넌트

입력 필드 컴포넌트들이다. 모두 Controlled/Uncontrolled 모드를 지원한다.

**공통 Props (BaseFieldProps):**

| Prop | 기본값 | 설명 |
|------|--------|------|
| `placeholder` | - | 플레이스홀더 텍스트 |
| `title` | - | 툴팁 텍스트 |
| `disabled` | `false` | 비활성화 상태 |
| `readonly` | `false` | 읽기 전용 상태 |
| `required` | `false` | 필수 입력 여부 |
| `size` | - | 크기. `"sm"` \| `"lg"` |
| `theme` | - | 테마 색상 |
| `inline` | `false` | 인라인 스타일 |
| `inset` | `false` | 부모 요소에 삽입되는 형태 |
| `inputStyle` | - | input 요소 커스텀 스타일 |
| `inputClass` | - | input 요소 커스텀 클래스 |

#### SdTextField

텍스트 필드 컴포넌트이다.

| Prop | 기본값 | 설명 |
|------|--------|------|
| `type` | `"text"` | 입력 타입. `"text"` \| `"password"` \| `"email"` |
| `value` | - | 값 (controlled) |
| `defaultValue` | - | 초기값 (uncontrolled) |
| `onChange` | - | 값 변경 콜백 |
| `minLength` | - | 최소 문자 길이 |
| `maxLength` | - | 최대 문자 길이 |
| `pattern` | - | 정규식 패턴 |
| `autocomplete` | - | 자동완성 설정 |

#### SdNumberField

숫자 필드 컴포넌트이다. 천단위 콤마를 자동으로 표시한다.

| Prop | 기본값 | 설명 |
|------|--------|------|
| `value` | - | 값 (controlled) |
| `defaultValue` | - | 초기값 (uncontrolled) |
| `onChange` | - | 값 변경 콜백 |
| `min` | - | 최소값 |
| `max` | - | 최대값 |
| `step` | - | 증감 단위 |
| `useComma` | `true` | 천단위 콤마 표시 여부 |
| `minDigits` | - | 최소 소수점 자릿수 |

#### SdDateField

날짜 필드 컴포넌트이다. DateOnly 타입을 사용한다.

| Prop | 기본값 | 설명 |
|------|--------|------|
| `type` | `"date"` | 날짜 타입. `"date"` \| `"month"` \| `"year"` |
| `value` | - | DateOnly 값 (controlled) |
| `defaultValue` | - | 초기값 (uncontrolled) |
| `onChange` | - | 값 변경 콜백 |
| `min` | - | 최소 날짜 |
| `max` | - | 최대 날짜 |

#### SdTimeField

시간 필드 컴포넌트이다. Time 타입을 사용한다.

| Prop | 기본값 | 설명 |
|------|--------|------|
| `type` | `"time"` | 시간 타입. `"time"` \| `"time-sec"` |
| `value` | - | Time 값 (controlled) |
| `defaultValue` | - | 초기값 (uncontrolled) |
| `onChange` | - | 값 변경 콜백 |

#### SdDateTimeField

날짜시간 필드 컴포넌트이다. DateTime 타입을 사용한다.

| Prop | 기본값 | 설명 |
|------|--------|------|
| `type` | `"datetime"` | 날짜시간 타입. `"datetime"` \| `"datetime-sec"` |
| `value` | - | DateTime 값 (controlled) |
| `defaultValue` | - | 초기값 (uncontrolled) |
| `onChange` | - | 값 변경 콜백 |

#### SdColorField

색상 선택 필드 컴포넌트이다. 브라우저의 기본 color picker를 사용한다.

| Prop | 기본값 | 설명 |
|------|--------|------|
| `value` | - | 색상 값 (hex 형식: #RRGGBB, controlled) |
| `defaultValue` | `"#000000"` | 초기값 (uncontrolled) |
| `onChange` | - | 값 변경 콜백 |

#### SdFormatField

포맷 필드 컴포넌트이다. 전화번호, 사업자등록번호 등 특정 포맷의 입력을 지원한다.

| Prop | 기본값 | 설명 |
|------|--------|------|
| `format` | 필수 | 포맷 문자열. X는 입력 문자, 그 외는 구분자. 예: `"XXX-XXXX-XXXX"` |
| `value` | - | 값 (구분자 제외 순수 값, controlled) |
| `defaultValue` | - | 초기값 (uncontrolled) |
| `onChange` | - | 값 변경 콜백 |

### SdList / SdListItem

리스트 컴포넌트이다.

```tsx
import { SdList, SdListItem } from "@simplysm/solid";

function Menu() {
  return (
    <SdList>
      <SdListItem onClick={() => console.log("클릭")}>메뉴 1</SdListItem>
      <SdListItem selected>메뉴 2 (선택됨)</SdListItem>
      <SdListItem
        layout="accordion"
        childList={
          <SdList inset>
            <SdListItem>하위 메뉴 1</SdListItem>
            <SdListItem>하위 메뉴 2</SdListItem>
          </SdList>
        }
      >
        접을 수 있는 메뉴
      </SdListItem>
    </SdList>
  );
}
```

**SdList Props:**

| Prop | 기본값 | 설명 |
|------|--------|------|
| `inset` | `false` | 투명 배경 적용 |

**SdListItem Props:**

| Prop | 기본값 | 설명 |
|------|--------|------|
| `layout` | `"accordion"` | 레이아웃 타입. `"accordion"` \| `"flat"` |
| `selected` | `false` | 선택 상태 |
| `readonly` | `false` | 읽기 전용 상태 |
| `open` | `false` | 열림 상태 (controlled) |
| `onOpenChange` | - | 열림 상태 변경 핸들러 |
| `childList` | - | 하위 리스트 (SdList 컴포넌트) |

### SdCollapse / SdCollapseIcon

아코디언 콘텐츠 컴포넌트이다.

```tsx
import { SdCollapse, SdCollapseIcon } from "@simplysm/solid";
import { createSignal } from "solid-js";

function Accordion() {
  const [open, setOpen] = createSignal(false);

  return (
    <div>
      <button onClick={() => setOpen((v) => !v)}>
        토글 <SdCollapseIcon open={open()} />
      </button>
      <SdCollapse open={open()}>
        <div>접히는 콘텐츠</div>
      </SdCollapse>
    </div>
  );
}
```

**SdCollapse Props:**

| Prop | 기본값 | 설명 |
|------|--------|------|
| `open` | `false` | 열림 상태 |
| `class` | - | 커스텀 클래스 |

**SdCollapseIcon Props:**

| Prop | 기본값 | 설명 |
|------|--------|------|
| `open` | `false` | 열림 상태 |
| `openRotate` | `90` | 열림 시 회전 각도 (deg) |
| `icon` | - | 커스텀 아이콘 |

### SdSidebar / SdSidebarContainer

사이드바 레이아웃 컴포넌트이다. 반응형으로 동작하며 데스크톱에서는 padding 방식, 모바일에서는 오버레이 방식으로 표시된다.

```tsx
import { SdSidebarContainer, SdSidebar } from "@simplysm/solid";

function Layout() {
  return (
    <SdSidebarContainer sidebarWidth="280px">
      <SdSidebar>
        <nav>사이드바 내용</nav>
      </SdSidebar>
      <main>메인 콘텐츠</main>
    </SdSidebarContainer>
  );
}
```

**SdSidebarContainer Props:**

| Prop | 기본값 | 설명 |
|------|--------|------|
| `defaultCollapsed` | `false` | 초기 접힘 상태 |
| `sidebarWidth` | `"250px"` | 사이드바 너비 |
| `class` | - | 커스텀 클래스 |

### SdSidebarMenu

사이드바 메뉴 컴포넌트이다. 계층형 메뉴를 지원한다.

```tsx
import { SdSidebarMenu, type SdSidebarMenuItem } from "@simplysm/solid";

const menus: SdSidebarMenuItem[] = [
  { title: "홈", codeChain: ["home"], icon: <IconHome /> },
  {
    title: "설정",
    codeChain: ["settings"],
    children: [
      { title: "일반", codeChain: ["settings", "general"] },
      { title: "보안", codeChain: ["settings", "security"] },
    ],
  },
];

function Sidebar() {
  return (
    <SdSidebarMenu
      menus={menus}
      isMenuSelected={(menu) => menu.codeChain[0] === "home"}
      onMenuClick={(menu) => console.log(menu.title)}
    />
  );
}
```

**SdSidebarMenu Props:**

| Prop | 기본값 | 설명 |
|------|--------|------|
| `menus` | 필수 | 메뉴 배열 (`SdSidebarMenuItem[]`) |
| `layout` | 자동 | 레이아웃 타입. `"accordion"` \| `"flat"`. 자식 메뉴가 있으면 accordion, 없을 경우 메뉴 3개 이하면 flat, 초과면 accordion |
| `isMenuSelected` | - | 메뉴 선택 여부 판단 함수 |
| `onMenuClick` | - | 메뉴 클릭 핸들러 |
| `autoCloseOnMobile` | `true` | 모바일에서 리프 메뉴 클릭 시 사이드바 자동 닫힘 |
| `class` | - | 커스텀 클래스 |

### SdSidebarUser

사이드바 사용자 영역 컴포넌트이다.

```tsx
import { SdSidebarUser } from "@simplysm/solid";

function UserArea() {
  return (
    <SdSidebarUser
      userMenu={{
        title: "내 계정",
        menus: [
          { title: "프로필", onClick: () => {} },
          { title: "로그아웃", onClick: () => {} },
        ],
      }}
    >
      <div>홍길동</div>
      <div>admin@example.com</div>
    </SdSidebarUser>
  );
}
```

**SdSidebarUser Props:**

| Prop | 기본값 | 설명 |
|------|--------|------|
| `userMenu` | - | 사용자 메뉴 드롭다운 설정 (`{ title: string, menus: { title: string, onClick: () => void }[] }`) |
| `class` | - | 커스텀 클래스 |

## 컨텍스트

### SdProvider

애플리케이션 전역 설정을 제공하는 Provider 컴포넌트이다. 클라이언트 앱 이름을 설정하여 localStorage 키 프리픽스 등에 사용한다.

```tsx
import { SdProvider } from "@simplysm/solid";

function App() {
  return (
    <SdProvider clientName="myapp">
      <MyApp />
    </SdProvider>
  );
}
```

| Prop | 기본값 | 설명 |
|------|--------|------|
| `clientName` | 필수 | 클라이언트 앱 이름 (localStorage 키 프리픽스로 사용) |

### useSd / useLocalStorage

`useSd`는 SdProvider의 컨텍스트에 접근하는 hook이다. SdProvider 외부에서도 사용 가능하며, 외부에서 호출 시 undefined를 반환한다.

`useLocalStorage`는 프리픽스가 적용된 localStorage 접근 객체를 반환하는 hook이다.

```tsx
import { useSd, useLocalStorage } from "@simplysm/solid";

function Component() {
  const sd = useSd();
  const storage = useLocalStorage();

  // storage.getItem("key") -> "myapp:key"로 접근
  // storage.setItem("key", "value") -> "myapp:key"로 저장
}
```

## 테마

### ThemeProvider

테마 컨텍스트를 제공하는 Provider 컴포넌트이다.

```tsx
import { ThemeProvider } from "@simplysm/solid";

function App() {
  return (
    <ThemeProvider defaultTheme="light">
      <MyApp />
    </ThemeProvider>
  );
}
```

| Prop | 기본값 | 설명 |
|------|--------|------|
| `defaultTheme` | 시스템 설정 또는 `"light"` | 초기 테마. `"light"` \| `"dark"` |

### useTheme

테마 상태에 접근하는 hook이다. ThemeProvider 내부에서만 사용 가능하다.

```tsx
import { useTheme } from "@simplysm/solid";

function ThemeToggle() {
  const { theme, setTheme, toggleTheme } = useTheme();

  return (
    <button onClick={toggleTheme}>
      현재: {theme()}
    </button>
  );
}
```

| 반환값 | 타입 | 설명 |
|--------|------|------|
| `theme` | `Accessor<"light" \| "dark">` | 현재 테마 값 |
| `setTheme` | `(theme: Theme) => void` | 테마 설정 함수 |
| `toggleTheme` | `() => void` | 테마 토글 함수 |

### SidebarProvider / useSidebar

사이드바 상태 컨텍스트이다. SdSidebarContainer 내부에서 자동으로 제공되므로 별도 설정이 필요 없다.

```tsx
import { useSidebar } from "@simplysm/solid";

function ToggleButton() {
  const { isCollapsed, toggleCollapsed } = useSidebar();

  return (
    <button onClick={toggleCollapsed}>
      {isCollapsed() ? "열기" : "닫기"}
    </button>
  );
}
```

| 반환값 | 타입 | 설명 |
|--------|------|------|
| `isCollapsed` | `Accessor<boolean>` | 사이드바 접힘 상태 |
| `setCollapsed` | `(value: boolean) => void` | 접힘 상태 설정 함수 |
| `toggleCollapsed` | `() => void` | 접힘 상태 토글 함수 |

## Hook

### useMediaQuery / useMobile

미디어 쿼리 상태를 추적하는 hook이다.

```tsx
import { useMediaQuery, useMobile } from "@simplysm/solid";
import { Show } from "solid-js";

function ResponsiveComponent() {
  const isMobile = useMobile();
  const isLargeScreen = useMediaQuery("(min-width: 1024px)");

  return (
    <Show when={isMobile()} fallback={<DesktopView />}>
      <MobileView />
    </Show>
  );
}
```

## 상수

### BREAKPOINTS

반응형 브레이크포인트 상수이다.

```tsx
import { BREAKPOINTS, MOBILE_QUERY } from "@simplysm/solid";

// BREAKPOINTS.mobile = 520 (px)
// MOBILE_QUERY = "(max-width: 520px)"
```

## 디렉티브

### ripple

요소 클릭 시 물결 애니메이션 효과를 추가하는 directive이다.

```tsx
import { ripple } from "@simplysm/solid";

// directive 등록 (tree-shaking 방지를 위해 명시적 참조 필요)
void ripple;

function Button() {
  return <button use:ripple={true}>Click me</button>;
}
```

| 값 | 설명 |
|----|------|
| `true` | ripple 효과 활성화 |
| `false` | ripple 효과 비활성화 |

ripple 색상은 CSS 변수 `--color-ripple`로 지정한다.

## 라이선스

Apache-2.0
