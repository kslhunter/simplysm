import {NgModule} from "@angular/core";
import {CommonModule} from "@angular/common";
import {SdSharedModule} from "../shared/SdSharedModule";
import {SdLocalStorageModule} from "../local-storage/SdLocalStorageModule";
import {SdPaneControl} from "./SdPaneControl";

@NgModule({
  imports: [
    CommonModule,
    SdSharedModule,
    SdLocalStorageModule
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
