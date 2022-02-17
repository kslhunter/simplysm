import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { SdHtmlEditorControl } from "./sd-html-editor.control";
import { SdAnchorModule } from "../anchor/sd-anchor.module";
import { SdDockModule } from "../dock/sd-dock.module";
import { FontAwesomeModule } from "@fortawesome/angular-fontawesome";
import { SdPaneModule } from "../pane/sd-pane.module";

@NgModule({
  imports: [CommonModule, SdAnchorModule, SdDockModule, FontAwesomeModule, SdPaneModule],
  declarations: [SdHtmlEditorControl],
  exports: [SdHtmlEditorControl],
  providers: []
})
export class SdHtmlEditorModule {
}
