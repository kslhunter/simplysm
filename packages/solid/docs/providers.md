# Providers

## InitializeProvider

The only exported provider component. Wraps all internal providers in the correct dependency order. Use this to set up your app.

```tsx
import { InitializeProvider } from "@simplysm/solid";

<InitializeProvider clientName="my-app">
  <AppRoot />
</InitializeProvider>
```

Configuration is done via hooks inside child components:

```tsx
function AppRoot() {
  const serviceClient = useServiceClient();

  onMount(async () => {
    await serviceClient.connect("main", { port: 3000 });
    useSyncStorage()!.configure((origin) => myStorageAdapter);
    useLogger().configure((origin) => myLogAdapter);
    useSharedData().configure((origin) => definitions);
  });
}
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `clientName` | `string` | (required) | Client identifier (used as storage key prefix) |
| `busyVariant` | `BusyVariant` | `"spinner"` | Busy overlay display variant (`"spinner"` or `"bar"`) |

**Internal nesting order:**

```
ConfigProvider → SyncStorageProvider → LoggerProvider →
  NotificationProvider + NotificationBanner →
    ErrorLoggerProvider → PwaUpdateProvider →
      ClipboardProvider → ThemeProvider →
        ServiceClientProvider → SharedDataProvider →
          BusyProvider → DialogProvider → {children}
```

Individual providers are not exported. All provider setup goes through `InitializeProvider`.

---

## Exported Types & Hooks

The following types, context objects, and hooks are exported for use with `InitializeProvider`:

| Export | Kind | Description |
|--------|------|-------------|
| `useConfig` | hook | App configuration access |
| `useTheme` | hook | Theme mode access and toggle |
| `useSyncStorage` | hook | Sync storage adapter access |
| `useServiceClient` | hook | WebSocket RPC client access |
| `useSharedData` | hook | Shared data subscription access |
| `useNotification` | hook | Notification system access |
| `useBusy` | hook | Busy overlay control |
| `useDialog` | hook | Programmatic dialog opening |
| `ConfigContext` | context | For mock injection in tests |
| `SyncStorageContext` | context | For mock injection in tests |
| `ServiceClientContext` | context | For mock injection in tests |
| `SharedDataContext` | context | For mock injection in tests |
| `AppConfig` | type | Config context value type |
| `StorageAdapter` | type | Sync storage adapter interface |
| `SyncStorageContextValue` | type | Sync storage context value type |
| `LogAdapter` | type | Log adapter interface |
| `LoggerContextValue` | type | Logger context value type |
| `ThemeMode` | type | `"light" \| "dark" \| "system"` |
| `ResolvedTheme` | type | `"light" \| "dark"` |
| `ServiceClientContextValue` | type | Service client context value type |
| `SharedDataDefinition` | type | Data subscription definition |
| `SharedDataAccessor` | type | Per-key data accessor |
| `SharedDataValue` | type | Full shared data context value |
| `BusyVariant` | type | `"spinner" \| "bar"` |
| `SharedDataChangeEvent` | class | Server-side change event definition |

---

## SharedData Usage

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
| `configure` | `(fn: (origin) => definitions) => void` | Set up data subscriptions via decorator function (call once after service client connects) |

**SharedDataChangeEvent:**

`SharedDataChangeEvent` is the event definition used internally to communicate data changes between server and clients. Export it if you need to emit changes from the server side.

```typescript
import { SharedDataChangeEvent } from "@simplysm/solid";
```
