import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { FontAwesomeModule } from "@fortawesome/angular-fontawesome";
import { SdCollapseIconComponent } from "./sd-collapse-icon.component";

@NgModule({
  imports: [CommonModule, FontAwesomeModule],
  declarations: [SdCollapseIconComponent],
  exports: [SdCollapseIconComponent],
  providers: []
})
export class SdCollapseIconModule {
}
