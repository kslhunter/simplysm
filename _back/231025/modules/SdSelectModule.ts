import {SdSelectControl} from "./SdSelectControl";
import {SdSelectItemControl} from "./SdSelectItemControl";
import {CommonModule} from "@angular/common";
import {NgModule} from "@angular/core";
import {SdCheckboxModule} from "../checkbox/SdCheckboxModule";
import {SdDropdownModule} from "../dropdown/SdDropdownModule";
import {SdDockingModule} from "../dock/SdDockingModule";
import {SdAnchorControl} from "../SdAnchorControl";
import {SdGapControl} from "../SdGapControl";
import {SdPaneControl} from "../SdPaneControl";
import {SdIconControl} from "../SdIconControl";
import {SdTypedTemplateDirective} from "../../directives/SdTypedTemplateDirective";
import {SdEventDirectiveModule} from "../../directives/SdEventDirectiveModule";

@NgModule({
  imports: [CommonModule, SdCheckboxModule, SdDropdownModule, SdDockingModule, SdAnchorControl, SdGapControl, SdPaneControl, SdIconControl, SdTypedTemplateDirective, SdEventDirectiveModule],
  declarations: [SdSelectControl, SdSelectItemControl],
  exports: [SdSelectControl, SdSelectItemControl],
  providers: []
})
export class SdSelectModule {
}