# Providers

Compose providers at the app root. Some providers depend on others and **must** be nested inside them. If the nesting order violates a required dependency, the dependent provider will throw a runtime error or malfunction.

### Dependency Graph

```
ConfigProvider ─────────────────────┐ (no deps, must be outermost)
  SyncStorageProvider ──────────────┤ (no deps, optional)
    LoggerProvider ─────────────────┤ (no deps, optional)
      │                             │
      ├─ ThemeProvider              │ ← requires ConfigProvider
      │                             │   (uses SyncStorageProvider if present)
      ├─ NotificationProvider       │ ← uses LoggerProvider if present
      │    └─ PwaUpdateProvider     │ ← requires NotificationProvider
      │                             │
      ├─ ErrorLoggerProvider        │ ← uses LoggerProvider if present
      │                             │
      ├─ ServiceClientProvider      │ ← requires ConfigProvider + NotificationProvider
      │    └─ SharedDataProvider    │ ← requires ServiceClientProvider + NotificationProvider
      │                             │   (uses LoggerProvider if present)
      │                             │
      ├─ ClipboardProvider          │ (no deps, independent)
      ├─ BusyProvider               │ (no deps, independent)
      └─ DialogProvider             │ (no deps, independent)
```

**Required** = will break if missing. **Optional** = graceful fallback (e.g., `consola` instead of remote logger).

| Provider | Required Parents | Optional Parents |
|----------|-----------------|-----------------|
| `ConfigProvider` | (none — root) | |
| `SyncStorageProvider` | (none) | |
| `LoggerProvider` | (none) | |
| `ThemeProvider` | `ConfigProvider` | `SyncStorageProvider` |
| `NotificationProvider` | (none) | `LoggerProvider` |
| `ErrorLoggerProvider` | (none) | `LoggerProvider` |
| `PwaUpdateProvider` | `NotificationProvider` | |
| `ServiceClientProvider` | `ConfigProvider`, `NotificationProvider` | |
| `SharedDataProvider` | `ServiceClientProvider`, `NotificationProvider` | `LoggerProvider` |
| `ClipboardProvider` | (none) | |
| `BusyProvider` | (none) | |
| `DialogProvider` | (none) | |

### Recommended Nesting Order

```tsx
<ConfigProvider clientName="my-app">
  <SyncStorageProvider storage={...}>     {/* optional */}
    <LoggerProvider adapter={...}>        {/* optional */}
      <NotificationProvider>
        <NotificationBanner />
        <ErrorLoggerProvider>
          <PwaUpdateProvider>
            <ClipboardProvider>
              <ThemeProvider>
                <BusyProvider>{/* app content */}</BusyProvider>
              </ThemeProvider>
            </ClipboardProvider>
          </PwaUpdateProvider>
        </ErrorLoggerProvider>
      </NotificationProvider>
    </LoggerProvider>
  </SyncStorageProvider>
</ConfigProvider>
```

## ConfigProvider

Required root provider. Provides `clientName` used as storage key prefix.

```tsx
<ConfigProvider clientName="my-app">
  {/* app content */}
</ConfigProvider>
```

| Prop | Type | Description |
|------|------|-------------|
| `clientName` | `string` | Client identifier (used as storage key prefix) |

---

## SyncStorageProvider

Optional provider for custom sync storage (cross-device sync). When present, `useSyncConfig` uses this storage instead of `localStorage`.

```tsx
<SyncStorageProvider storage={myStorageAdapter}>
  {/* children */}
</SyncStorageProvider>
```

| Prop | Type | Description |
|------|------|-------------|
| `storage` | `StorageAdapter` | Storage adapter implementation |

---

## LoggerProvider

Optional provider for remote logging. When present, `useLogger` sends logs to the adapter instead of `consola`.

```tsx
<LoggerProvider adapter={myLogAdapter}>
  {/* children */}
</LoggerProvider>
```

| Prop | Type | Description |
|------|------|-------------|
| `adapter` | `LogAdapter` | Log adapter implementation |

---

## ErrorLoggerProvider

Captures uncaught errors (`window.onerror`) and unhandled promise rejections (`unhandledrejection`) and logs them via `useLogger`.

```tsx
<ErrorLoggerProvider>
  {/* children */}
</ErrorLoggerProvider>
```

---

## PwaUpdateProvider

PWA Service Worker update detection. Polls for SW updates every 5 minutes. When a new version is detected, shows a notification with a reload action. Must be inside `NotificationProvider`.

Graceful no-op when `navigator.serviceWorker` is unavailable (HTTP, unsupported browser, dev mode).

```tsx
<PwaUpdateProvider>
  {/* children */}
</PwaUpdateProvider>
```

---

## ClipboardProvider

Intercepts `Ctrl+C` to copy form control values (input, textarea, select, checkbox) as plain text. Handles table structures as TSV format.

