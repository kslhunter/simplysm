import { ErrorHandler, ModuleWithProviders, NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { EVENT_MANAGER_PLUGINS } from "@angular/platform-browser";
import { SdSaveEventPlugin } from "./internal-plugins/sd-save-event.plugin";
import { SdDataRefreshEventPlugin } from "./internal-plugins/sd-data-refresh-event.plugin";
import { SdInsertEventPlugin } from "./internal-plugins/sd-insert-event.plugin";
import { SdCopyEventPlugin } from "./internal-plugins/sd-copy-event.plugin";
import { SdResizeEventPlugin } from "./internal-plugins/sd-resize-event.plugin";
import { SdMutationEventPlugin } from "./internal-plugins/sd-mutation-event.plugin";
import { SdPasteEventPlugin } from "./internal-plugins/sd-paste-event-plugin";
import { SdGlobalErrorHandlerPlugin } from "./internal-plugins/sd-global-error-handler.plugin";

@NgModule({
  imports: [
    CommonModule
  ]
})
export class SdAngularModule {
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
