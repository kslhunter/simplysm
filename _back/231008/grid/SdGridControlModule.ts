import { SdGridItemControl } from "./SdGridItemControl";
import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import {SdGridControl} from "./SdGridControl";

@NgModule({
  imports: [CommonModule],
  declarations: [SdGridControl, SdGridItemControl],
  exports: [SdGridControl, SdGridItemControl],
  providers: []
})
export class SdGridControlModule {
}