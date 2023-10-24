import {SdListItemControl} from "./SdListItemControl";
import {CommonModule} from "@angular/common";
import {NgModule} from "@angular/core";
import {SdListControl} from "./SdListControl";
import {SdCollapseModule} from "../collapse/SdCollapseModule";
import {SdIconControl} from "../SdIconControl";

@NgModule({
  imports: [CommonModule, SdCollapseModule, SdIconControl],
  declarations: [SdListControl, SdListItemControl],
  exports: [SdListControl, SdListItemControl],
  providers: []
})
export class SdListModule {
}