import {NgModule} from "@angular/core";
import {CommonModule} from "@angular/common";
import {SdSharedModule} from "../shared/SdSharedModule";
import {SdDomValidatorProvider} from "./SdDomValidatorProvider";

@NgModule({
  imports: [
    CommonModule,
    SdSharedModule
  ],
  providers: [
    SdDomValidatorProvider
  ]
})
export class SdDomValidatorModule {
}
