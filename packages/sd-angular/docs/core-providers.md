# Core Providers

## SdThemeProvider

Manages the active visual theme. Persists selection to localStorage.

```typescript
import { SdThemeProvider } from "@simplysm/sd-angular";

@Component({...})
class MyComponent {
  private theme = inject(SdThemeProvider);

  switchTheme() {
    this.theme.theme.set("mobile");
    this.theme.dark.set(true);
  }
}
```

**Signals:**

| Signal  | Type                         | Description                                          |
| ------- | ---------------------------- | ---------------------------------------------------- |
| `theme` | `SdWritableSignal<TSdTheme>` | Active theme: `"compact"` \| `"mobile"` \| `"kiosk"` |
| `dark`  | `SdWritableSignal<boolean>`  | Dark mode enabled                                    |

**Type:** `TSdTheme = "compact" | "mobile" | "kiosk"`

---

## SdLocalStorageProvider

Type-safe wrapper around `localStorage`. Keys are prefixed with `clientName`.

```typescript
import { SdLocalStorageProvider } from "@simplysm/sd-angular";

@Injectable()
class MyService {
  private ls = inject(SdLocalStorageProvider<{ "user-pref": UserPref }>);

  save(pref: UserPref) {
    this.ls.set("user-pref", pref);
  }

  load(): UserPref | undefined {
    return this.ls.get("user-pref");
  }
}
```

**Methods:**

| Method   | Signature                           | Description           |
| -------- | ----------------------------------- | --------------------- |
| `set`    | `set<K>(key: K, value: T[K]): void` | Store a value         |
| `get`    | `get<K>(key: K): T[K] \| undefined` | Retrieve a value      |
| `remove` | `remove(key: K): void`              | Delete a stored value |

**Helper function:** `injectSdLocalStorage<T>()` — shorthand for `inject(SdLocalStorageProvider<T>)`.

---

## SdSystemConfigProvider

Persists component-level configuration. Falls back to `SdLocalStorageProvider` when no remote `fn` is set. Used internally by `SdSheetControl` and `useSdSystemConfigResource`.

```typescript
import { SdSystemConfigProvider } from "@simplysm/sd-angular";

@Injectable({ providedIn: "root" })
class AppInit {
  private sdSystemConfig = inject(SdSystemConfigProvider);

  setup(serviceClient: SdServiceClient) {
    this.sdSystemConfig.fn = {
      async set(key, data) {
        await serviceClient.callAsync("SystemConfig.set", key, data);
      },
      async get(key) {
        return await serviceClient.callAsync("SystemConfig.get", key);
      },
    };
  }
}
```

**Methods:**

| Method                | Description             |
| --------------------- | ----------------------- |
| `setAsync(key, data)` | Persist a config value  |
| `getAsync(key)`       | Retrieve a config value |

---

## SdSystemLogProvider

Logging service. Writes to `console` and optionally calls a custom `writeFn`.

```typescript
import { SdSystemLogProvider } from "@simplysm/sd-angular";

const log = inject(SdSystemLogProvider);
log.writeFn = async (severity, ...data) => {
  await sendToServer(severity, data);
};
await log.writeAsync("error", "Something went wrong", errorDetails);
```

**Properties / Methods:**

|                                 | Description                                                  |
| ------------------------------- | ------------------------------------------------------------ |
| `writeFn`                       | Optional `(severity, ...data) => Promise<void> \| void` hook |
| `writeAsync(severity, ...data)` | Log to console and call `writeFn`                            |

---

## SdSharedDataProvider

Abstract service for managing shared reference data with real-time WebSocket update support. Extend this class to define your application's shared data sets.

```typescript
import { SdSharedDataProvider, ISharedDataBase, ISharedDataInfo } from "@simplysm/sd-angular";

interface ICategory extends ISharedDataBase<number> {
  name: string;
}

@Injectable({ providedIn: "root" })
class AppSharedDataProvider extends SdSharedDataProvider<{ category: ICategory }> {
  override initialize() {
    this.register("category", {
      serviceKey: "main",
      getDataAsync: async (changeKeys) => {
        return await this.client.callAsync("Category.getList", changeKeys);
      },
      orderBy: [(item) => item.name, "asc"],
    });
  }
}
```

