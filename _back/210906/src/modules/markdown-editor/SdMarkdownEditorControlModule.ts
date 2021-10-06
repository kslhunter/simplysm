import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { SdMarkdownEditorControl } from "./SdMarkdownEditorControl";
import { SdIconControlModule } from "../icon/SdIconControlModule";
import { SdAnchorControlModule } from "../anchor/SdAnchorControlModule";
import { SdBusyContainerControlModule } from "../busy-container/SdBusyContainerControlModule";

@NgModule({
  imports: [
    CommonModule,
    SdIconControlModule,
    SdAnchorControlModule,
    SdBusyContainerControlModule
  ],
  declarations: [
    SdMarkdownEditorControl
  ],
  exports: [
    SdMarkdownEditorControl
  ]
})
export class SdMarkdownEditorControlModule {
}
