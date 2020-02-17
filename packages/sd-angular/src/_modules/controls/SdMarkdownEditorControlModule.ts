import {NgModule} from "@angular/core";
import {SdMarkdownEditorControl} from "../../controls/SdMarkdownEditorControl";
import {CommonModule} from "@angular/common";
import {SdIconControlModule} from "./SdIconControlModule";
import {SdPaneControlModule} from "./SdPaneControlModule";
import {SdModalEntryControlModule} from "./SdModalEntryControlModule";

@NgModule({
  imports: [
    CommonModule,
    SdIconControlModule,
    SdPaneControlModule,
    SdModalEntryControlModule
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