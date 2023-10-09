import {SdTopbarControl} from "./SdTopbarControl";
import {CommonModule} from "@angular/common";
import {NgModule} from "@angular/core";
import {SdTopbarMenuControl} from "./SdTopbarMenuControl";
import {SdTopbarTabControl} from "./SdTopbarTabControl";
import {SdTopbarContainerControl} from "./SdTopbarContainerControl";
import {SdAnchorControl} from "../SdAnchorControl";
import {FontAwesomeModule} from "@fortawesome/angular-fontawesome";
import {SdGapControl} from "../SdGapControl";

@NgModule({
  imports: [CommonModule, SdAnchorControl, FontAwesomeModule, SdGapControl],
  declarations: [
    SdTopbarMenuControl,
    SdTopbarControl,
    SdTopbarTabControl,
    SdTopbarContainerControl,
  ],
  exports: [
    SdTopbarMenuControl,
    SdTopbarControl,
    SdTopbarTabControl,
    SdTopbarContainerControl,
  ],
  providers: []
})
export class SdTopbarModule {
}