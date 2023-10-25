import {CommonModule} from "@angular/common";
import {NgModule} from "@angular/core";
import {SdCollapseControl} from "./SdCollapseControl";
import {SdCollapseIconControl} from "./SdCollapseIconControl";
import {SdIconControl} from "../SdIconControl";


@NgModule({
  imports: [CommonModule, SdIconControl],
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