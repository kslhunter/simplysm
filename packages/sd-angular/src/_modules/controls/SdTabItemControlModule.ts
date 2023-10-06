import { SdTabItemControl } from "../../controls/SdTabItemControl";
import { SdTabControlModule } from "./SdTabControlModule";
import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";

@NgModule({
  imports: [CommonModule, SdTabControlModule],
  declarations: [SdTabItemControl],
  exports: [SdTabItemControl],
  providers: []
})
export class SdTabItemControlModule {
}