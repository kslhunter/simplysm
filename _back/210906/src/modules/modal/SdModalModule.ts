import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { SdModalControl } from "./SdModalControl";
import { SdIconControlModule } from "../icon/SdIconControlModule";
import { SdAnchorControlModule } from "../anchor/SdAnchorControlModule";
import { SdDockContainerControlModule } from "../dock/SdDockContainerControlModule";
import { SdPaneControlModule } from "../pane/SdPaneControlModule";
import { SdModalProvider } from "./SdModalProvider";

@NgModule({
  imports: [
    CommonModule,
    SdIconControlModule,
    SdAnchorControlModule,
    SdDockContainerControlModule,
    SdPaneControlModule
  ],
  declarations: [
    SdModalControl
  ],
  exports: [
    SdModalControl
  ],
  providers: [
    SdModalProvider
  ]
})
export class SdModalModule {
}
