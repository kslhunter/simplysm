# Core Setup

## provideSdAngular

Function that creates the Angular environment providers for the entire sd-angular framework. Must be called in the application config.

```typescript
import { provideSdAngular } from "@simplysm/sd-angular";

// main.ts
bootstrapApplication(AppComponent, {
  providers: [
    provideSdAngular({
      clientName: "my-app",
      defaultTheme: "compact",
      defaultDark: false,
    }),
  ],
});
```

**Options:**

| Option         | Type       | Description                                              |
| -------------- | ---------- | -------------------------------------------------------- |
| `clientName`   | `string`   | Application client name, used as localStorage key prefix |
| `defaultTheme` | `TSdTheme` | Default theme: `"compact"` \| `"mobile"` \| `"kiosk"`    |
| `defaultDark`  | `boolean`  | Whether dark mode is enabled by default                  |

**What it provides:**

- Zoneless change detection (`provideZonelessChangeDetection`)
- All event manager plugins (sdSaveCommand, sdRefreshCommand, sdInsertCommand, sdResize, sdIntersection, sdOption, sdBackbutton)
- Global error handler (`SdGlobalErrorHandlerPlugin`)
- Theme initialization from localStorage
- Window error / unhandledrejection listeners
- Router navigation busy indicator
- Service Worker update check

---

## sdHmrBootstrapAsync

Bootstraps an Angular application with HMR (Hot Module Replacement) support. Handles Cordova `deviceready` event automatically.

```typescript
import { sdHmrBootstrapAsync } from "@simplysm/sd-angular";

export default sdHmrBootstrapAsync(AppComponent, appConfig);
```

**Signature:**

```typescript
function sdHmrBootstrapAsync(
  rootComponent: Type<unknown>,
  options?: ApplicationConfig,
): Promise<ApplicationRef>;
```

---

## SdAngularConfigProvider

Injectable service (provided in root) that holds app-wide configuration set by `provideSdAngular`.

```typescript
import { SdAngularConfigProvider } from "@simplysm/sd-angular";

@Injectable()
class MyService {
  private config = inject(SdAngularConfigProvider);
  // config.clientName, config.defaultTheme, config.defaultDark
}
```

**Properties:**

| Property       | Type       | Description             |
| -------------- | ---------- | ----------------------- |
| `clientName`   | `string`   | Application client name |
| `defaultTheme` | `TSdTheme` | Default theme           |
| `defaultDark`  | `boolean`  | Default dark mode state |

---

## SdGlobalErrorHandlerPlugin

Angular `ErrorHandler` implementation that catches unhandled errors and promise rejections, logs them via `SdSystemLogProvider`, and displays an overlay error screen. Registered automatically by `provideSdAngular`.

---

## TXT_CHANGE_IGNORE_CONFIRM

Constant string used as the confirmation message when navigating away from unsaved changes.

```typescript
import { TXT_CHANGE_IGNORE_CONFIRM } from "@simplysm/sd-angular";
// "변경사항이 있습니다. 모든 변경사항을 무시하시겠습니까?..."
```
