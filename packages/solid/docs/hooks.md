# Hooks

## useTheme

Hook to access theme (dark/light/system) state. Must be used inside `ThemeProvider`.

```tsx
import { useTheme } from "@simplysm/solid";

const theme = useTheme();
theme.mode();          // "light" | "dark" | "system"
theme.resolvedTheme(); // "light" | "dark" (follows OS setting when system)
theme.setMode("dark");
theme.cycleMode();     // light -> system -> dark -> light
```

| Property/Method | Type | Description |
|-----------------|------|-------------|
| `mode` | `() => ThemeMode` | Current theme mode |
| `resolvedTheme` | `() => ResolvedTheme` | Actual applied theme |
| `setMode` | `(mode: ThemeMode) => void` | Set theme mode |
| `cycleMode` | `() => void` | Cycle to next mode |

---

## useLocalStorage

Local-only persistent storage hook. Always uses `localStorage` regardless of `syncStorage` setting. Keys are automatically prefixed as `{clientName}.{key}`. Use for data that should never leave the device (auth tokens, device-specific state).

```tsx
import { useLocalStorage } from "@simplysm/solid";

const [token, setToken] = useLocalStorage<string | undefined>("auth-token", undefined);
```

| Return value | Type | Description |
|--------------|------|-------------|
| `[0]` | `Accessor<T>` | Value getter |
| `[1]` | `Setter<T>` | Value setter |

---

## useSyncConfig

Syncable config hook. Uses `SyncStorageProvider` storage if present, falls back to `localStorage` otherwise. Keys are automatically prefixed as `{clientName}.{key}`. Use for user preferences that should sync across devices (theme, DataSheet column configs, filter presets).

```tsx
import { useSyncConfig } from "@simplysm/solid";

const [theme, setTheme, ready] = useSyncConfig("theme", "light");

// ready state indicates initialization is complete
// When syncStorage is not configured (localStorage), ready is immediately true
```

| Return value | Type | Description |
|--------------|------|-------------|
| `[0]` | `Accessor<T>` | Value getter |
| `[1]` | `Setter<T>` | Value setter |
| `[2]` | `Accessor<boolean>` | Ready state (`true` after initialization) |

---

## useLogger

Logging hook. If `LoggerProvider` is present, logs are sent to the adapter only. Otherwise, logs fall back to `consola`.

```tsx
import { useLogger } from "@simplysm/solid";

const logger = useLogger();
logger.log("user action", { userId: 123 });
logger.info("app started");
logger.error("something failed", errorObj);
logger.warn("deprecation notice");
```

| Method | Signature | Description |
|--------|-----------|-------------|
| `log` | `(...args: unknown[]) => void` | Log message (general) |
| `info` | `(...args: unknown[]) => void` | Log message (informational) |
| `warn` | `(...args: unknown[]) => void` | Log message (warning) |
| `error` | `(...args: unknown[]) => void` | Log message (error) |

**Global error capturing:** `ErrorLoggerProvider` captures uncaught errors (`window.onerror`) and unhandled promise rejections (`unhandledrejection`) and logs them via `useLogger`.

---

## useNotification

