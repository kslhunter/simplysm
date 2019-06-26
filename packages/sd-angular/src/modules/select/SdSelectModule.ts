import {NgModule} from "@angular/core";
import {CommonModule} from "@angular/common";
import {SdSharedModule} from "../shared/SdSharedModule";
import {SdDropdownModule} from "../dropdown/SdDropdownModule";
import {SdIconModule} from "../icon/SdIconModule";
import {SdDockModule} from "../dock/SdDockModule";
import {SdSelectControl} from "./SdSelectControl";
import {SdSelectItemControl} from "./SdSelectItemControl";
import {SdPaneModule} from "../pane/SdPaneModule";

@NgModule({
  imports: [
    CommonModule,
    SdSharedModule,
    SdDropdownModule,
    SdIconModule,
    SdDockModule,
    SdPaneModule
  ],
  exports: [
    SdSelectControl,
    SdSelectItemControl
  ],
  declarations: [
    SdSelectControl,
    SdSelectItemControl
  ]
})
export class SdSelectModule {
}
