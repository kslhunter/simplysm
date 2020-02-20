import {NgModule, ApplicationModule} from "@angular/core";
import {SdSheetControl} from "../../controls/SdSheetControl";
import {SdSheetColumnControlModule} from "./SdSheetColumnControlModule";
import {SdAngularModule} from "../../SdAngularModule";
import {CommonModule} from "@angular/common";
import {SdAnchorControlModule} from "./SdAnchorControlModule";
import {SdDockControlModule} from "./SdDockControlModule";
import {SdIconControlModule} from "./SdIconControlModule";
import {SdPaginationControlModule} from "./SdPaginationControlModule";
import {SdPaneControlModule} from "./SdPaneControlModule";
import {SdResizeDirectiveModule} from "../directives/SdResizeDirectiveModule";
import {SdSheetConfigModal} from "../../modals/SdSheetConfigModal";
import {SdButtonControlModule} from "./SdButtonControlModule";
import {SdCheckboxControlModule} from "./SdCheckboxControlModule";
import {SdGapControlModule} from "./SdGapControlModule";
import {SdTextfieldControlModule} from "./SdTextfieldControlModule";

@NgModule({
  imports: [
    ApplicationModule,
    SdSheetColumnControlModule,
    SdAngularModule,
    CommonModule,
    SdAnchorControlModule,
    SdDockControlModule,
    SdIconControlModule,
    SdPaginationControlModule,
    SdPaneControlModule,
    SdResizeDirectiveModule,
    SdButtonControlModule,
    SdCheckboxControlModule,
    SdGapControlModule,
    SdTextfieldControlModule
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