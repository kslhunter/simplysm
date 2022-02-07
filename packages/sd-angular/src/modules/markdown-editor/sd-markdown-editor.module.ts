import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { SdAnchorModule } from "../anchor";
import { SdBusyContainerModule } from "../busy-container";
import { FontAwesomeModule } from "@fortawesome/angular-fontawesome";
import { SdMarkdownEditorComponent } from "./sd-markdown-editor.component";

@NgModule({
  imports: [CommonModule, SdAnchorModule, SdBusyContainerModule, FontAwesomeModule],
  declarations: [SdMarkdownEditorComponent],
  exports: [SdMarkdownEditorComponent],
  providers: []
})
export class SdMarkdownEditorModule {
}
