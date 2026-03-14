# 프로바이더 & 훅

## SystemProvider

모든 필수 프로바이더를 한 번에 감싸는 편의 컴포넌트. 대부분의 앱에서는 이것 하나로 충분하다.

```tsx
import { SystemProvider } from "@simplysm/solid";

<SystemProvider clientName="my-app" busyVariant="spinner">
  <App />
</SystemProvider>
```

| Prop | 타입 | 설명 |
|------|------|------|
| `clientName` | `string` | 클라이언트 식별 이름 (localStorage 키 접두사 등에 사용) |
| `busyVariant` | `"spinner" \| "bar"` | 글로벌 BusyProvider 변형 |

내부 프로바이더 스택 (위에서 아래 순서):
`ConfigProvider` > `I18nProvider` > `SyncStorageProvider` > `LoggerProvider` > `NotificationProvider` + `NotificationBanner` > `ErrorLoggerProvider` > `PwaUpdateProvider` > `ClipboardProvider` > `ThemeProvider` > `ServiceClientProvider` > `SharedDataProvider` > `BusyProvider`

---

## ThemeProvider

라이트/다크/시스템 테마 관리. localStorage에 설정 저장.

```tsx
import { ThemeProvider, useTheme } from "@simplysm/solid";

<ThemeProvider>
  <App />
</ThemeProvider>

const theme = useTheme();

theme.mode();           // "light" | "dark" | "system"
theme.resolvedTheme();  // "light" | "dark" (OS 설정 반영)
theme.setMode("dark");
theme.cycleMode();      // light → system → dark → light
```

---

## I18nProvider

다국어 지원. 한국어(ko), 영어(en) 내장.

```tsx
import { I18nProvider, useI18n } from "@simplysm/solid";

<I18nProvider>
  <App />
</I18nProvider>

const i18n = useI18n();

i18n.t("save");                    // 번역 조회
i18n.t("greeting", { name: "Alice" }); // 파라미터 치환
i18n.locale();                     // 현재 로케일
i18n.setLocale("en");

// 사전 확장
i18n.configure({
  dictionaries: {
    ko: { myKey: "내 값" },
    en: { myKey: "My Value" },
  },
});
```

---

## SharedDataProvider

서버 데이터를 구독하고 실시간 동기화하는 프로바이더. `ServiceClientProvider`와 `NotificationProvider` 내부에서 사용해야 한다.

```tsx
import { SharedDataProvider, useSharedData } from "@simplysm/solid";

// 프로바이더 설정 (SystemProvider 사용 시 자동 포함)
<SharedDataProvider>
  <App />
</SharedDataProvider>

// 데이터 정의 (자식 컴포넌트에서 한 번만 호출)
const sharedData = useSharedData<{
  users: User;
  departments: Department;
}>();

sharedData.configure(() => ({
  users: {
    fetch: async (changeKeys) => await api.getUsers(changeKeys),
    getKey: (item) => item.id,
    orderBy: [[(item) => item.name, "asc"]],
    itemSearchText: (item) => item.name,
    isItemHidden: (item) => item.isDeleted,
  },
  departments: {
    fetch: async (changeKeys) => await api.getDepartments(changeKeys),
    getKey: (item) => item.id,
    orderBy: [[(item) => item.sortOrder, "asc"]],
    getParentKey: (item) => item.parentId,  // 트리 구조 지원
  },
}));

// 데이터 사용
const users = sharedData.users.items();     // 반응형 배열
const user = sharedData.users.get(userId);  // 키로 조회

// 변경 이벤트 발행 (서버의 모든 구독자에게 전파)
await sharedData.users.emit([changedUserId]);

// 전체 로딩 대기
await sharedData.wait();
```

### SharedDataDefinition

| 속성 | 타입 | 설명 |
|------|------|------|
| `fetch` | `(changeKeys?) => Promise<TData[]>` | 데이터 조회 함수 |
| `getKey` | `(item) => string \| number` | 항목 고유 키 추출 |
| `orderBy` | `[(item) => unknown, "asc" \| "desc"][]` | 정렬 기준 (다중) |
| `serviceKey` | `string` | 서비스 연결 키 (기본: `"default"`) |
| `filter` | `unknown` | 서버 이벤트 필터 |
| `itemSearchText` | `(item) => string` | 검색 텍스트 추출 |
| `isItemHidden` | `(item) => boolean` | 숨김 여부 |
| `getParentKey` | `(item) => string \| number \| undefined` | 부모 키 (트리 구조) |

