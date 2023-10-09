import {CommonModule} from "@angular/common";
import {NgModule} from "@angular/core";
import {SdCheckboxControl} from "./SdCheckboxControl";
import {SdCheckboxGroupControl} from "./SdCheckboxGroupControl";
import {SdCheckboxGroupItemControl} from "./SdCheckboxGroupItemControl";
import {FontAwesomeModule} from "@fortawesome/angular-fontawesome";

@NgModule({
  imports: [CommonModule, FontAwesomeModule],
  declarations: [SdCheckboxControl, SdCheckboxGroupControl, SdCheckboxGroupItemControl],
  exports: [SdCheckboxControl, SdCheckboxGroupControl, SdCheckboxGroupItemControl],
  providers: []
})
export class SdCheckboxModule {
}