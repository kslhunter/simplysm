import {ChangeDetectionStrategy, Component, HostBinding, Input, OnInit} from "@angular/core";
import {DomSanitizer, SafeHtml} from "@angular/platform-browser";
import {icon, IconLookup, IconName, library} from "@fortawesome/fontawesome-svg-core";
import {fas} from "@fortawesome/free-solid-svg-icons";
import {far} from "@fortawesome/free-regular-svg-icons";
import {ISdNotifyPropertyChange, SdNotifyPropertyChange} from "../decorators/SdNotifyPropertyChange";
import {SdTypeValidate} from "../decorators/SdTypeValidate";

library.add(fas, far);
const iconNames = Object.values(fas).map(item => item.iconName);

@Component({
  selector: "sd-icon",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: ``,
  styles: [/* language=SCSS */ `
    :host {
      display: inline-block;

      &[sd-fixed-width=true] {
        width: 1.25em;
      }
    }
  `]
})
export class SdIconControl implements ISdNotifyPropertyChange, OnInit {
  @Input()
  @SdTypeValidate({
    type: String,
    validator: value => iconNames.includes(value)
  })
  @SdNotifyPropertyChange()
  public icon?: IconName;

  @Input()
  @SdNotifyPropertyChange()
  @HostBinding("attr.sd-fixed-width")
  public fixedWidth?: boolean;

  @Input()
  @SdTypeValidate({
    type: String,
    validator: value => ["solid", "regular"].includes(value),
    notnull: true
  })
  @SdNotifyPropertyChange()
  public type = "solid";

  @HostBinding("innerHTML")
  public innerHTML?: SafeHtml;

  public constructor(private readonly _sanitizer: DomSanitizer) {
  }

  public ngOnInit(): void {
    this.render();
  }

  public sdOnPropertyChange(propertyName: string, oldValue: any, newValue: any): void {
    this.render();
  }

  public render(): void {
    if (this.icon) {
      const iconSpec: IconLookup = {
        prefix: this.type === "regular" ? "far" : "fas",
        iconName: this.icon
      };

      const iconObj = icon(
        iconSpec,
        this.fixedWidth ? {classes: ["fa-fw"]} : undefined
      );

      if (iconObj) {
        this.innerHTML = this._sanitizer.bypassSecurityTrustHtml(
          iconObj.html.join("\n")
        );
      }
      else {
        this.innerHTML = "";
      }
    }
    else {
      this.innerHTML = "";
    }
  }
}