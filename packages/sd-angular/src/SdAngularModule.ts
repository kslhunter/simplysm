import {ErrorHandler, inject, ModuleWithProviders, NgModule} from "@angular/core";
import {EVENT_MANAGER_PLUGINS} from "@angular/platform-browser";
import {SdSaveCommandEventPlugin} from "./plugins/SdSaveCommandEventPlugin";
import {SdRefreshCommandEventPlugin} from "./plugins/SdRefreshCommandEventPlugin";
import {SdInsertCommandEventPlugin} from "./plugins/SdInsertCommandEventPlugin";
import {SdResizeEventPlugin} from "./plugins/SdResizeEventPlugin";
import {SdGlobalErrorHandlerPlugin} from "./plugins/SdGlobalErrorHandlerPlugin";
import {SdOptionEventPlugin} from "./plugins/SdOptionEventPlugin";
import {FaConfig} from "@fortawesome/angular-fontawesome";
import {SdAngularOptionsProvider} from "./providers/SdAngularOptionsProvider";
import {SdThemeProvider} from "./providers/SdThemeProvider";
import {SdLocalStorageProvider} from "./providers/SdLocalStorageProvider";

@NgModule({
  imports: []
})
export class SdAngularModule {
  #sdOptions = inject(SdAngularOptionsProvider);
  #faConfig = inject(FaConfig);
  #sdTheme = inject(SdThemeProvider);
  #sdLocalStorage = inject(SdLocalStorageProvider);

  constructor() {
    this.#faConfig.fallbackIcon = this.#sdOptions.fallbackIcon;
    this.#sdTheme.theme = this.#sdLocalStorage.get("sd-theme") ?? this.#sdOptions.defaultTheme;
  }

  static forRoot(opt: {
    clientName?: string;
    defaultTheme?: "compact" | "modern" | "mobile" | "kiosk";
    fallbackIcon?: any;
  }): ModuleWithProviders<SdAngularModule> {
    return {
      ngModule: SdAngularModule,
      providers: [
        {
          provide: SdAngularOptionsProvider, useFactory: () => {
            const provider = new SdAngularOptionsProvider();
            provider.clientName = opt.clientName ?? provider.clientName;
            provider.defaultTheme = opt.defaultTheme ?? provider.defaultTheme;
            provider.fallbackIcon = opt.fallbackIcon ?? provider.fallbackIcon;
            return provider;
          }
        },
        {provide: EVENT_MANAGER_PLUGINS, useClass: SdSaveCommandEventPlugin, multi: true},
        {provide: EVENT_MANAGER_PLUGINS, useClass: SdRefreshCommandEventPlugin, multi: true},
        {provide: EVENT_MANAGER_PLUGINS, useClass: SdInsertCommandEventPlugin, multi: true},
        {provide: EVENT_MANAGER_PLUGINS, useClass: SdResizeEventPlugin, multi: true},
        {provide: EVENT_MANAGER_PLUGINS, useClass: SdOptionEventPlugin, multi: true},
        {provide: ErrorHandler, useClass: SdGlobalErrorHandlerPlugin},
        // provideZoneChangeDetection({
        //   eventCoalescing: true,
        //   runCoalescing: true
        // }),
      ]
    };
  }
}
