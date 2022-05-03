import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { SdAnchorModule } from "../anchor/sd-anchor.module";
import { SdCheckboxModule } from "../checkbox/sd-checkbox.module";
import { SdDockModule } from "../dock/sd-dock.module";
import { SdDropdownModule } from "../dropdown/sd-dropdown.module";
import { SdGapModule } from "../gap/sd-gap.module";
import { FontAwesomeModule } from "@fortawesome/angular-fontawesome";
import { SdPaneModule } from "../pane/sd-pane.module";
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
