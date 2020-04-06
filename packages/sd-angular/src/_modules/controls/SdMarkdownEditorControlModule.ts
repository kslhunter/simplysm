import {NgModule} from "@angular/core";
import {SdMarkdownEditorControl} from "../../controls/SdMarkdownEditorControl";
import {CommonModule} from "@angular/common";
import {SdIconControlModule} from "./icons/SdIconControlModule";
import {SdAnchorControlModule} from "./SdAnchorControlModule";
import {SdDockControlModule} from "./SdDockControlModule";
import {SdPaneControlModule} from "./SdPaneControlModule";

@NgModule({
  imports: [
    CommonModule,
    SdIconControlModule,
    SdAnchorControlModule,
    SdDockControlModule,
    SdPaneControlModule
  ],
  declarations: [
    SdMarkdownEditorControl
  ],
  exports: [
    SdMarkdownEditorControl
  ],
  entryComponents: [],
  providers: []
})
export class SdMarkdownEditorControlModule {
}