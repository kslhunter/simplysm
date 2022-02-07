import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { SdPaneControl } from "./sd-pane.control";

@NgModule({
  imports: [CommonModule],
  declarations: [SdPaneControl],
  exports: [SdPaneControl],
  providers: []
})
export class SdPaneModule {
}
