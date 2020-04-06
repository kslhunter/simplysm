import {NgModule} from "@angular/core";
import {CommonModule} from "@angular/common";
import {SdHtmlEditorControl} from "../../controls/SdHtmlEditorControl";
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
    SdHtmlEditorControl
  ],
  exports: [
    SdHtmlEditorControl
  ],
  entryComponents: [],
  providers: []
})
export class SdHtmlEditorControlModule {
}