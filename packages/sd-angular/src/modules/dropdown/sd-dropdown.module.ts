import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { SdDropdownComponent } from "./sd-dropdown.component";
import { SdDropdownPopupComponent } from "./sd-dropdown-popup.component";

@NgModule({
  imports: [CommonModule],
  declarations: [SdDropdownComponent, SdDropdownPopupComponent],
  exports: [SdDropdownComponent, SdDropdownPopupComponent],
  providers: []
})
export class SdDropdownModule {
}
