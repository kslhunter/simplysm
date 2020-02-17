import {NgModule} from "@angular/core";
import {SdHtmlEditorControl} from "../../controls/SdHtmlEditorControl";
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
    SdHtmlEditorControl
  ],
  exports: [
    SdHtmlEditorControl
  ],
  entryComponents: []
})
export class SdHtmlEditorControlModule {
}