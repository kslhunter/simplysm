import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { SdAnchorModule } from "../anchor/sd-anchor.module";
import { FontAwesomeModule } from "@fortawesome/angular-fontawesome";
import { SdPaginationControl } from "./sd-pagination.control";

@NgModule({
  imports: [CommonModule, SdAnchorModule, FontAwesomeModule],
  declarations: [SdPaginationControl],
  exports: [SdPaginationControl],
  providers: []
})
export class SdPaginationModule {
}
