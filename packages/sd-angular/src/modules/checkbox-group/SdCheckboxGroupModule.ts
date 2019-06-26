import {NgModule} from "@angular/core";
import {CommonModule} from "@angular/common";
import {SdSharedModule} from "../shared/SdSharedModule";
import {SdCheckboxGroupControl} from "./SdCheckboxGroupControl";
import {SdCheckboxGroupItemControl} from "./SdCheckboxGroupItemControl";
import {SdCheckboxModule} from "../checkbox/SdCheckboxModule";


@NgModule({
  imports: [
    CommonModule,
    SdSharedModule,
    SdCheckboxModule
  ],
  exports: [
    SdCheckboxGroupControl,
    SdCheckboxGroupItemControl
  ],
  declarations: [
    SdCheckboxGroupControl,
    SdCheckboxGroupItemControl
  ]
})
export class SdCheckboxGroupModule {
}
