import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { SdAnchorModule } from "../anchor/sd-anchor.module";
import { SdBusyModule } from "../busy/sd-busy.module";
import { FontAwesomeModule } from "@fortawesome/angular-fontawesome";
import { SdMarkdownEditorControl } from "./sd-markdown-editor.control";

@NgModule({
  imports: [CommonModule, SdAnchorModule, SdBusyModule, FontAwesomeModule],
  declarations: [SdMarkdownEditorControl],
  exports: [SdMarkdownEditorControl],
  providers: []
})
export class SdMarkdownEditorModule {
}
