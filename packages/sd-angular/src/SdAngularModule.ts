import {ErrorHandler, ModuleWithProviders, NgModule} from "@angular/core";
import {CommonModule} from "@angular/common";
import {SdAngularGlobalErrorHandler} from "./commons/SdAngularGlobalErrorHandler";
import {EVENT_MANAGER_PLUGINS} from "@angular/platform-browser";
import {SdResizeEventPlugin} from "./commons/SdResizeEventPlugin";
import {SdMutationEventPlugin} from "./commons/SdMutationEventPlugin";
import {SdBusyContainerProvider} from "./providers/SdBusyContainerProvider";
import {SdLocalStorageProvider} from "./providers/SdLocalStorageProvider";
import {SdNavigateWindowProvider} from "./providers/SdNavigateWindowProvider";
import {SdSystemConfigProvider} from "./providers/SdSystemConfigProvider";
import {SdModalProvider} from "./providers/SdModalProvider";
import {SdSystemLogProvider} from "./providers/SdSystemLogProvider";
import {SdDomValidatorProvider} from "./providers/SdDomValidatorProvider";
import {SdFileDialogProvider} from "./providers/SdFileDialogProvider";
import {SdPrintProvider} from "./providers/SdPrintProvider";
import {SdToastProvider} from "./providers/SdToastProvider";
import {SdCryptoServiceProvider} from "./providers/SdCryptoServiceProvider";
import {SdSmtpClientServiceProvider} from "./providers/SdSmtpClientServiceProvider";
import {SdOrmServiceProvider} from "./providers/SdOrmServiceProvider";
import {SdServiceProvider} from "./providers/SdServiceProvider";

@NgModule({
  imports: [
    CommonModule
  ],
  providers: [
    SdModalProvider,
    SdPrintProvider,
    SdDomValidatorProvider,
    SdFileDialogProvider,
    SdNavigateWindowProvider
  ]
})
export class SdAngularModule {
  public constructor() {
    if (!window.navigator.userAgent.includes("Chrome")) {
      throw new Error("크롬외의 브라우저는 지원 하지 않습니다.");
    }
  }

  public static forRoot(): ModuleWithProviders<SdAngularModule> {
    return {
      ngModule: SdAngularModule,
      providers: [
        SdBusyContainerProvider,
        SdToastProvider,
        SdLocalStorageProvider,
        SdSystemConfigProvider,
        SdSystemLogProvider,
        SdServiceProvider,
        SdCryptoServiceProvider,
        SdSmtpClientServiceProvider,
        SdOrmServiceProvider,
        {provide: EVENT_MANAGER_PLUGINS, useClass: SdResizeEventPlugin, multi: true},
        {provide: EVENT_MANAGER_PLUGINS, useClass: SdMutationEventPlugin, multi: true},
        {provide: ErrorHandler, useClass: SdAngularGlobalErrorHandler}
      ]
    };
  }
}
