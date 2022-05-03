import { ErrorHandler, ModuleWithProviders, NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { EVENT_MANAGER_PLUGINS } from "@angular/platform-browser";
import { SdSaveEventPlugin } from "./plugins/sd-save-event.plugin";
import { SdDataRefreshEventPlugin } from "./plugins/sd-data-refresh-event.plugin";
import { SdInsertEventPlugin } from "./plugins/sd-insert-event.plugin";
import { SdCopyEventPlugin } from "./plugins/sd-copy-event.plugin";
import { SdResizeEventPlugin } from "./plugins/sd-resize-event.plugin";
import { SdMutationEventPlugin } from "./plugins/sd-mutation-event.plugin";
import { SdPasteEventPlugin } from "./plugins/sd-paste-event-plugin";
import { SdGlobalErrorHandlerPlugin } from "./plugins/sd-global-error-handler.plugin";

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
