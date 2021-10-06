import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { SdObjectMerge3Modal } from "./SdObjectMerge3Modal";
import { SdIconControlModule } from "../icon/SdIconControlModule";
import { SdAnchorControlModule } from "../anchor/SdAnchorControlModule";
import { SdButtonControlModule } from "../button/SdButtonControlModule";
import { SdDockContainerControlModule } from "../dock/SdDockContainerControlModule";
import { SdPaneControlModule } from "../pane/SdPaneControlModule";
import { SdTableControlModule } from "../table/SdTableControlModule";
import { SdModalModule } from "../modal/SdModalModule";
import { SdToastModule } from "../toast/SdToastModule";
import { SdObjectMerge3Provider } from "./SdObjectMerge3Provider";

@NgModule({
  imports: [
    CommonModule,
    SdIconControlModule,
    SdAnchorControlModule,
    SdButtonControlModule,
    SdDockContainerControlModule,
    SdPaneControlModule,
    SdTableControlModule,
    SdModalModule,
    SdToastModule
  ],
  declarations: [
    SdObjectMerge3Modal
  ],
  exports: [
    SdObjectMerge3Modal
  ],
  providers: [
    SdObjectMerge3Provider
  ]
})
export class SdObjectMerge3Module {
}
