import {platformBrowserDynamic} from "@angular/platform-browser-dynamic";
import {HmrAppModuleBase} from "./HmrAppModuleBase";
import {Type} from "@angular/core";
import {bootloader, hmrModule} from "@angularclass/hmr";

export function hmrBootstrap(module: NodeModule, appModuleType: Type<HmrAppModuleBase>): void {
  bootloader(
    () => platformBrowserDynamic().bootstrapModule(appModuleType)
      .then((ngModuleRef: any) => {
        return hmrModule(ngModuleRef, module);
      })
  );
}