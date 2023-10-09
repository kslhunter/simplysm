import {CommonModule} from "@angular/common";
import {NgModule} from "@angular/core";
import {SdCollapseControl} from "./SdCollapseControl";
import {SdCollapseIconControl} from "./SdCollapseIconControl";
import {SdResizeDirective} from "../../directives/SdResizeDirective";
import {FontAwesomeModule} from "@fortawesome/angular-fontawesome";

@NgModule({
  imports: [CommonModule, SdResizeDirective, FontAwesomeModule],
  declarations: [
    SdCollapseControl,
    SdCollapseIconControl
  ],
  exports: [
    SdCollapseControl,
    SdCollapseIconControl
  ],
  providers: []
})
export class SdCollapseModule {
}