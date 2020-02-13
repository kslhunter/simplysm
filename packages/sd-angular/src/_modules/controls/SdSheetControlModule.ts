import {NgModule, ApplicationModule} from "@angular/core";
import {SdSheetControl} from "../../controls/SdSheetControl";
import {SdSheetColumnControlModule} from "./SdSheetColumnControlModule";
import {SdAnchorControlModule} from "./SdAnchorControlModule";
import {SdIconControlModule} from "./SdIconControlModule";
import {SdDockControlModule} from "./SdDockControlModule";
import {SdPaginationControlModule} from "./SdPaginationControlModule";
import {SdPaneControlModule} from "./SdPaneControlModule";

@NgModule({
  imports: [
    ApplicationModule,
    SdSheetColumnControlModule,
    SdAnchorControlModule,
    SdIconControlModule,
    SdDockControlModule,
    SdPaginationControlModule,
    SdPaneControlModule
  ],
  declarations: [
    SdSheetControl
  ],
  exports: [
    SdSheetControl
  ],
  entryComponents: []
})
export class SdSheetControlModule {
}