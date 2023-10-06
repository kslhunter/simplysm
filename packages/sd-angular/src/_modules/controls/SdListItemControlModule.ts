import { SdListItemControl } from "../../controls/SdListItemControl";
import { SdCollapseControlModule } from "./SdCollapseControlModule";
import { SdCollapseIconControlModule } from "./SdCollapseIconControlModule";
import { SdFlexControlModule } from "./SdFlexControlModule";
import { SdListControlModule } from "./SdListControlModule";
import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { FontAwesomeModule } from "@fortawesome/angular-fontawesome";

@NgModule({
  imports: [CommonModule, FontAwesomeModule, SdCollapseControlModule, SdCollapseIconControlModule, SdFlexControlModule, SdListControlModule],
  declarations: [SdListItemControl],
  exports: [SdListItemControl],
  providers: []
})
export class SdListItemControlModule {
}