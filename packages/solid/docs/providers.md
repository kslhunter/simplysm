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

**`AppConfig`**

| Property | Type | Description |
|----------|------|-------------|
| `clientName` | `string` | Client identifier (used as storage key prefix) |

---

## `SyncStorageContext`

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

**`StorageAdapter`**

| Method | Description |
|--------|-------------|
| `get(key: string)` | Get value |
| `set(key: string, value: unknown)` | Set value |
| `delete(key: string)` | Delete key |

---

## `LoggerContext`

Structured logging context with pluggable adapter.

```tsx
import { LoggerProvider } from "@simplysm/solid";

<LoggerProvider adapter={customAdapter}>
  <App />
</LoggerProvider>
```

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

**`ThemeMode`**: `"light" | "dark" | "system"`

**`ResolvedTheme`**: `"light" | "dark"`

---

## `ServiceClientContext`

WebSocket service client context for `@simplysm/service-client`.

```tsx
import { useServiceClient } from "@simplysm/solid";

const client = useServiceClient();
```

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

Internally composes: `ConfigProvider`, `I18nProvider`, `SyncStorageProvider`, `LoggerProvider`, `NotificationProvider`, `NotificationBanner`, `ErrorLoggerProvider`, `PwaUpdateProvider`, `ClipboardProvider`, `ThemeProvider`, `ServiceClientProvider`, `SharedDataProvider`, `BusyProvider`.

---

## `SharedDataContext`

Context for shared data definitions that are synchronized with the server.

```tsx
import { useSharedData } from "@simplysm/solid";

const shared = useSharedData<MySharedData>();
const items = shared.users.items();
```

**`SharedDataDefinition<TData>`**

| Property | Description |
|----------|-------------|
| `getKey(item)` | Returns the primary key of an item |
| `getParentKey?(item)` | Returns parent key for tree data |
| `getSearchText?(item)` | Returns search text for filtering |
| `getIsHidden?(item)` | Returns whether item is hidden |

---

## `SharedDataChangeEvent`

Event class used to notify the shared data system about data changes.

```tsx
import { SharedDataChangeEvent } from "@simplysm/solid";
```

---

## `I18nContext`

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
