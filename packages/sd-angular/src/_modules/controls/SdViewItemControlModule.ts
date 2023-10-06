import { SdViewItemControl } from "../../controls/SdViewItemControl";
import { SdViewControlModule } from "./SdViewControlModule";
import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";

@NgModule({
  imports: [CommonModule, SdViewControlModule],
  declarations: [SdViewItemControl],
  exports: [SdViewItemControl],
  providers: []
})
export class SdViewItemControlModule {
}