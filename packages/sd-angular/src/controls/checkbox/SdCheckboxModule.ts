import {CommonModule} from "@angular/common";
import {NgModule} from "@angular/core";
import {SdCheckboxControl} from "./SdCheckboxControl";
import {SdCheckboxGroupControl} from "./SdCheckboxGroupControl";
import {SdCheckboxGroupItemControl} from "./SdCheckboxGroupItemControl";
import {SdIconControl} from "../SdIconControl";


@NgModule({
  imports: [CommonModule, SdIconControl],
  declarations: [SdCheckboxControl, SdCheckboxGroupControl, SdCheckboxGroupItemControl],
  exports: [SdCheckboxControl, SdCheckboxGroupControl, SdCheckboxGroupItemControl],
  providers: []
})
export class SdCheckboxModule {
}