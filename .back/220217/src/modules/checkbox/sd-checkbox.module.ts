import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { SdCheckboxControl } from "./sd-checkbox.control";
import { FontAwesomeModule } from "@fortawesome/angular-fontawesome";

@NgModule({
  imports: [CommonModule, FontAwesomeModule],
  declarations: [SdCheckboxControl],
  exports: [SdCheckboxControl],
  providers: []
})
export class SdCheckboxModule {
}
