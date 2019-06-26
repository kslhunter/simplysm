import {NgModule} from "@angular/core";
import {CommonModule} from "@angular/common";
import {SdSharedModule} from "../shared/SdSharedModule";
import {SdCheckboxControl} from "./SdCheckboxControl";
import {SdIconModule} from "../icon/SdIconModule";


@NgModule({
  imports: [
    CommonModule,
    SdSharedModule,
    SdIconModule
  ],
  exports: [
    SdCheckboxControl
  ],
  declarations: [
    SdCheckboxControl
  ]
})
export class SdCheckboxModule {
}
