import {NgModule} from "@angular/core";
import {CommonModule} from "@angular/common";
import {SdSharedModule} from "../shared/SdSharedModule";
import {SdDockModule} from "../dock/SdDockModule";
import {SdIconModule} from "../icon/SdIconModule";
import {SdHtmlEditorControl} from "./SdHtmlEditorControl";
import {SdPaneModule} from "../pane/SdPaneModule";

@NgModule({
  imports: [
    CommonModule,
    SdSharedModule,
    SdDockModule,
    SdIconModule,
    SdPaneModule
  ],
  exports: [
    SdHtmlEditorControl
  ],
  declarations: [
    SdHtmlEditorControl
  ]
})
export class SdHtmlEditorModule {
}
