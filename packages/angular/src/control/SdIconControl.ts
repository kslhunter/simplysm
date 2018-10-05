import {ChangeDetectionStrategy, Component, ElementRef, HostBinding, Input, OnInit, ViewChild} from "@angular/core";
import {counter, icon, IconLookup, IconName, library} from "@fortawesome/fontawesome-svg-core";
import {fas} from "@fortawesome/free-solid-svg-icons";
import {far} from "@fortawesome/free-regular-svg-icons";
import {fab} from "@fortawesome/free-brands-svg-icons";
import {ISdNotifyPropertyChange, SdNotifyPropertyChange} from "../decorator/SdNotifyPropertyChange";
import {SdTypeValidate} from "../decorator/SdTypeValidate";

library.add(fas, far, fab);
const iconNames = Object.values(fas).map(item => item.iconName);

@Component({
  selector: "sd-icon",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div #content></div>`,
  styles: [/* language=SCSS */ `
    @import "../../styles/presets";

    :host {
      display: inline-block;

      > div {
        display: inline-block;
        pointer-events: none;
      }

      &[sd-fixed-width=true] {
        width: 1.25em;
      }

      /deep/ .fa-layers-counter {
        transform: scale(0.4);
      }

      &[sd-dot=true] /deep/ svg:nth-child(2) {
        color: get($theme-color, danger, default);
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
    validator: value => ["solid", "regular", "brands"].includes(value),
    notnull: true
  })
  @SdNotifyPropertyChange()
  public type = "solid";

  @Input()
  @SdTypeValidate(Number)
  @SdNotifyPropertyChange()
  public count?: number;

  @Input()
  @SdTypeValidate(Boolean)
  @SdNotifyPropertyChange()
  @HostBinding("attr.sd-dot")
  public dot?: number;

  @Input()
  @SdTypeValidate(Boolean)
  @SdNotifyPropertyChange()
  public spin?: boolean;

  @ViewChild("content")
  public readonly contentElRef?: ElementRef<HTMLDivElement>;

  public constructor() {
  }

  public ngOnInit(): void {
    this.render();
  }

  public sdOnPropertyChange(propertyName: string, oldValue: any, newValue: any): void {
    this.render();
  }

  public render(): void {
    if (!this.contentElRef) return;

    if (this.icon) {
      const iconSpec: IconLookup = {
        prefix: this.type === "brands" ? "fab" : this.type === "regular" ? "far" : "fas",
        iconName: this.icon
      };

      const classes = [
        this.fixedWidth ? "fa-fw" : undefined,
        this.spin ? "fa-spin" : undefined
      ].filterExists();

      const iconObj = icon(iconSpec, {classes});

      if (iconObj) {
        let html = iconObj.html.join("\n");

        if (this.count) {
          const counterObj = counter(this.count!);

          html = `<span class='fa-layers${this.fixedWidth ? " fa-fw" : ""}'>` + html + counterObj.html.join("\n") + "</span>";
        }

        if (this.dot) {
          const dotObj = icon(
            {prefix: "fas", iconName: "circle"},
            {transform: {size: 8, x: 6, y: 6}}
          );

          html = `<span class='fa-layers${this.fixedWidth ? " fa-fw" : ""}'>` + html + dotObj.html.join("\n") + "</span>";
        }

        this.contentElRef.nativeElement.innerHTML = html;
      }
      else {
        this.contentElRef.nativeElement.innerHTML = "";
      }
    }
    else {
      this.contentElRef.nativeElement.innerHTML = "";
    }
  }
}