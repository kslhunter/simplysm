import {ErrorHandler, inject, ModuleWithProviders, NgModule} from "@angular/core";
import {CommonModule} from "@angular/common";
import {EVENT_MANAGER_PLUGINS} from "@angular/platform-browser";
import {SdSaveCommandEventPlugin} from "./plugins/SdSaveCommandEventPlugin";
import {SdRefreshCommandEventPlugin} from "./plugins/SdRefreshCommandEventPlugin";
import {SdInsertCommandEventPlugin} from "./plugins/SdInsertCommandEventPlugin";
import {SdResizeEventPlugin} from "./plugins/SdResizeEventPlugin";
import {SdPasteEventPlugin} from "./plugins/SdPasteEventPlugin";
import {SdGlobalErrorHandlerPlugin} from "./plugins/SdGlobalErrorHandlerPlugin";
import {FaConfig} from "@fortawesome/angular-fontawesome";
import {faQuestionCircle} from "@fortawesome/pro-light-svg-icons/faQuestionCircle";
import {SdAndroidBackbuttonEventPlugin} from "./plugins/SdAndroidBackbuttonEventPlugin";
import {SdCaptureEventPlugin} from "./plugins/SdCaptureEventPlugin";

@NgModule({
  imports: [
    CommonModule
  ]
})
export class SdAngularModule {
  faConfig = inject(FaConfig);

  constructor() {
    this.faConfig.fallbackIcon = faQuestionCircle;
  }

  static forRoot(): ModuleWithProviders<SdAngularModule> {
    return {
      ngModule: SdAngularModule,
      providers: [
        {provide: EVENT_MANAGER_PLUGINS, useClass: SdAndroidBackbuttonEventPlugin, multi: true},
        {provide: EVENT_MANAGER_PLUGINS, useClass: SdSaveCommandEventPlugin, multi: true},
        {provide: EVENT_MANAGER_PLUGINS, useClass: SdRefreshCommandEventPlugin, multi: true},
        {provide: EVENT_MANAGER_PLUGINS, useClass: SdInsertCommandEventPlugin, multi: true},
        {provide: EVENT_MANAGER_PLUGINS, useClass: SdResizeEventPlugin, multi: true},
        {provide: EVENT_MANAGER_PLUGINS, useClass: SdPasteEventPlugin, multi: true},
        {provide: EVENT_MANAGER_PLUGINS, useClass: SdCaptureEventPlugin, multi: true},
        {provide: ErrorHandler, useClass: SdGlobalErrorHandlerPlugin}
      ]
    };
  }
}
