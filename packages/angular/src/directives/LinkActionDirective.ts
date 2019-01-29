import {Directive, HostBinding} from "@angular/core";

@Directive({
  selector: "a" //tslint:disable-line:directive-selector
})
export class LinkActionDirective {
  @HostBinding("attr.tabindex")
  public tabindex = 0;
}
