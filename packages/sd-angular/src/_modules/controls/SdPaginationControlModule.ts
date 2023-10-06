import { SdPaginationControl } from "../../controls/SdPaginationControl";
import { SdAnchorControlModule } from "./SdAnchorControlModule";
import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { FontAwesomeModule } from "@fortawesome/angular-fontawesome";

@NgModule({
  imports: [CommonModule, FontAwesomeModule, SdAnchorControlModule],
  declarations: [SdPaginationControl],
  exports: [SdPaginationControl],
  providers: []
})
export class SdPaginationControlModule {
}