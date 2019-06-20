import {NgModule} from "@angular/core";
import {CommonModule} from "@angular/common";
import {SdSharedModule} from "../shared/SdSharedModule";
import {SdCheckboxControl} from "./SdCheckboxControl";
import {SdCheckboxGroupControl} from "./SdCheckboxGroupControl";
import {SdCheckboxGroupItemControl} from "./SdCheckboxGroupItemControl";
import {SdIconModule} from "../icon/SdIconModule";


@NgModule({
  imports: [
    CommonModule,
    SdSharedModule,
    SdIconModule
  ],
  exports: [
    SdCheckboxControl,
    SdCheckboxGroupControl,
    SdCheckboxGroupItemControl
  ],
  declarations: [
    SdCheckboxControl,
    SdCheckboxGroupControl,
    SdCheckboxGroupItemControl
  ]
})
export class SdCheckboxModule {
}
