# Providers

Application-level context providers for configuration, storage, theming, i18n, service clients, and shared data.

---

## `ConfigContext`

Application-wide configuration context.

```tsx
import { ConfigProvider, useConfig } from "@simplysm/solid";

// Wrap app:
<ConfigProvider clientName="myApp">
  <App />
</ConfigProvider>

// Consume:
const config = useConfig();
```

Also exports: `AppConfig`, `ConfigContext`

**`AppConfig`**

| Property | Type | Description |
|----------|------|-------------|
| `clientName` | `string` | Client identifier (used as storage key prefix) |

---

## `SyncStorageProvider`

Persistent key-value storage context with pluggable adapter.

```tsx
import { SyncStorageProvider, useSyncStorage } from "@simplysm/solid";

// Wrap app:
<SyncStorageProvider adapter={localStorageAdapter}>
  <App />
</SyncStorageProvider>

// Consume:
const storage = useSyncStorage();
const value = storage.get("key");
storage.set("key", value);
```

Also exports: `StorageAdapter`, `SyncStorageContextValue`, `SyncStorageContext`

**`StorageAdapter`**

| Method | Description |
|--------|-------------|
| `get(key: string)` | Get value |
| `set(key: string, value: unknown)` | Set value |
| `delete(key: string)` | Delete key |

---

## `LoggerProvider`

Structured logging context with pluggable adapter.

```tsx
import { LoggerProvider } from "@simplysm/solid";

<LoggerProvider adapter={customAdapter}>
  <App />
</LoggerProvider>
```

Also exports: `LogAdapter`, `LoggerContextValue`, `LoggerContext`

**`LogAdapter`**

| Method | Description |
|--------|-------------|
| `log(level, tag, ...args)` | Log a message |

---

## `ThemeContext`

Light/dark/system theme management.

```tsx
import { ThemeProvider, useTheme } from "@simplysm/solid";

<ThemeProvider>
  <App />
</ThemeProvider>

const theme = useTheme();
theme.setMode("dark");
console.log(theme.resolved()); // "dark" | "light"
```

Also exports: `ThemeMode`, `ResolvedTheme`

**`ThemeMode`**: `"light" | "dark" | "system"`

**`ResolvedTheme`**: `"light" | "dark"`

---

## `ServiceClientContext`

WebSocket service client context for `@simplysm/service-client`.

```tsx
import { useServiceClient } from "@simplysm/solid";

const clientMap = useServiceClient();
const client = clientMap.get("default");
```

Also exports: `ServiceClientContextValue`, `ServiceClientContext`

---

## `SystemProvider`

Composite provider that assembles all core providers in the correct order. Use this as the root wrapper for your application.

```tsx
import { SystemProvider } from "@simplysm/solid";

<SystemProvider clientName="MyApp" busyVariant="spinner">
  <App />
</SystemProvider>
```

**Props**

| Prop | Type | Description |
|------|------|-------------|
| `clientName` | `string` | Application name (used in service client) |
| `busyVariant` | `BusyVariant` | Global busy indicator style (`"spinner"` or `"bar"`) |

Internally composes: `ConfigProvider`, `I18nProvider`, `SyncStorageProvider`, `LoggerProvider`, `NotificationProvider`, `NotificationBanner`, `ThemeProvider`, `ServiceClientProvider`, `SharedDataProvider`, `BusyProvider`, `DialogProvider`.

Also re-exports: `BusyVariant`

---

## `SharedDataProvider`

Context for shared data definitions that are synchronized with the server in real time.

```tsx
import { SharedDataProvider, useSharedData } from "@simplysm/solid";

// Wrap app:
<SharedDataProvider>
  <App />
</SharedDataProvider>

// Configure in a child component (called once):
useSharedData().configure(() => ({
  users: {
    fetch: async (changeKeys) => fetchUsers(changeKeys),
    getKey: (item) => item.id,
    orderBy: [[(item) => item.name, "asc"]],
  },
}));

// Consume:
const shared = useSharedData<MySharedData>();
const items = shared.users.items();
const user = shared.users.get(userId);
await shared.users.emit([changedId]);
```

Also exports: `SharedDataDefinition`, `SharedDataAccessor`, `SharedDataValue`

**`SharedDataDefinition<TData>`**

| Property | Type | Description |
|----------|------|-------------|
| `serviceKey?` | `string` | Service connection key (defaults to `"default"`) |
| `fetch` | `(changeKeys?) => Promise<TData[]>` | Data fetch function (required) |
| `getKey` | `(item) => string \| number` | Primary key extractor (required) |
| `orderBy` | `[(item) => unknown, "asc" \| "desc"][]` | Sort criteria (required) |
| `filter?` | `unknown` | Server event filter value |
| `itemSearchText?` | `(item) => string` | Search text extractor |
| `isItemHidden?` | `(item) => boolean` | Item visibility |
| `getParentKey?` | `(item) => string \| number \| undefined` | Parent key for tree data |

**`SharedDataAccessor<TData>`**

| Member | Description |
|--------|-------------|
| `items()` | Reactive items array |
| `get(key)` | Get a single item by key |
| `emit(changeKeys?)` | Propagate change event to server |
| `getKey(item)` | Primary key extractor |
| `itemSearchText?(item)` | Search text extractor |
| `isItemHidden?(item)` | Item visibility |
| `getParentKey?(item)` | Parent key extractor |

---

## `SharedDataChangeEvent`

Event class used to notify the shared data system about data changes.

```tsx
import { SharedDataChangeEvent } from "@simplysm/solid";
```

Event info shape: `{ name: string; filter: unknown }`. Event data: `(string | number)[] | undefined` (changed keys, or `undefined` for full refresh).

---

## `I18nProvider`

Internationalization context with built-in English and Korean dictionaries. **`I18nProvider` is required** — all components using `useI18n()` will throw an error if rendered outside of `I18nProvider`.

```tsx
import { I18nProvider, useI18n } from "@simplysm/solid";

<I18nProvider>
  <App />
</I18nProvider>

const i18n = useI18n();
i18n.setLocale("ko");
const label = i18n.t("someKey");

// Override/extend dictionaries (e.g., add Japanese):
i18n.configure({
  locale: "ja",
  dict: {
    ja: { "calendar.weeks.sun": "日" },
  },
});
```

Also exports: `I18nContextValue`, `I18nConfigureOptions`, `FlatDict`

**`useI18n()`** — Returns the `I18nContextValue`. Throws if called outside `I18nProvider`.

**`I18nContextValue`**

| Member | Description |
|--------|-------------|
| `t(key, params?)` | Translate a key; falls back to `en` dict, then key itself |
| `locale()` | Reactive current locale accessor |
| `setLocale(locale)` | Change active locale |
| `configure(options)` | Configure dictionary and/or locale |

**`I18nConfigureOptions`**

| Property | Description |
|----------|-------------|
| `locale?` | Active locale string |
| `dict?` | Nested dictionaries to merge into built-in dicts |
