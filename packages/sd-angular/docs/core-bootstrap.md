# Core - Bootstrap & Configuration

## provideSdAngular

Main provider factory that configures the entire sd-angular framework. Must be called in the application's provider list.

```typescript
function provideSdAngular(opt: {
  clientName: string;
  defaultTheme: TSdTheme;
  defaultDark: boolean;
}): EnvironmentProviders;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `clientName` | `string` | Application name, used as localStorage prefix |
| `defaultTheme` | `TSdTheme` | Default theme: `"compact"`, `"mobile"`, or `"kiosk"` |
| `defaultDark` | `boolean` | Whether dark mode is enabled by default |

Sets up:
- Zoneless change detection (`provideZonelessChangeDetection`)
- All event manager plugins (save/refresh/insert commands, resize, option, backbutton)
- Global error handler (`SdGlobalErrorHandlerPlugin`)
- Navigation busy indicator
- Service worker update checking
- Image config (disables size/lazy-load warnings)
- ng-icons config (strokeWidth: 1.5, size: 1.33em)

### Usage

```typescript
export default sdHmrBootstrapAsync(AppComponent, {
  providers: [
    provideSdAngular({
      clientName: "my-app",
      defaultTheme: "compact",
      defaultDark: false,
    }),
    provideRouter(routes),
  ],
});
```

---

## sdHmrBootstrapAsync

HMR-aware application bootstrapper. Supports both browser and Cordova environments. Registers `__sd_hmr_destroy` on window for hot module replacement.

```typescript
async function sdHmrBootstrapAsync(
  rootComponent: Type<unknown>,
  options?: ApplicationConfig,
): Promise<ApplicationRef>;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `rootComponent` | `Type<unknown>` | The root Angular component |
| `options` | `ApplicationConfig` | Optional application config with providers |

Returns the `ApplicationRef` after bootstrapping.

---

## TXT_CHANGE_IGNORE_CONFIRM

Default confirmation message displayed when the user has unsaved changes and attempts to navigate away.

```typescript
const TXT_CHANGE_IGNORE_CONFIRM: string;
```

Value (Korean): "Are there unsaved changes. Would you like to discard all changes?"
