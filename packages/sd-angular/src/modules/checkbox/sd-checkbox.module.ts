import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { SdCheckboxComponent } from "./sd-checkbox.component";
import { FontAwesomeModule } from "@fortawesome/angular-fontawesome";

@NgModule({
  imports: [CommonModule, FontAwesomeModule],
  declarations: [SdCheckboxComponent],
  exports: [SdCheckboxComponent],
  providers: []
})
export class SdCheckboxModule {
}
