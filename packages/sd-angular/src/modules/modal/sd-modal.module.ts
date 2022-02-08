import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { SdAnchorModule } from "../anchor";
import { SdDockModule } from "../dock";
import { FontAwesomeModule } from "@fortawesome/angular-fontawesome";
import { SdPaneModule } from "../pane";
import { SdModalControl } from "./sd-modal.control";
import { SdModalProvider } from "./sd-modal.provider";

@NgModule({
  imports: [CommonModule, SdAnchorModule, SdDockModule, FontAwesomeModule, SdPaneModule],
  declarations: [SdModalControl],
  exports: [SdModalControl],
  providers: [SdModalProvider]
})
export class SdModalModule {
}
