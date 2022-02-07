import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { SdAnchorModule } from "../anchor";
import { FontAwesomeModule } from "@fortawesome/angular-fontawesome";
import { SdPaginationComponent } from "./sd-pagination.component";

@NgModule({
  imports: [CommonModule, SdAnchorModule, FontAwesomeModule],
  declarations: [SdPaginationComponent],
  exports: [SdPaginationComponent],
  providers: []
})
export class SdPaginationModule {
}
