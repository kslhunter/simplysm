import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { SdAnchorModule } from "../anchor";
import { SdCheckboxModule } from "../checkbox";
import { SdDockModule } from "../dock";
import { SdDropdownModule } from "../dropdown";
import { SdGapModule } from "../gap";
import { FontAwesomeModule } from "@fortawesome/angular-fontawesome";
import { SdPaneModule } from "../pane";
import { SdSelectControl } from "./sd-select.control";
import { SdSelectItemControl } from "./sd-select-item.control";

@NgModule({
  imports: [CommonModule, SdAnchorModule, SdCheckboxModule, SdDockModule, SdDropdownModule, SdGapModule, FontAwesomeModule, SdPaneModule],
  declarations: [SdSelectControl, SdSelectItemControl],
  exports: [SdSelectControl, SdSelectItemControl],
  providers: []
})
export class SdSelectModule {
}
