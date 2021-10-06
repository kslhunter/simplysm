import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { SdPaginationControl } from "./SdPaginationControl";
import { SdIconControlModule } from "../icon/SdIconControlModule";
import { SdAnchorControlModule } from "../anchor/SdAnchorControlModule";

@NgModule({
  imports: [
    CommonModule,
    SdIconControlModule,
    SdAnchorControlModule
  ],
  declarations: [
    SdPaginationControl
  ],
  exports: [
    SdPaginationControl
  ]
})
export class SdPaginationControlModule {
}
