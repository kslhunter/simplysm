import {NgModule} from "@angular/core";
import {CommonModule} from "@angular/common";
import {SdSharedModule} from "../shared/SdSharedModule";
import {SdDockModule} from "../dock/SdDockModule";
import {SdIconModule} from "../icon/SdIconModule";
import {SdHtmlEditorControl} from "./SdHtmlEditorControl";

@NgModule({
  imports: [
    CommonModule,
    SdSharedModule,
    SdDockModule,
    SdIconModule
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
