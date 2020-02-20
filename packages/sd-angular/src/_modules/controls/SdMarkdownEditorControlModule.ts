import {NgModule} from "@angular/core";
import {SdMarkdownEditorControl} from "../../controls/SdMarkdownEditorControl";
import {CommonModule} from "@angular/common";
import {SdDockControlModule} from "./SdDockControlModule";
import {SdIconControlModule} from "./SdIconControlModule";
import {SdPaneControlModule} from "./SdPaneControlModule";

@NgModule({
  imports: [
    CommonModule,
    SdDockControlModule,
    SdIconControlModule,
    SdPaneControlModule
  ],
  declarations: [
    SdMarkdownEditorControl
  ],
  exports: [
    SdMarkdownEditorControl
  ],
  entryComponents: []
})
export class SdMarkdownEditorControlModule {
}