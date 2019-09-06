import {NgModule} from "@angular/core";
import {CommonModule} from "@angular/common";
import {SdSharedModule} from "../shared/SdSharedModule";
import {SdPaginationModule} from "../pagination/SdPaginationModule";
import {SdIconModule} from "../icon/SdIconModule";
import {SdSheetControl} from "./SdSheetControl";
import {SdSheetColumnControl} from "./SdSheetColumnControl";
import {SdCardModule} from "../card/SdCardModule";
import {SdGridModule} from "../grid/SdGridModule";
import {SdDockModule} from "../dock/SdDockModule";
import {SdPaneModule} from "../pane/SdPaneModule";
import {SdDropdownModule} from "../dropdown/SdDropdownModule";
import {SdListModule} from "../list/SdListModule";
import {SdCheckboxModule} from "../checkbox/SdCheckboxModule";
import {SdFormModule} from "../form/SdFormModule";
import {SdTextfieldModule} from "../textfield/SdTextfieldModule";
import {SdMultiSelectModule} from "../multi-select/SdMultiSelectModule";

@NgModule({
  imports: [
    CommonModule,
    SdSharedModule,
    SdPaginationModule,
    SdIconModule,
    SdCardModule,
    SdGridModule,
    SdDockModule,
    SdPaneModule,
    SdDropdownModule,
    SdListModule,
    SdCheckboxModule,
    SdFormModule,
    SdTextfieldModule,
    SdMultiSelectModule
  ],
  exports: [
    SdSheetControl,
    SdSheetColumnControl
  ],
  declarations: [
    SdSheetControl,
    SdSheetColumnControl
  ]
})
export class SdSheetModule {
}
