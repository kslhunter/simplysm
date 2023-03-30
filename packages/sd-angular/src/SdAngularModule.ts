import { ErrorHandler, ModuleWithProviders, NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { EVENT_MANAGER_PLUGINS } from "@angular/platform-browser";
import { SdSaveEventPlugin } from "./plugins/SdSaveEventPlugin";
import { SdDataRefreshEventPlugin } from "./plugins/SdDataRefreshEventPlugin";
import { SdInsertEventPlugin } from "./plugins/SdInsertEventPlugin";
import { SdCopyEventPlugin } from "./plugins/SdCopyEventPlugin";
import { SdResizeEventPlugin } from "./plugins/SdResizeEventPlugin";
import { SdMutationEventPlugin } from "./plugins/SdMutationEventPlugin";
import { SdPasteEventPlugin } from "./plugins/SdPasteEventPlugin";
import { SdGlobalErrorHandlerPlugin } from "./plugins/SdGlobalErrorHandlerPlugin";
import { FaConfig } from "@fortawesome/angular-fontawesome";
import { faQuestionCircle } from "@fortawesome/pro-light-svg-icons/faQuestionCircle";

@NgModule({
  imports: [
    CommonModule
  ]
})
export class SdAngularModule {
  public constructor(private readonly _faConfig: FaConfig) {
    this._faConfig.fallbackIcon = faQuestionCircle;
  }

  public static forRoot(): ModuleWithProviders<SdAngularModule> {
    return {
      ngModule: SdAngularModule,
      providers: [
        { provide: EVENT_MANAGER_PLUGINS, useClass: SdSaveEventPlugin, multi: true },
        { provide: EVENT_MANAGER_PLUGINS, useClass: SdDataRefreshEventPlugin, multi: true },
        { provide: EVENT_MANAGER_PLUGINS, useClass: SdInsertEventPlugin, multi: true },
        { provide: EVENT_MANAGER_PLUGINS, useClass: SdCopyEventPlugin, multi: true },
        { provide: EVENT_MANAGER_PLUGINS, useClass: SdResizeEventPlugin, multi: true },
        { provide: EVENT_MANAGER_PLUGINS, useClass: SdMutationEventPlugin, multi: true },
        { provide: EVENT_MANAGER_PLUGINS, useClass: SdPasteEventPlugin, multi: true },
        { provide: ErrorHandler, useClass: SdGlobalErrorHandlerPlugin }
      ]
    };
  }
}
