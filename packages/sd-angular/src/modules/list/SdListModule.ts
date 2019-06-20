import {NgModule} from "@angular/core";
import {CommonModule} from "@angular/common";
import {SdSharedModule} from "../shared/SdSharedModule";
import {SdIconModule} from "../icon/SdIconModule";
import {SdListControl} from "./SdListControl";
import {SdListItemControl} from "./SdListItemControl";
import {SdListItemButtonControl} from "./SdListItemButtonControl";


@NgModule({
  imports: [
    CommonModule,
    SdSharedModule,
    SdIconModule
  ],
  exports: [
    SdListControl,
    SdListItemControl,
    SdListItemButtonControl
  ],
  declarations: [
    SdListControl,
    SdListItemControl,
    SdListItemButtonControl
  ]
})
export class SdListModule {
}
