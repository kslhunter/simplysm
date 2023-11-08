import {ErrorHandler, inject, ModuleWithProviders, NgModule} from "@angular/core";
import {EVENT_MANAGER_PLUGINS} from "@angular/platform-browser";
import {SdSaveCommandEventPlugin} from "./plugins/SdSaveCommandEventPlugin";
import {SdRefreshCommandEventPlugin} from "./plugins/SdRefreshCommandEventPlugin";
import {SdInsertCommandEventPlugin} from "./plugins/SdInsertCommandEventPlugin";
import {SdResizeEventPlugin} from "./plugins/SdResizeEventPlugin";
import {SdGlobalErrorHandlerPlugin} from "./plugins/SdGlobalErrorHandlerPlugin";
import {SdOptionEventPlugin} from "./plugins/SdOptionEventPlugin";
import {FaConfig} from "@fortawesome/angular-fontawesome";
import {faQuestionCircle} from "@fortawesome/pro-duotone-svg-icons";
import {SdThemeProvider} from "./providers/SdThemeProvider";

@NgModule({
  imports: []
})
export class SdAngularModule {
  #faConfig = inject(FaConfig);
  #sdTheme = inject(SdThemeProvider);

  constructor() {
    this.#sdTheme.theme = "compact";
    this.#faConfig.fallbackIcon = faQuestionCircle;
  }

  static forRoot(): ModuleWithProviders<SdAngularModule> {
    return {
      ngModule: SdAngularModule,
      providers: [
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
