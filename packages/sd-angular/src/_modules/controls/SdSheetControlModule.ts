import {NgModule, ApplicationModule} from "@angular/core";
import {SdSheetControl} from "../../controls/SdSheetControl";
import {SdSheetColumnControlModule} from "./SdSheetColumnControlModule";
import {SdAnchorControlModule} from "./SdAnchorControlModule";
import {CommonModule} from "@angular/common";
import {SdResizeDirectiveModule} from "../directives/SdResizeDirectiveModule";
import {SdIconControlModule} from "./SdIconControlModule";
import {SdDockContainerControlModule} from "./SdDockContainerControlModule";
import {SdPaginationControlModule} from "./SdPaginationControlModule";
import {SdPaneControlModule} from "./SdPaneControlModule";

@NgModule({
  imports: [
    ApplicationModule,
    SdSheetColumnControlModule,
    SdAnchorControlModule,
    CommonModule,
    SdResizeDirectiveModule,
    SdIconControlModule,
    SdDockContainerControlModule,
    SdPaginationControlModule,
    SdPaneControlModule
  ],
  declarations: [
    SdSheetControl
  ],
  exports: [
    SdSheetControl
  ],
  entryComponents: []
})
export class SdSheetControlModule {
}