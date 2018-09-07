import {platformBrowserDynamic} from "@angular/platform-browser-dynamic";
import {HmrAppModuleBase} from "./HmrAppModuleBase";
import {Type} from "@angular/core";
import {bootloader, hmrModule} from "@angularclass/hmr";

export function hmrBootstrap(module: NodeModule, appModuleType: Type<HmrAppModuleBase>): void {
  bootloader(async () => {
    const ngModuleRef = await platformBrowserDynamic().bootstrapModule(appModuleType);
    return await hmrModule(ngModuleRef, module);
  });
}