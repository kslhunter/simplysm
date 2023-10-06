import { SdSheetControl } from "../../controls/SdSheetControl";
import { SdSheetConfigModal } from "../../modals/SdSheetConfigModal";
import { SdResizeOutsideDirectiveModule } from "../directives/SdResizeOutsideDirectiveModule";
import { SdModalProviderModule } from "../providers/SdModalProviderModule";
import { SdAnchorControlModule } from "./SdAnchorControlModule";
import { SdBusyContainerControlModule } from "./SdBusyContainerControlModule";
import { SdButtonControlModule } from "./SdButtonControlModule";
import { SdCheckboxControlModule } from "./SdCheckboxControlModule";
import { SdDockContainerControlModule } from "./SdDockContainerControlModule";
import { SdFlexControlModule } from "./SdFlexControlModule";
import { SdPaginationControlModule } from "./SdPaginationControlModule";
import { SdPaneControlModule } from "./SdPaneControlModule";
import { SdSheetColumnControlModule } from "./SdSheetColumnControlModule";
import { SdTextfieldControlModule } from "./SdTextfieldControlModule";
import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { FontAwesomeModule } from "@fortawesome/angular-fontawesome";

@NgModule({
  imports: [CommonModule, FontAwesomeModule, SdAnchorControlModule, SdBusyContainerControlModule, SdButtonControlModule, SdCheckboxControlModule, SdDockContainerControlModule, SdFlexControlModule, SdModalProviderModule, SdPaginationControlModule, SdPaneControlModule, SdResizeOutsideDirectiveModule, SdSheetColumnControlModule, SdTextfieldControlModule],
  declarations: [SdSheetConfigModal, SdSheetControl],
  exports: [SdSheetConfigModal, SdSheetControl],
  providers: []
})
export class SdSheetControlModule {
}