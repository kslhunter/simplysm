import { SdObjectMerge3Modal } from "../../modals/SdObjectMerge3Modal";
import { SdAnchorControlModule } from "../controls/SdAnchorControlModule";
import { SdButtonControlModule } from "../controls/SdButtonControlModule";
import { SdDockContainerControlModule } from "../controls/SdDockContainerControlModule";
import { SdPaneControlModule } from "../controls/SdPaneControlModule";
import { SdTableControlModule } from "../controls/SdTableControlModule";
import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { FontAwesomeModule } from "@fortawesome/angular-fontawesome";

@NgModule({
  imports: [CommonModule, FontAwesomeModule, SdAnchorControlModule, SdButtonControlModule, SdDockContainerControlModule, SdPaneControlModule, SdTableControlModule],
  declarations: [SdObjectMerge3Modal],
  exports: [SdObjectMerge3Modal],
  providers: []
})
export class SdObjectMerge3ModalModule {
}