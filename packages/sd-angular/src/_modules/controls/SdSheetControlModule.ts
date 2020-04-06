import {NgModule, ApplicationModule} from "@angular/core";
import {SdSheetControl} from "../../controls/SdSheetControl";
import {SdSheetColumnControlModule} from "./SdSheetColumnControlModule";
import {SdModalProviderModule} from "../providers/SdModalProviderModule";
import {SdIconControlModule} from "./icons/SdIconControlModule";
import {CommonModule} from "@angular/common";
import {SdAnchorControlModule} from "./SdAnchorControlModule";
import {SdResizeDirectiveModule} from "../directives/SdResizeDirectiveModule";
import {SdDockControlModule} from "./SdDockControlModule";
import {SdGapControlModule} from "./SdGapControlModule";
import {SdPaneControlModule} from "./SdPaneControlModule";
import {SdPaginationControlModule} from "./SdPaginationControlModule";
import {SdSheetConfigModal} from "../../modals/SdSheetConfigModal";
import {SdButtonControlModule} from "./SdButtonControlModule";
import {SdCheckboxControlModule} from "./SdCheckboxControlModule";
import {SdTextfieldControlModule} from "./SdTextfieldControlModule";

@NgModule({
  imports: [
    ApplicationModule,
    SdSheetColumnControlModule,
    SdModalProviderModule,
    SdIconControlModule,
    CommonModule,
    SdAnchorControlModule,
    SdResizeDirectiveModule,
    SdDockControlModule,
    SdGapControlModule,
    SdPaneControlModule,
    SdPaginationControlModule,
    SdButtonControlModule,
    SdCheckboxControlModule,
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
  ],
  providers: []
})
export class SdSheetControlModule {
}