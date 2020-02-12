import {NgModule} from "@angular/core";
import {../../controls/SdPaginationControl} from "../../controls/SdPaginationControl";
import {SdAnchorControlModule} from "./SdAnchorControlModule";
import {SdIconControlModule} from "./SdIconControlModule";

@NgModule({
  imports: [
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