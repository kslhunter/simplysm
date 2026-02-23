# @simplysm/sd-angular

Signal-based Angular UI framework for enterprise admin applications.

Built on Angular 20+ with zoneless change detection (Signals only). Provides
Core infrastructure, UI components, and domain Feature components.

```
import { ... } from "@simplysm/sd-angular";
```

---

## Installation

```bash
yarn add @simplysm/sd-angular
```

Add the CSS to your app's `styles.css`:

```css
@import "@simplysm/sd-angular/styles.css";
```

---

## Bootstrap

See [docs/core-setup.md](docs/core-setup.md) for full setup documentation.

### `provideSdAngular(opt)`

Main bootstrap provider. Call in `bootstrapApplication`.

```typescript
import { provideSdAngular } from "@simplysm/sd-angular";

bootstrapApplication(AppComponent, {
  providers: [
    provideSdAngular({
      clientName: "my-app", // required — used as localStorage key prefix
      defaultTheme: "compact",
      defaultDark: false,
    }),
  ],
});
```

Registers: zoneless change detection, all event plugins, global error handler,
theme initializer from localStorage, router busy indicator, ServiceWorker update check.

`TSdTheme = "compact" | "mobile" | "kiosk"`

### `sdHmrBootstrapAsync(rootComponent, options?)`

Bootstraps with HMR support. Handles Cordova `deviceready` automatically.

```typescript
import { sdHmrBootstrapAsync } from "@simplysm/sd-angular";

export default sdHmrBootstrapAsync(AppComponent, appConfig);
```

---

## Documentation

Full API documentation is split by category:

| File                                          | Contents                                                                                                                                                                                                                                                                                                                                                                                                                    |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [core-setup.md](docs/core-setup.md)           | `provideSdAngular`, `sdHmrBootstrapAsync`, `SdAngularConfigProvider`, `SdGlobalErrorHandlerPlugin`, `TXT_CHANGE_IGNORE_CONFIRM`                                                                                                                                                                                                                                                                                             |
| [core-directives.md](docs/core-directives.md) | Directives (`SdEventsDirective`, `SdInvalidDirective`, `SdRippleDirective`, `SdRouterLinkDirective`, `SdShowEffectDirective`, `SdItemOfTemplateDirective`, `SdTypedTemplateDirective`), `FormatPipe`, Event Manager Plugins                                                                                                                                                                                                 |
| [core-signals.md](docs/core-signals.md)       | Signal utilities: `$signal`, `$computed`, `$effect`, `$afterRenderEffect`, `$afterRenderComputed`, `$resource`, `$mark`, `$arr`, `$obj`, `$map`, `$set`                                                                                                                                                                                                                                                                     |
| [core-providers.md](docs/core-providers.md)   | Providers: `SdThemeProvider`, `SdLocalStorageProvider`, `SdSystemConfigProvider`, `SdSystemLogProvider`, `SdSharedDataProvider`, `SdServiceClientFactoryProvider`, `SdAppStructureProvider`, `SdAppStructureUtils`, `SdFileDialogProvider`, `SdNavigateWindowProvider`, `SdPrintProvider`                                                                                                                                   |
| [core-utils.md](docs/core-utils.md)           | `injectElementRef`, `injectParent`, router signal utilities, setup utilities, manager classes (`SdExpandingManager`, `SdSelectionManager`, `SdSortingManager`), transform functions, `setSafeStyle`, `TDirectiveInputSignals`                                                                                                                                                                                               |
| [features.md](docs/features.md)               | Feature components: `SdAddressSearchModal`, `SdBaseContainerControl`, `SdDataDetailControl`, `AbsSdDataDetail`, `SdDataSheetControl`, `AbsSdDataSheet`, `SdDataSheetColumnDirective`, `SdDataSelectButtonControl`, `AbsSdDataSelectButton`, `SdPermissionTableControl`, `SdSharedDataSelectControl`, `SdSharedDataSelectButtonControl`, `SdSharedDataSelectListControl`, `SdThemeSelectorControl`                           |
| [ui-form.md](docs/ui-form.md)                 | Form components: `SdButtonControl`, `SdAnchorControl`, `SdAdditionalButtonControl`, `SdModalSelectButtonControl`, `SdTextfieldControl`, `SdTextareaControl`, `SdCheckboxControl`, `SdCheckboxGroupControl`, `SdSwitchControl`, `SdStatePresetControl`, `SdSelectControl`, `SdSelectItemControl`, `SdSelectButtonControl`, `SdFormControl`, `SdDateRangePicker`, `SdNumpadControl`, `SdRangeControl`, `SdQuillEditorControl` |
| [ui-data.md](docs/ui-data.md)                 | Data components: `SdListControl`, `SdListItemControl`, `SdSheetControl`, `SdSheetColumnDirective`, `SdSheetColumnCellTemplateDirective`, `SdSheetConfigModal`, sheet types (`ISdSheetConfig`, `ISdSheetColumnDef`, `ISdSheetHeaderDef`, `ISdSheetItemKeydownEventParam`), sheet feature classes                                                                                                                             |
| [ui-layout.md](docs/ui-layout.md)             | Layout: `SdDockContainerControl`, `SdDockControl`, `SdFlexDirective`, `SdFlexGrowDirective`, `SdFormBoxDirective`, `SdFormBoxItemDirective`, `SdFormTableDirective`, `SdGridDirective`, `SdGridItemDirective`, `SdKanbanBoardControl`, `SdKanbanLaneControl`, `SdKanbanControl`, `SdCardDirective`, `SdGapControl`, `SdPaneDirective`, `SdTableDirective`, `SdViewControl`, `SdViewItemControl`                             |
| [ui-navigation.md](docs/ui-navigation.md)     | Navigation: `SdCollapseControl`, `SdCollapseIconControl`, `SdPaginationControl`, `SdSidebarContainerControl`, `SdSidebarControl`, `SdSidebarMenuControl`, `SdSidebarUserControl`, `SdTabControl`, `SdTabItemControl`, `SdTabviewControl`, `SdTabviewItemControl`, `SdTopbarContainerControl`, `SdTopbarControl`, `SdTopbarMenuControl`, `SdTopbarUserControl`                                                               |
| [ui-overlay.md](docs/ui-overlay.md)           | Overlays: `SdBusyContainerControl`, `SdBusyProvider`, `SdDropdownControl`, `SdDropdownPopupControl`, `SdModalControl`, `SdModalProvider`, `SdActivatedModalProvider`, `ISdModal`, `ISdModalInfo`, `SdModalInstance`, `SdToastContainerControl`, `SdToastControl`, `SdToastProvider`, `ISdToast`, `ISdToastInput`                                                                                                            |
| [ui-visual.md](docs/ui-visual.md)             | Visual: `SdBarcodeControl`, `SdCalendarControl`, `SdEchartsControl`, `SdLabelControl`, `SdNoteControl`, `SdProgressControl`                                                                                                                                                                                                                                                                                                 |
