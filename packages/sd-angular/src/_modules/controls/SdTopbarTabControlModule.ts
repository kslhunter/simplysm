import { SdTopbarTabControl } from "../../controls/SdTopbarTabControl";
import { SdAnchorControlModule } from "./SdAnchorControlModule";
import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { FontAwesomeModule } from "@fortawesome/angular-fontawesome";

@NgModule({
  imports: [CommonModule, FontAwesomeModule, SdAnchorControlModule],
  declarations: [SdTopbarTabControl],
  exports: [SdTopbarTabControl],
  providers: []
})
export class SdTopbarTabControlModule {
}