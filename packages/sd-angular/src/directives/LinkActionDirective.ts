import {Directive, HostBinding, Input} from "@angular/core";
import {SdTypeValidate} from "../commons/SdTypeValidate";

@Directive({
  selector: "a" //tslint:disable-line:directive-selector
})
export class LinkActionDirective {
  @HostBinding("attr.tabindex")
  public tabindex = 0;

  @Input()
  @SdTypeValidate(Boolean)
  @HostBinding("class._disabled")
  public disabled?: boolean;
}
