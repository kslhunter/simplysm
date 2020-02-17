import {NgModule} from "@angular/core";
import {SdPaginationControl} from "../../controls/SdPaginationControl";
import {CommonModule} from "@angular/common";
import {SdAnchorControlModule} from "./SdAnchorControlModule";
import {SdIconControlModule} from "./SdIconControlModule";

@NgModule({
  imports: [
    CommonModule,
    SdAnchorControlModule,
    SdIconControlModule
  ],
  declarations: [
    SdPaginationControl
  ],
  exports: [
    SdPaginationControl
  ],
  entryComponents: []
})
export class SdPaginationControlModule {
}