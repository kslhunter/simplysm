import {NgModule, ApplicationModule} from "@angular/core";
import {SdSheetConfigModal} from "../../modals/SdSheetConfigModal";
import {SdSheetColumnControlModule} from "../controls/SdSheetColumnControlModule";
import {SdAnchorControlModule} from "../controls/SdAnchorControlModule";
import {SdButtonControlModule} from "../controls/SdButtonControlModule";
import {SdCheckboxControlModule} from "../controls/SdCheckboxControlModule";
import {SdIconControlModule} from "../controls/SdIconControlModule";
import {SdTextfieldControlModule} from "../controls/SdTextfieldControlModule";
import {SdGapControlModule} from "../controls/SdGapControlModule";
import {SdPaneControlModule} from "../controls/SdPaneControlModule";
import {SdModalEntryControlModule} from "../controls/SdModalEntryControlModule";
import {SdSheetControl} from "../../controls/SdSheetControl";
import {SdAngularModule} from "../../SdAngularModule";
import {CommonModule} from "@angular/common";
import {SdResizeDirectiveModule} from "../directives/SdResizeDirectiveModule";
import {SdPaginationControlModule} from "../controls/SdPaginationControlModule";

@NgModule({
  imports: [
    SdSheetColumnControlModule,
    SdAnchorControlModule,
    SdButtonControlModule,
    SdCheckboxControlModule,
    SdIconControlModule,
    SdTextfieldControlModule,
    SdGapControlModule,
    SdPaneControlModule,
    SdModalEntryControlModule,
    ApplicationModule,
    SdAngularModule,
    CommonModule,
    SdResizeDirectiveModule,
    SdPaginationControlModule
  ],
  declarations: [
    SdSheetConfigModal,
    SdSheetControl
  ],
  exports: [
    SdSheetConfigModal,
    SdSheetControl
  ],
  entryComponents: [
    SdSheetConfigModal
  ]
})
export class SdSheetConfigModalModule {
}