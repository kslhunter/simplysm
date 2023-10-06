import { SdCollapseIconControl } from "../../controls/SdCollapseIconControl";
import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { FontAwesomeModule } from "@fortawesome/angular-fontawesome";

@NgModule({
  imports: [CommonModule, FontAwesomeModule],
  declarations: [SdCollapseIconControl],
  exports: [SdCollapseIconControl],
  providers: []
})
export class SdCollapseIconControlModule {
}