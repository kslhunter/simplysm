import {NgModule} from "@angular/core";
import {CommonModule} from "@angular/common";
import {SdSharedModule} from "../shared/SdSharedModule";
import {SdNavigateDirective} from "./SdNavigateDirective";
import {SdWindowModule} from "../window/SdWindowModule";

@NgModule({
  imports: [
    CommonModule,
    SdSharedModule,
    SdWindowModule
  ],
  exports: [
    SdNavigateDirective
  ],
  declarations: [
    SdNavigateDirective
  ]
})
export class SdNavigateModule {
}
