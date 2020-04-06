import {NgModule} from "@angular/core";
import {CommonModule} from "@angular/common";
import {SdPaginationControl} from "../../controls/SdPaginationControl";
import {SdIconControlModule} from "./icons/SdIconControlModule";
import {SdAnchorControlModule} from "./SdAnchorControlModule";

@NgModule({
  imports: [
    CommonModule,
    SdIconControlModule,
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