import {NgModule, ApplicationModule} from "@angular/core";
import {SdSheetControl} from "../controls/SdSheetControl";
import {SdSheetColumnControlModule} from "./SdSheetColumnControlModule";
import {SdAngularModule} from "../SdAngularModule";
import {SdAnchorControlModule} from "./SdAnchorControlModule";
import {SdIconControlModule} from "./SdIconControlModule";
import {SdDockControlModule} from "./SdDockControlModule";
import {SdDockContainerControlModule} from "./SdDockContainerControlModule";
import {SdPaginationControlModule} from "./SdPaginationControlModule";
import {SdPaneControlModule} from "./SdPaneControlModule";

@NgModule({
  imports: [
    ApplicationModule,
    SdSheetColumnControlModule,
    SdAngularModule,
    SdAnchorControlModule,
    SdIconControlModule,
    SdDockControlModule,
    SdDockContainerControlModule,
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