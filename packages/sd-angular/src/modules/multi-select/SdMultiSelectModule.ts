import {NgModule} from "@angular/core";
import {CommonModule} from "@angular/common";
import {SdSharedModule} from "../shared/SdSharedModule";
import {SdDropdownModule} from "../dropdown/SdDropdownModule";
import {SdIconModule} from "../icon/SdIconModule";
import {SdDockModule} from "../dock/SdDockModule";
import {SdMultiSelectControl} from "./SdMultiSelectControl";
import {SdMultiSelectItemControl} from "./SdMultiSelectItemControl";
import {SdCheckboxModule} from "../checkbox/SdCheckboxModule";
import {SdPaneModule} from "../pane/SdPaneModule";

@NgModule({
  imports: [
    CommonModule,
    SdSharedModule,
    SdDropdownModule,
    SdIconModule,
    SdDockModule,
    SdCheckboxModule,
    SdPaneModule
  ],
  exports: [
    SdMultiSelectControl,
    SdMultiSelectItemControl
  ],
  declarations: [
    SdMultiSelectControl,
    SdMultiSelectItemControl
  ]
})
export class SdMultiSelectModule {
}
