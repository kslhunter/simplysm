import { SdMarkdownEditorControl } from "../../controls/SdMarkdownEditorControl";
import { SdAnchorControlModule } from "./SdAnchorControlModule";
import { SdBusyContainerControlModule } from "./SdBusyContainerControlModule";
import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { FontAwesomeModule } from "@fortawesome/angular-fontawesome";

@NgModule({
  imports: [CommonModule, FontAwesomeModule, SdAnchorControlModule, SdBusyContainerControlModule],
  declarations: [SdMarkdownEditorControl],
  exports: [SdMarkdownEditorControl],
  providers: []
})
export class SdMarkdownEditorControlModule {
}