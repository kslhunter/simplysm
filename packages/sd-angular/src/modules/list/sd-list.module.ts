import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { SdCollapseModule } from "../collapse";
import { SdCollapseIconModule } from "../collapse-icon";
import { FontAwesomeModule } from "@fortawesome/angular-fontawesome";
import { SdListComponent } from "./sd-list.component";
import { SdListItemComponent } from "./sd-list-item.component";

@NgModule({
  imports: [CommonModule, SdCollapseModule, SdCollapseIconModule, FontAwesomeModule],
  declarations: [SdListComponent, SdListItemComponent],
  exports: [SdListComponent, SdListItemComponent],
  providers: []
})
export class SdListModule {
}
