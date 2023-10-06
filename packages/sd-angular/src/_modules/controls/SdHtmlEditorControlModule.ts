import { SdHtmlEditorControl } from "../../controls/SdHtmlEditorControl";
import { SdAnchorControlModule } from "./SdAnchorControlModule";
import { SdDockContainerControlModule } from "./SdDockContainerControlModule";
import { SdPaneControlModule } from "./SdPaneControlModule";
import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { FontAwesomeModule } from "@fortawesome/angular-fontawesome";

@NgModule({
  imports: [CommonModule, FontAwesomeModule, SdAnchorControlModule, SdDockContainerControlModule, SdPaneControlModule],
  declarations: [SdHtmlEditorControl],
  exports: [SdHtmlEditorControl],
  providers: []
})
export class SdHtmlEditorControlModule {
}