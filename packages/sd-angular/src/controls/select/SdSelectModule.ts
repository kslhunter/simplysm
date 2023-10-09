import {SdSelectControl} from "./SdSelectControl";
import {SdSelectItemControl} from "./SdSelectItemControl";
import {CommonModule} from "@angular/common";
import {NgModule} from "@angular/core";
import {SdCheckboxModule} from "../checkbox/SdCheckboxModule";
import {SdDropdownModule} from "../dropdown/SdDropdownModule";
import {FontAwesomeModule} from "@fortawesome/angular-fontawesome";
import {SdDockingModule} from "../dock/SdDockingModule";
import {SdAnchorControl} from "../SdAnchorControl";
import {SdGapControl} from "../SdGapControl";
import {SdPaneControl} from "../SdPaneControl";

@NgModule({
  imports: [CommonModule, SdCheckboxModule, SdDropdownModule, FontAwesomeModule, SdDockingModule, SdAnchorControl, SdGapControl, SdPaneControl],
  declarations: [SdSelectControl, SdSelectItemControl],
  exports: [SdSelectControl, SdSelectItemControl],
  providers: []
})
export class SdSelectModule {
}