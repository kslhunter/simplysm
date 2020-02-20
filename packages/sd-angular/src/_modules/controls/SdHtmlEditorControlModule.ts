import {NgModule} from "@angular/core";
import {SdHtmlEditorControl} from "../../controls/SdHtmlEditorControl";
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
    SdHtmlEditorControl
  ],
  exports: [
    SdHtmlEditorControl
  ],
  entryComponents: []
})
export class SdHtmlEditorControlModule {
}