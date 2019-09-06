import {NgModule} from "@angular/core";
import {CommonModule} from "@angular/common";
import {SdSharedModule} from "../shared/SdSharedModule";
import {SdPaneControl} from "./SdPaneControl";

@NgModule({
  imports: [
    CommonModule,
    SdSharedModule
  ],
  exports: [
    SdPaneControl
  ],
  declarations: [
    SdPaneControl
  ]
})
export class SdPaneModule {
}