### SharedDataAccessor

| 메서드/속성 | 타입 | 설명 |
|------------|------|------|
| `items()` | `Accessor<TData[]>` | 반응형 데이터 배열 |
| `get(key)` | `(key) => TData \| undefined` | 키로 단건 조회 |
| `emit(changeKeys?)` | `(keys?) => Promise<void>` | 변경 이벤트 발행 |
| `getKey` | `(item) => string \| number` | 키 추출 함수 |

---

## 기타 프로바이더

| 프로바이더 | 설명 |
|-----------|------|
| `ConfigProvider` | 클라이언트 설정 (localStorage 키 접두사). prop: `clientName: string` |
| `ServiceClientProvider` | `@simplysm/service-client` WebSocket 연결 통합 |
| `SyncStorageProvider` | localStorage 동기화 |
| `LoggerProvider` | 로깅 설정 |
| `ErrorLoggerProvider` | 글로벌 에러 핸들링 (window.onerror 등) |
| `ClipboardProvider` | 클립보드 기능 |
| `PwaUpdateProvider` | PWA Service Worker 업데이트 감지 (5분 간격 폴링, 알림 표시) |

---

## 훅

### createControllableSignal

제어/비제어 컴포넌트 패턴 구현.

```typescript
import { createControllableSignal } from "@simplysm/solid";

const [value, setValue] = createControllableSignal({
  value: () => props.value,
  onChange: () => props.onValueChange,
});
```

### createControllableStore

객체 상태용 제어/비제어 패턴.

### createIMEHandler

IME(한글 등) 입력 처리.

```typescript
const ime = createIMEHandler();
// ime.handleCompositionStart()
// ime.handleCompositionEnd()
// ime.handleInput()
// ime.composingValue()
```

### useLocalStorage

반응형 localStorage.

```typescript
import { useLocalStorage } from "@simplysm/solid";

const [theme, setTheme] = useLocalStorage("theme", "light");
```

### useSyncConfig

클라이언트명 접두사 붙은 localStorage 동기화.

```typescript
const [config, setConfig] = useSyncConfig("my-setting", defaultValue);
```

### useLogger

```typescript
const logger = useLogger();
```

### useRouterLink

```typescript
const navigate = useRouterLink();
navigate("/users");
```

### createMountTransition

마운트 애니메이션 상태 관리.

```typescript
const { mounted, animating, unmount } = createMountTransition(() => isVisible());
```

---

## createAppStructure

앱 메뉴, 라우트, 권한 구조를 선언적으로 정의한다. 모듈별 필터링과 권한 기반 접근 제어를 지원한다.

```typescript
import { createAppStructure } from "@simplysm/solid";
import type { AppStructureItem } from "@simplysm/solid";

type Module = "basic" | "pro" | "enterprise";

const items: AppStructureItem<Module>[] = [
  {
    code: "admin",
    title: "관리",
    children: [
      {
        code: "users",
        title: "사용자 관리",
        component: UserPage,
        perms: ["use", "edit"],
        modules: ["basic"],
      },
      {
        code: "roles",
        title: "역할 관리",
        component: RolePage,
        perms: ["use", "edit"],
        modules: ["pro"],
        subPerms: [
          { code: "advanced", title: "고급 설정", perms: ["use", "edit"], modules: ["enterprise"] },
        ],
      },
    ],
  },
];

const { AppStructureProvider, useAppStructure } = createAppStructure(() => ({
  items,
  usableModules: () => activeModules(),
  permRecord: () => userPermissions(),
}));

// 프로바이더 설정
<AppStructureProvider>
  <App />
</AppStructureProvider>

// 사용
const app = useAppStructure();

app.usableRoutes();     // 접근 가능한 라우트 배열
app.usableMenus();      // 접근 가능한 메뉴 트리
app.usableFlatMenus();  // 플랫 메뉴 배열 (검색용)
app.usablePerms();      // 권한 트리 (PermissionTable에 전달)
app.allFlatPerms;       // 모든 권한 목록 (관리용)
app.perms;              // 타입 안전한 권한 객체 (app.perms.admin.users.use)

app.getTitleChainByHref("/admin/users");  // ["관리", "사용자 관리"]
```