**Key types:**

- `ISharedDataBase<VK>` — base interface all shared data items must implement:
  - `__valueKey: VK` — unique key
  - `__searchText: string` — text used for search filtering
  - `__isHidden: boolean` — whether the item is hidden in selects
  - `__parentKey?: VK` — optional parent key for tree structures

- `ISharedDataInfo<T>` — configuration for one shared data set:
  - `serviceKey: string` — WebSocket client key
  - `getDataAsync(changeKeys?)` — fetch function
  - `orderBy: [(item: T) => any, "asc" | "desc"][]` — ordered list of sort tuples (applied in reverse order)
  - `filter?` — optional filter object for event matching

- `ISharedSignal<T>` — extends `Signal<T[]>` with `$get(key)` method

**Methods:**

| Method                         | Description                            |
| ------------------------------ | -------------------------------------- |
| `register(name, getter)`       | Register a shared data set             |
| `getSignal(name)`              | Get a reactive signal for the data set |
| `emitAsync(name, changeKeys?)` | Emit a change event to all subscribers |
| `wait()`                       | Wait until all pending loads complete  |

**Related event:** `SdSharedDataChangeEvent` — WebSocket event class used internally.

---

## SdServiceClientFactoryProvider

Manages named `SdServiceClient` WebSocket connections. Handles HMR reload events and shows progress toasts for large requests/responses.

```typescript
import { SdServiceClientFactoryProvider } from "@simplysm/sd-angular";

@Injectable()
class AppInit {
  private factory = inject(SdServiceClientFactoryProvider);

  async connect() {
    await this.factory.connectAsync("main", { port: "8080" });
  }

  getClient() {
    return this.factory.get("main");
  }
}
```

**Methods:**

| Method         | Signature                          | Description                 |
| -------------- | ---------------------------------- | --------------------------- |
| `connectAsync` | `(key, options?) => Promise<void>` | Open a WebSocket connection |
| `closeAsync`   | `(key) => Promise<void>`           | Close a connection          |
| `get`          | `(key) => SdServiceClient`         | Retrieve a connected client |

---

## SdAppStructureProvider

Abstract service that defines the application menu tree and permission structure.

```typescript
import { SdAppStructureProvider, TSdAppStructureItem } from "@simplysm/sd-angular";

@Injectable({ providedIn: "root" })
class AppStructureProvider extends SdAppStructureProvider<"sales" | "inventory"> {
  override items: TSdAppStructureItem<"sales" | "inventory">[] = [
    {
      code: "dashboard",
      title: "Dashboard",
      perms: ["use"],
    },
    {
      code: "sales",
      title: "Sales",
      modules: ["sales"],
      children: [{ code: "orders", title: "Orders", perms: ["use", "edit"] }],
    },
  ];

  override usableModules = $computed(() => this.authService.modules());
  override permRecord = $computed(() => this.authService.permRecord());
}
```

**Computed signals (auto-derived):**

| Signal            | Description                                         |
| ----------------- | --------------------------------------------------- |
| `usableMenus`     | Filtered menu tree based on modules and permissions |
| `usableFlatMenus` | Flat array of all visible leaf menus                |

**Methods:**

| Method                                         | Description                               |
| ---------------------------------------------- | ----------------------------------------- |
| `getTitleByFullCode(fullCode)`                 | Get display title for a dotted full code  |
| `getItemChainByFullCode(fullCode)`             | Get the item chain from root to that code |
| `getPermsByFullCode(fullCodes, permKeys)`      | Get allowed permission keys               |
| `getPermissionsByStructure(items, codeChain?)` | Get permission definitions                |

