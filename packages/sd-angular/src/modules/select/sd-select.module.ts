import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { SdAnchorModule } from "../anchor";
import { SdCheckboxModule } from "../checkbox";
import { SdDockModule } from "../dock";
import { SdDropdownModule } from "../dropdown";
import { SdGapModule } from "../gap";
import { FontAwesomeModule } from "@fortawesome/angular-fontawesome";
import { SdPaneModule } from "../pane";
import { SdSelectComponent } from "./sd-select.component";
import { SdSelectItemComponent } from "./sd-select-item.component";

@NgModule({
  imports: [CommonModule, SdAnchorModule, SdCheckboxModule, SdDockModule, SdDropdownModule, SdGapModule, FontAwesomeModule, SdPaneModule],
  declarations: [SdSelectComponent, SdSelectItemComponent],
  exports: [SdSelectComponent, SdSelectItemComponent],
  providers: []
})
export class SdSelectModule {
}
