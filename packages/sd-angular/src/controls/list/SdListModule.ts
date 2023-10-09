import {SdListItemControl} from "./SdListItemControl";
import {CommonModule} from "@angular/common";
import {NgModule} from "@angular/core";
import {SdListControl} from "./SdListControl";
import {FontAwesomeModule} from "@fortawesome/angular-fontawesome";
import {SdCollapseModule} from "../collapse/SdCollapseModule";

@NgModule({
  imports: [CommonModule, FontAwesomeModule, SdCollapseModule],
  declarations: [SdListControl, SdListItemControl],
  exports: [SdListControl, SdListItemControl],
  providers: []
})
export class SdListModule {
}