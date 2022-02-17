import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { SdAnchorModule } from "../anchor/sd-anchor.module";
import { SdButtonModule } from "../button/sd-button.module";
import { SdDockModule } from "../dock/sd-dock.module";
import { FontAwesomeModule } from "@fortawesome/angular-fontawesome";
import { SdPaneModule } from "../pane/sd-pane.module";
import { SdTableModule } from "../table/sd-table.module";
import { SdObjectMerge3Modal } from "./sd-object-merge3.modal";
import { SdModalModule } from "../modal/sd-modal.module";
import { SdToastModule } from "../toast/sd-toast.module";
import { SdObjectMerge3Provider } from "./sd-object-merge3.provider";

@NgModule({
  imports: [CommonModule, SdAnchorModule, SdButtonModule, SdDockModule, FontAwesomeModule, SdPaneModule, SdTableModule, SdModalModule, SdToastModule],
  declarations: [SdObjectMerge3Modal],
  exports: [SdObjectMerge3Modal],
  providers: [SdObjectMerge3Provider]
})
export class SdObjectMerge3Module {
}
