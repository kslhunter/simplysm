import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { SdHtmlEditorControl } from "./SdHtmlEditorControl";
import { SdIconControlModule } from "../icon/SdIconControlModule";
import { SdAnchorControlModule } from "../anchor/SdAnchorControlModule";
import { SdDockContainerControlModule } from "../dock/SdDockContainerControlModule";
import { SdPaneControlModule } from "../pane/SdPaneControlModule";

@NgModule({
  imports: [
    CommonModule,
    SdIconControlModule,
    SdAnchorControlModule,
    SdDockContainerControlModule,
    SdPaneControlModule
  ],
  declarations: [
    SdHtmlEditorControl
  ],
  exports: [
    SdHtmlEditorControl
  ]
})
export class SdHtmlEditorControlModule {
}
