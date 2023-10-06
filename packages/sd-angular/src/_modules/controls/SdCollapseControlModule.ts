import { SdCollapseControl } from "../../controls/SdCollapseControl";
import { SdResizeDirectiveModule } from "../directives/SdResizeDirectiveModule";
import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";

@NgModule({
  imports: [CommonModule, SdResizeDirectiveModule],
  declarations: [SdCollapseControl],
  exports: [SdCollapseControl],
  providers: []
})
export class SdCollapseControlModule {
}