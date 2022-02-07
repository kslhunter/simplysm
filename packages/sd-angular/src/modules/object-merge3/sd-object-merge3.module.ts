import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { SdAnchorModule } from "../anchor";
import { SdButtonModule } from "../button";
import { SdDockModule } from "../dock";
import { FontAwesomeModule } from "@fortawesome/angular-fontawesome";
import { SdPaneModule } from "../pane";
import { SdTableModule } from "../table";
import { SdObjectMerge3Modal } from "./sd-object-merge3.modal";
import { SdModalModule } from "../modal";
import { SdToastModule } from "../toast";
import { SdObjectMerge3Provider } from "./sd-object-merge3.provider";

@NgModule({
  imports: [CommonModule, SdAnchorModule, SdButtonModule, SdDockModule, FontAwesomeModule, SdPaneModule, SdTableModule, SdModalModule, SdToastModule],
  declarations: [SdObjectMerge3Modal],
  exports: [SdObjectMerge3Modal],
  providers: [SdObjectMerge3Provider]
})
export class SdObjectMerge3Module {
}
