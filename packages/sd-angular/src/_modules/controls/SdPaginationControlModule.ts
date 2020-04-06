import {NgModule} from "@angular/core";
import {SdPaginationControl} from "../../controls/SdPaginationControl";
import {SdIconControlModule} from "./icons/SdIconControlModule";
import {CommonModule} from "@angular/common";
import {SdAnchorControlModule} from "./SdAnchorControlModule";

@NgModule({
  imports: [
    SdIconControlModule,
    CommonModule,
    SdAnchorControlModule
  ],
  declarations: [
    SdPaginationControl
  ],
  exports: [
    SdPaginationControl
  ],
  entryComponents: [],
  providers: []
})
export class SdPaginationControlModule {
}