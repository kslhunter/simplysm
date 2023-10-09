import {SdSharedDataSelectControl} from "./SdSharedDataSelectControl";
import {CommonModule} from "@angular/common";
import {NgModule} from "@angular/core";
import {SdSharedDataSelectViewControl} from "./SdSharedDataSelectViewControl";
import {SdSelectModule} from "../select/SdSelectModule";
import {SdDockingModule} from "../dock/SdDockingModule";
import {SdTextfieldControl} from "../SdTextfieldControl";
import {SdPaneControl} from "../SdPaneControl";
import {SdAnchorControl} from "../SdAnchorControl";
import {SdBusyContainerControl} from "../SdBusyContainerControl";
import {SdListModule} from "../list/SdListModule";

@NgModule({
  imports: [CommonModule, SdSelectModule, SdDockingModule, SdTextfieldControl, SdPaneControl, SdAnchorControl, SdBusyContainerControl, SdListModule],
  declarations: [SdSharedDataSelectControl, SdSharedDataSelectViewControl],
  exports: [SdSharedDataSelectControl, SdSharedDataSelectViewControl],
  providers: []
})
export class SdSharedDataModule {
}