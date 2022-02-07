import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { SdContentEditorControl } from "./sd-content-editor.control";

@NgModule({
  imports: [CommonModule],
  declarations: [SdContentEditorControl],
  exports: [SdContentEditorControl],
  providers: []
})
export class SdContentEditorModule {
}