### AppStructure 반환 타입

| 속성 | 타입 | 설명 |
|------|------|------|
| `usableRoutes` | `Accessor<AppRoute[]>` | 모듈/권한 필터링된 라우트 |
| `usableMenus` | `Accessor<AppMenu[]>` | 필터링된 메뉴 트리 |
| `usableFlatMenus` | `Accessor<AppFlatMenu[]>` | 플랫 메뉴 배열 |
| `usablePerms` | `Accessor<AppPerm[]>` | 필터링된 권한 트리 |
| `allFlatPerms` | `AppFlatPerm[]` | 전체 권한 목록 |
| `perms` | `InferPerms<TItems>` | 타입 추론된 권한 접근 객체 |
| `getTitleChainByHref` | `(href: string) => string[]` | href로 타이틀 체인 조회 |

---

## 스타일 유틸리티

### 기본 스타일

```typescript
import { bg, border, text } from "@simplysm/solid";

// Tailwind 클래스 프리셋
bg.surface   // bg-white dark:bg-base-900
bg.muted     // bg-base-100 dark:bg-base-800
bg.subtle    // bg-base-200 dark:bg-base-700
border.default // border-base-200 dark:border-base-700
text.default   // text-base-900 dark:text-base-100
text.muted     // text-base-400 dark:text-base-500
```

### 컨트롤 스타일

```typescript
import { pad, gap } from "@simplysm/solid";

pad.xs  // px-1 py-0
pad.sm  // px-1.5 py-0.5
pad.md  // px-2 py-1
pad.lg  // px-3 py-2
pad.xl  // px-4 py-3

gap.xs  // gap-0
gap.sm  // gap-0.5
gap.md  // gap-1
gap.lg  // gap-1.5
gap.xl  // gap-2
```

### 테마 토큰

```typescript
import { themeTokens, type SemanticTheme } from "@simplysm/solid";

// 각 semantic theme(base, primary, success, warning, danger, info)별:
themeTokens.primary.solid      // bg-primary-500 text-white
themeTokens.primary.solidHover // hover:bg-primary-600 dark:hover:bg-primary-400
themeTokens.primary.light      // bg-primary-100 text-primary-900 ...
themeTokens.primary.text       // text-primary-600 dark:text-primary-400
themeTokens.primary.hoverBg    // hover:bg-primary-100 ...
themeTokens.primary.border     // border-primary-300 ...
```

---

## 디렉티브

### ripple

Material Design 스타일 리플 효과.

```tsx
import { ripple } from "@simplysm/solid";

<button use:ripple>클릭</button>
```

---

## 헬퍼

### mergeStyles

인라인 CSS 문자열 병합.

```typescript
import { mergeStyles } from "@simplysm/solid";

mergeStyles("color: red", "font-size: 14px"); // "color: red; font-size: 14px"
```

### createSlot / createSlots

컴포넌트 합성을 위한 슬롯 패턴. `createSlot`은 단일 슬롯, `createSlots`는 복수 슬롯을 지원한다.

```typescript
import { createSlot } from "@simplysm/solid";

// 슬롯 정의
const [MySlot, createMySlotAccessor] = createSlot<{ children: JSX.Element }>();

// 컴포넌트 내부에서 슬롯 접근
const [slotValue, SlotProvider] = createMySlotAccessor();

// 사용
<SlotProvider>
  <MySlot><span>슬롯 내용</span></MySlot>
  {/* slotValue()로 접근 */}
</SlotProvider>
```

### startPointerDrag

포인터 드래그 인터랙션 관리. 포인터 캡처를 설정하고 move/end 이벤트를 관리한다.

```typescript
import { startPointerDrag } from "@simplysm/solid";

startPointerDrag(element, event.pointerId, {
  onMove: (e) => { /* 드래그 중 */ },
  onEnd: (e) => { /* 드래그 종료 */ },
});
```
