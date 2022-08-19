import { ErrorHandler, ModuleWithProviders, NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { SdGlobalErrorHandlerPlugin } from "./plugins/SdGlobalErrorHandlerPlugin";

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
        { provide: ErrorHandler, useClass: SdGlobalErrorHandlerPlugin }
      ]
    };
  }
}
