import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { SdPaneComponent } from "./sd-pane.component";

@NgModule({
  imports: [CommonModule],
  declarations: [SdPaneComponent],
  exports: [SdPaneComponent],
  providers: []
})
export class SdPaneModule {
}
