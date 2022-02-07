import { ErrorHandler, ModuleWithProviders, NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { SdGlobalErrorHandlerService } from "./sd-global-error-handler.service";

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
        { provide: ErrorHandler, useClass: SdGlobalErrorHandlerService }
      ]
    };
  }
}