Hook to access notification system. Must be used inside `NotificationProvider`. See [Notification](feedback.md#notification) for detailed API.

---

## useBusy

Hook to access busy overlay. Must be used inside `BusyProvider`. See [Busy](feedback.md#busy) for detailed API.

---

## usePrint

Hook for printing and PDF generation. See [Print / usePrint](feedback.md#print--useprint) for detailed API.

---

## useConfig

Hook to access app-wide configuration. Must be used inside `ConfigProvider`.

```tsx
import { useConfig } from "@simplysm/solid";

const config = useConfig();
console.log(config.clientName); // "my-app"
```

---

## useServiceClient

Hook to access the WebSocket service client context. Must be used inside `ServiceClientProvider`. See [ServiceClientProvider](providers.md#serviceclientprovider) for detailed API.

---

## useSharedData

Hook to access shared data managed by `SharedDataProvider`. Must be used inside `SharedDataProvider`. See [SharedDataProvider](providers.md#shareddataprovider) for detailed API.

---

## createControllableSignal

Signal hook that automatically handles Controlled/Uncontrolled patterns. Operates in controlled mode when `onChange` is provided, uncontrolled mode otherwise.

```tsx
import { createControllableSignal } from "@simplysm/solid";

// Use inside components
const [value, setValue] = createControllableSignal({
  value: () => props.value ?? "",
  onChange: () => props.onValueChange,
});

// Supports functional setter
setValue((prev) => prev + "!");
```

---

## createMountTransition

Mount transition hook for open/close CSS animations. Control DOM rendering with `mounted()` and toggle CSS classes with `animating()`.

```tsx
import { createMountTransition } from "@simplysm/solid";

const { mounted, animating, unmount } = createMountTransition(() => open());
```

| Return value | Type | Description |
|--------------|------|-------------|
| `mounted` | `() => boolean` | Whether mounted in DOM |
| `animating` | `() => boolean` | Animation active state |
| `unmount` | `() => void` | Manual unmount |

---

## createIMEHandler

Hook that delays `onValueChange` calls during IME (Korean, etc.) composition to prevent interrupted input.

---

## useRouterLink

`@solidjs/router`-based navigation hook. Automatically handles Ctrl/Alt + click (new tab), Shift + click (new window).

```tsx
import { useRouterLink } from "@simplysm/solid";

const navigate = useRouterLink();

<List.Item onClick={navigate({ href: "/home/dashboard" })}>
  Dashboard
</List.Item>

// Pass state
<List.Item onClick={navigate({ href: "/users/123", state: { from: "list" } })}>
  User
</List.Item>
```

---

## createAppStructure

Utility for declaratively defining app structure (routing, menus, permissions). Takes a single options object.

```tsx
import { createAppStructure, type AppStructureItem } from "@simplysm/solid";
import { IconHome, IconUsers } from "@tabler/icons-solidjs";

const items: AppStructureItem<string>[] = [
  {
    code: "home",
    title: "Home",
    icon: IconHome,
    component: HomePage,
    perms: ["use"],
  },
  {
    code: "admin",
    title: "Admin",
    icon: IconUsers,
    children: [
      { code: "users", title: "User Management", component: UsersPage, perms: ["use", "edit"] },
      { code: "roles", title: "Role Management", component: RolesPage, perms: ["use"], isNotMenu: true },
    ],
  },
];

const structure = createAppStructure({
  items,
  usableModules: () => activeModules(),  // optional: filter by active modules
  permRecord: () => userPermissions(),   // optional: user permission state
});

// structure.routes         -- Route array (pass to @solidjs/router)
// structure.usableMenus()  -- SidebarMenuItem[] for Sidebar.Menu
// structure.usableFlatMenus() -- Flat menu list
// structure.permRecord()   -- Record<string, boolean> permission state
```

**Routing integration with `@solidjs/router`:**

```tsx
import { render } from "solid-js/web";
import { HashRouter, Navigate, Route } from "@solidjs/router";
import { For } from "solid-js";
import { appStructure } from "./appStructure";

render(
  () => (
    <HashRouter>
      <Route path="/" component={App}>
        <Route path="/home" component={Home}>
          <Route path="/" component={() => <Navigate href="/home/main" />} />
          <For each={appStructure.routes}>
            {(r) => <Route path={r.path} component={r.component} />}
          </For>
          <Route path="/*" component={NotFoundPage} />
        </Route>
        <Route path="/" component={() => <Navigate href="/home" />} />
      </Route>
    </HashRouter>
  ),
  document.getElementById("root")!,
);
```

Each route object in `structure.routes` has `path` (derived from nested `code` values) and `component` properties, ready to pass directly to `<Route>`.

**AppStructureItem types:**

```typescript
// Group item (has children, no component)
interface AppStructureGroupItem<TModule> {
  code: string;
  title: string;
  icon?: Component<IconProps>;
  modules?: TModule[];
  requiredModules?: TModule[];
  children: AppStructureItem<TModule>[];
}

// Leaf item (has component, no children)
interface AppStructureLeafItem<TModule> {
  code: string;
  title: string;
  icon?: Component<IconProps>;
  modules?: TModule[];
  requiredModules?: TModule[];
  component?: Component;
  perms?: ("use" | "edit")[];
  subPerms?: AppStructureSubPerm<TModule>[];
  isNotMenu?: boolean;  // exclude from menu but include in routing
}

type AppStructureItem<TModule> = AppStructureGroupItem<TModule> | AppStructureLeafItem<TModule>;
```

#### getTitleChainByHref

Retrieves the breadcrumb title chain for a given href path. Works on raw items (including `isNotMenu` items).

```tsx
import { createAppStructure } from "@simplysm/solid";

const appStructure = createAppStructure({ items });

// Returns ["Sales", "Invoice"] for /home/sales/invoice
const titles = appStructure.getTitleChainByHref("/home/sales/invoice");

// Use with router for dynamic breadcrumb
import { useLocation } from "@solidjs/router";

const location = useLocation();
const breadcrumb = () => appStructure.getTitleChainByHref(location.pathname);
```
