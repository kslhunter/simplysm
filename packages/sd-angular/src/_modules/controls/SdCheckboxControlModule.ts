import { SdCheckboxControl } from "../../controls/SdCheckboxControl";
import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { FontAwesomeModule } from "@fortawesome/angular-fontawesome";

@NgModule({
  imports: [CommonModule, FontAwesomeModule],
  declarations: [SdCheckboxControl],
  exports: [SdCheckboxControl],
  providers: []
})
export class SdCheckboxControlModule {
}