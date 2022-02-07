import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { SdContentEditorComponent } from "./sd-content-editor.component";

@NgModule({
  imports: [CommonModule],
  declarations: [SdContentEditorComponent],
  exports: [SdContentEditorComponent],
  providers: []
})
export class SdContentEditorModule {
}
