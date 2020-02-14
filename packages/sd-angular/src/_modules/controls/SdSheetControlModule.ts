import {NgModule, ApplicationModule} from "@angular/core";
import {SdSheetControl} from "../../controls/SdSheetControl";
import {SdSheetColumnControlModule} from "./SdSheetColumnControlModule";
import {SdAngularModule} from "../../SdAngularModule";
import {SdAnchorControlModule} from "./SdAnchorControlModule";
import {CommonModule} from "@angular/common";
import {SdResizeDirectiveModule} from "../directives/SdResizeDirectiveModule";
import {SdIconControlModule} from "./SdIconControlModule";
import {SdDockControlModule} from "./SdDockControlModule";
import {SdPaginationControlModule} from "./SdPaginationControlModule";
import {SdPaneControlModule} from "./SdPaneControlModule";
import {SdSheetConfigModal} from "../../modals/SdSheetConfigModal";

@NgModule({
  imports: [
    ApplicationModule,
    SdSheetColumnControlModule,
    SdAngularModule,
    SdAnchorControlModule,
    CommonModule,
    SdResizeDirectiveModule,
    SdIconControlModule,
    SdDockControlModule,
    SdPaginationControlModule,
    SdPaneControlModule
  ],
  declarations: [
    SdSheetControl,
    SdSheetConfigModal
  ],
  exports: [
    SdSheetControl,
    SdSheetConfigModal
  ],
  entryComponents: [
    SdSheetConfigModal
  ]
})
export class SdSheetControlModule {
}