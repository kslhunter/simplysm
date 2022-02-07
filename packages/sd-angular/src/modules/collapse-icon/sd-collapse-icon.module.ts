import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { FontAwesomeModule } from "@fortawesome/angular-fontawesome";
import { SdCollapseIconControl } from "./sd-collapse-icon.control";

@NgModule({
  imports: [CommonModule, FontAwesomeModule],
  declarations: [SdCollapseIconControl],
  exports: [SdCollapseIconControl],
  providers: []
})
export class SdCollapseIconModule {
}
