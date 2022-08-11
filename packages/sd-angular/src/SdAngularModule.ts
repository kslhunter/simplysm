import { ErrorHandler, ModuleWithProviders, NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { SdGlobalErrorHandlerPlugin } from "./plugins/SdGlobalErrorHandlerPlugin";
import { FaConfig } from "@fortawesome/angular-fontawesome";
import { faQuestionCircle as fasQuestionCircle } from "@fortawesome/free-solid-svg-icons/faQuestionCircle";

@NgModule({
  imports: [
    CommonModule
  ]
})
export class SdAngularModule {
  public constructor(private readonly _faConfig: FaConfig) {
    this._faConfig.fallbackIcon = fasQuestionCircle;
  }

  public static forRoot(): ModuleWithProviders<SdAngularModule> {
    return {
      ngModule: SdAngularModule,
      providers: [
        { provide: ErrorHandler, useClass: SdGlobalErrorHandlerPlugin }
      ]
    };
  }
}
