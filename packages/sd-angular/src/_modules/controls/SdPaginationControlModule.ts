import {NgModule} from "@angular/core";
import {SdPaginationControl} from "../../controls/SdPaginationControl";
import {SdAnchorControlModule} from "./SdAnchorControlModule";
import {CommonModule} from "@angular/common";
import {SdIconControlModule} from "./SdIconControlModule";

@NgModule({
  imports: [
    SdAnchorControlModule,
    CommonModule,
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