**Helper function:** `usePermsSignal(viewCodes, keys)` — inject a computed signal of allowed permission keys.

**Key types:**

- `TSdAppStructureItem<TModule>` — union of group and leaf items
- `ISdMenu<TModule>` — resolved menu object with `title`, `codeChain`, `icon`, `modules`, `children`
- `ISdFlatMenu<TModule>` — flat menu: `{ titleChain, codeChain, modulesChain }`
- `ISdPermission<TModule>` — permission definition
- `ISdFlatPermission<TModule>` — flat permission entry: `{ titleChain, codeChain, modulesChain }`

**`SdAppStructureUtils` (static utility class):**

All methods on `SdAppStructureProvider` are implemented as static methods on this exported utility class. Useful for calling outside the DI context.

| Static Method                                                | Description                |
| ------------------------------------------------------------ | -------------------------- |
| `getTitleByFullCode(items, fullCode)`                        | Get display title          |
| `getItemChainByFullCode(items, fullCode)`                    | Get item chain             |
| `getPermsByFullCode(items, fullCodes, permKeys, permRecord)` | Get allowed perm keys      |
| `getMenus(items, codeChain, usableModules, permRecord)`      | Get filtered menu tree     |
| `getFlatMenus(items, usableModules, permRecord)`             | Get flat menu list         |
| `getPermissions(items, codeChain, usableModules)`            | Get permission definitions |
| `getFlatPermissions(items, usableModules)`                   | Get flat permission list   |

---

## SdFileDialogProvider

Opens a native file picker dialog programmatically.

```typescript
import { SdFileDialogProvider } from "@simplysm/sd-angular";

const fileDialog = inject(SdFileDialogProvider);

// Single file
const file = await fileDialog.showAsync(false, ".xlsx");

// Multiple files
const files = await fileDialog.showAsync(true, "image/*");
```

**Methods:**

| Overload                               | Returns                        |
| -------------------------------------- | ------------------------------ |
| `showAsync(multiple?: false, accept?)` | `Promise<File \| undefined>`   |
| `showAsync(multiple: true, accept?)`   | `Promise<File[] \| undefined>` |

---

## SdNavigateWindowProvider

Manages navigation to routes, either in the current window, a new tab, or a popup window.

```typescript
import { SdNavigateWindowProvider } from "@simplysm/sd-angular";

const navWindow = inject(SdNavigateWindowProvider);
navWindow.open("/reports/monthly", { id: "42" }, "width=800,height=600");
```

**Properties / Methods:**

|                                      | Description                                                  |
| ------------------------------------ | ------------------------------------------------------------ |
| `isWindow`                           | `boolean` — whether the current window was opened as a popup |
| `open(navigate, params?, features?)` | Open a route in a new window or tab                          |

---

## SdPrintProvider

Renders an Angular component and prints it or exports it as a PDF buffer.

```typescript
import { SdPrintProvider, ISdPrint } from "@simplysm/sd-angular";

@Component({
  template: `
    <div class="page">...</div>
  `,
})
class InvoiceTemplate implements ISdPrint {
  initialized = $signal(true);
  invoiceId = input.required<number>();
}

const printer = inject(SdPrintProvider);
await printer.printAsync({ type: InvoiceTemplate, inputs: { invoiceId: 42 } });

// Export as PDF
const buffer = await printer.getPdfBufferAsync(
  { type: InvoiceTemplate, inputs: { invoiceId: 42 } },
  { orientation: "landscape" },
);
```

**Methods:**

| Method                                  | Description                            |
| --------------------------------------- | -------------------------------------- |
| `printAsync(template, options?)`        | Print the component (`window.print()`) |
| `getPdfBufferAsync(template, options?)` | Render and export as PDF `Buffer`      |

**Interfaces:**

- `ISdPrint` — component must implement `initialized: Signal<boolean>`
- `ISdPrintInput<T, X extends keyof any = "">` — `{ type: Type<T>; inputs: Omit<TDirectiveInputSignals<T>, X> }`
