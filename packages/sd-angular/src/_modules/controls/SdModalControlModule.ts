import { SdModalControl } from "../../controls/SdModalControl";
import { SdAnchorControlModule } from "./SdAnchorControlModule";
import { SdDockContainerControlModule } from "./SdDockContainerControlModule";
import { SdPaneControlModule } from "./SdPaneControlModule";
import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { FontAwesomeModule } from "@fortawesome/angular-fontawesome";

@NgModule({
  imports: [CommonModule, FontAwesomeModule, SdAnchorControlModule, SdDockContainerControlModule, SdPaneControlModule],
  declarations: [SdModalControl],
  exports: [SdModalControl],
  providers: []
})
export class SdModalControlModule {
}