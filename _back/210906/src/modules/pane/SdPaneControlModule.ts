import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { SdPaneControl } from "./SdPaneControl";

@NgModule({
  imports: [
    CommonModule
  ],
  declarations: [
    SdPaneControl
  ],
  exports: [
    SdPaneControl
  ]
})
export class SdPaneControlModule {
}