```tsx
<ClipboardProvider>
  {/* children */}
</ClipboardProvider>
```

---

## ThemeProvider

Dark/light/system theme provider. Toggles the `dark` class on `<html>` and manages theme persistence via `useSyncConfig`.

```tsx
<ThemeProvider>
  {/* children */}
</ThemeProvider>
```

---

## ServiceClientProvider

WebSocket client provider for RPC communication with `@simplysm/service-server`. Wraps `ServiceClient` from `@simplysm/service-client`. Provides `useServiceClient` hook to components.

`ServiceClientProvider` takes no props. After mounting, use `useServiceClient()` to connect, close, and access client instances by key.

```tsx
import { ServiceClientProvider, useServiceClient } from "@simplysm/solid";

// Wrap your app
<ServiceClientProvider>
  <App />
</ServiceClientProvider>

// In a component
function App() {
  const client = useServiceClient();

  onMount(async () => {
    await client.connect("main", { host: "localhost", port: 3000, ssl: false });
  });

  onCleanup(async () => {
    await client.close("main");
  });

  const handleCall = async () => {
    const svc = client.get("main");
    const result = await svc.call("MyService", "myMethod", [arg1, arg2]);
  };
}
```

**useServiceClient API:**

| Method | Signature | Description |
|--------|-----------|-------------|
| `connect` | `(key: string, options?: Partial<ServiceConnectionConfig>) => Promise<void>` | Open WebSocket connection |
| `close` | `(key: string) => Promise<void>` | Close connection by key |
| `get` | `(key: string) => ServiceClient` | Get connected client by key (throws if not connected) |
| `isConnected` | `(key: string) => boolean` | Check connection state |

`ServiceConnectionConfig`: `{ host: string; port: number; ssl: boolean }`

Defaults for `host`, `port`, and `ssl` are derived from `window.location` when omitted.

---

## SharedDataProvider

Shared data provider for managing server-side data subscriptions. Works with `ServiceClientProvider` to provide reactive shared data across components via `useSharedData`.

```tsx
import { SharedDataProvider, type SharedDataDefinition } from "@simplysm/solid";

interface MySharedData {
  users: UserRecord;
  products: ProductRecord;
}

const definitions: { [K in keyof MySharedData]: SharedDataDefinition<MySharedData[K]> } = {
  users: {
    serviceKey: "main",
    fetch: async (changeKeys) => fetchUsers(changeKeys),
    getKey: (item) => item.id,
    orderBy: [(item) => item.name, "asc"],
  },
  products: {
    serviceKey: "main",
    fetch: async (changeKeys) => fetchProducts(changeKeys),
    getKey: (item) => item.id,
    orderBy: [(item) => item.name, "asc"],
  },
};

<SharedDataProvider definitions={definitions}>
  <App />
</SharedDataProvider>
```

**SharedDataProvider Props:**

| Prop | Type | Description |
|------|------|-------------|
| `definitions` | `{ [K in keyof TSharedData]: SharedDataDefinition<TSharedData[K]> }` | Map of data key to fetch definition |

**SharedDataDefinition type:**

```typescript
interface SharedDataDefinition<TData> {
  serviceKey: string;                                           // Connection key (matches useServiceClient key)
  fetch: (changeKeys?: Array<string | number>) => Promise<TData[]>; // Data fetch function
  getKey: (item: TData) => string | number;                    // Primary key extractor
  orderBy: [(item: TData) => unknown, "asc" | "desc"][];       // Sort order
  filter?: unknown;                                             // Optional filter for change events
}
```

**useSharedData API:**

```tsx
import { useSharedData } from "@simplysm/solid";

function MyComponent() {
  const sharedData = useSharedData<MySharedData>();

  const users = () => sharedData.users.items();           // Accessor<TData[]>
  const user = () => sharedData.users.get(userId());      // TData | undefined

  const handleUpdate = async () => {
    await sharedData.users.emit([updatedUserId]);          // trigger refetch for keys
  };
}
```

**SharedDataAccessor API:**

| Property/Method | Type | Description |
|-----------------|------|-------------|
| `items` | `Accessor<TData[]>` | Reactive item array |
| `get` | `(key: string \| number \| undefined) => TData \| undefined` | Get item by key |
| `emit` | `(changeKeys?: Array<string \| number>) => Promise<void>` | Emit change event to server (triggers refetch in all subscribers) |

**SharedDataValue extras:**

| Property/Method | Type | Description |
|-----------------|------|-------------|
| `wait` | `() => Promise<void>` | Wait until all initial fetches complete |
| `busy` | `Accessor<boolean>` | True while any fetch is in progress |

**SharedDataChangeEvent:**

`SharedDataChangeEvent` is the event definition used internally by `SharedDataProvider` to communicate data changes between server and clients. Export it if you need to emit changes from the server side.

```typescript
import { SharedDataChangeEvent } from "@simplysm/solid";
```
