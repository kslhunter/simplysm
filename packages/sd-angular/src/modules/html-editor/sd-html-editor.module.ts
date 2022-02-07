import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { SdHtmlEditorComponent } from "./sd-html-editor.component";
import { SdAnchorModule } from "../anchor";
import { SdDockModule } from "../dock";
import { FontAwesomeModule } from "@fortawesome/angular-fontawesome";
import { SdPaneModule } from "../pane";

@NgModule({
  imports: [CommonModule, SdAnchorModule, SdDockModule, FontAwesomeModule, SdPaneModule],
  declarations: [SdHtmlEditorComponent],
  exports: [SdHtmlEditorComponent],
  providers: []
})
export class SdHtmlEditorModule {
}
