import {NgModule, ApplicationModule} from "@angular/core";
import {SdSheetControl} from "../../controls/SdSheetControl";
import {SdSheetColumnControlModule} from "./SdSheetColumnControlModule";
import {SdAngularModule} from "../../SdAngularModule";
import {SdAnchorControlModule} from "./SdAnchorControlModule";
import {CommonModule} from "@angular/common";
import {SdIconControlModule} from "./SdIconControlModule";
import {SdResizeDirectiveModule} from "../directives/SdResizeDirectiveModule";
import {SdPaneControlModule} from "./SdPaneControlModule";
import {SdPaginationControlModule} from "./SdPaginationControlModule";
import {SdModalEntryControlModule} from "./SdModalEntryControlModule";
import {SdSheetConfigModal} from "../../modals/SdSheetConfigModal";
import {SdButtonControlModule} from "./SdButtonControlModule";
import {SdCheckboxControlModule} from "./SdCheckboxControlModule";
import {SdTextfieldControlModule} from "./SdTextfieldControlModule";
import {SdGapControlModule} from "./SdGapControlModule";

@NgModule({
  imports: [
    ApplicationModule,
    SdSheetColumnControlModule,
    SdAngularModule,
    SdAnchorControlModule,
    CommonModule,
    SdIconControlModule,
    SdResizeDirectiveModule,
    SdPaneControlModule,
    SdPaginationControlModule,
    SdModalEntryControlModule,
    SdButtonControlModule,
    SdCheckboxControlModule,
    SdTextfieldControlModule,
    SdGapControlModule
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