import {SdTopbarControl} from "./SdTopbarControl";
import {CommonModule} from "@angular/common";
import {NgModule} from "@angular/core";
import {SdTopbarMenuControl} from "./SdTopbarMenuControl";
import {SdTopbarTabControl} from "./SdTopbarTabControl";
import {SdTopbarContainerControl} from "./SdTopbarContainerControl";
import {SdAnchorControl} from "../SdAnchorControl";

import {SdGapControl} from "../SdGapControl";
import {SdTopbarNavControl} from "./SdTopbarNavControl";
import {SdIconControl} from "../SdIconControl";

@NgModule({
  imports: [CommonModule, SdAnchorControl, SdGapControl, SdIconControl],
  declarations: [
    SdTopbarMenuControl,
    SdTopbarControl,
    SdTopbarTabControl,
    SdTopbarContainerControl,
    SdTopbarNavControl
  ],
  exports: [
    SdTopbarMenuControl,
    SdTopbarControl,
    SdTopbarTabControl,
    SdTopbarContainerControl,
    SdTopbarNavControl
  ],
  providers: []
})
export class SdTopbarModule {
}