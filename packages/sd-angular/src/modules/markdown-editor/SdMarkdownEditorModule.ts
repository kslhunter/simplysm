import {NgModule} from "@angular/core";
import {CommonModule} from "@angular/common";
import {SdSharedModule} from "../shared/SdSharedModule";
import {SdDockModule} from "../dock/SdDockModule";
import {SdIconModule} from "../icon/SdIconModule";
import {SdMarkdownEditorControl} from "./SdMarkdownEditorControl";
import {SdPaneModule} from "../..";

@NgModule({
  imports: [
    CommonModule,
    SdSharedModule,
    SdDockModule,
    SdIconModule,
    SdPaneModule
  ],
  exports: [
    SdMarkdownEditorControl
  ],
  declarations: [
    SdMarkdownEditorControl
  ]
})
export class SdMarkdownEditorModule {
}
