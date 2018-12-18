import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ContentChildren,
  ElementRef,
  HostBinding,
  Injector,
  Input,
  QueryList,
  ViewChild
} from "@angular/core";
import {SdTypeValidate} from "../decorator/SdTypeValidate";
import {SdListControl} from "./SdListControl";
import {ISdNotifyPropertyChange, SdNotifyPropertyChange} from "../decorator/SdNotifyPropertyChange";
import {SdControlBase, SdStyleProvider} from "../provider/SdStyleProvider";

@Component({
  selector: "sd-list-item",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label (click)="onLabelClick()"
           [attr.tabindex]="(header || !clickable) ? undefined : '0'">
      <ng-content></ng-content>
      <sd-icon [icon]="'angle-left'" *ngIf="hasChildren"></sd-icon>
    </label>
    <div class="_child">
      <div #childContent class="_child-content">
        <ng-content select="sd-list"></ng-content>
      </div>
    </div>`
})
export class SdListItemControl extends SdControlBase implements ISdNotifyPropertyChange, AfterViewInit {
  public sdInitStyle(vars: SdStyleProvider): string {
    return /* language=LESS */ `
      :host {
        display: block;

        > label {
          display: block;
          padding: ${vars.gap.sm} ${vars.gap.default};
          transition: background .1s linear;

          > sd-icon {
            float: right;
            transition: transform .1s ease-in;
          }

          &:focus {
            outline-color: transparent;
          }
        }

        > ._child {
          overflow: hidden;

          > ._child-content {
            transition: margin-top .1s ease-out;
            background: rgba(0, 0, 0, .05);
          }
        }

        &[sd-clickable=true] {
          > label {
            cursor: pointer;

            &:hover {
              background: rgba(0, 0, 0, .1);
            }
          }
        }

        &[sd-open=true] {
          > label > sd-icon {
            transform: rotate(-90deg);
            transition: transform .1s ease-out;
          }

          > ._child > ._child-content {
            transition: margin-top .1s ease-in;
          }
        }

        &[sd-header=true] {
          > label {
            cursor: default;
            background: transparent;
            padding: ${vars.gap.xs} ${vars.gap.default};
            color: ${vars.textColor.light};
            font-size: ${vars.fontSize.sm};
            margin-top: ${vars.gap.sm};

            &:hover {
              background: transparent;
            }
          }

          > label > sd-icon {
            display: none;
          }

          > ._child > ._child-content {
            margin-top: 0 !important;
            background: transparent !important;
          }
        }
      }`;
  }

  @Input()
  @SdTypeValidate(Boolean)
  @HostBinding("attr.sd-header")
  public header?: boolean;

  @SdTypeValidate(Boolean)
  @SdNotifyPropertyChange()
  @HostBinding("attr.sd-open")
  public open?: boolean;

  @Input()
  @SdTypeValidate({type: Boolean, notnull: true})
  @HostBinding("attr.sd-clickable")
  public clickable = true;

  @ContentChildren(SdListControl)
  public listControls?: QueryList<SdListControl>;

  @ViewChild("childContent")
  public childContentElRef?: ElementRef<HTMLDivElement>;

  public constructor(injector: Injector) {
    super(injector);
  }

  public get hasChildren(): boolean {
    return !!this.listControls && this.listControls.length > 0;
  }

  public onLabelClick(): void {
    if (this.clickable) {
      this.open = !this.open;
    }
  }

  public ngAfterViewInit(): void {
    const childContentEl = this.childContentElRef!.nativeElement;

    Object.assign(
      childContentEl.style,
      {
        marginTop: (-childContentEl.offsetHeight) + "px",
        transition: "margin-top .1s ease-in"
      }
    );
  }

  public sdOnPropertyChange(propertyName: string, oldValue: any, newValue: any): void {
    if (propertyName === "open") {
      if (!this.childContentElRef) return;
      const childContentEl = this.childContentElRef.nativeElement;

      if (newValue) {
        Object.assign(
          childContentEl.style,
          {
            marginTop: "0",
            transition: "margin-top .1s ease-out"
          }
        );
      } else {
        Object.assign(
          childContentEl.style,
          {
            marginTop: (-childContentEl.offsetHeight) + "px",
            transition: "margin-top .1s ease-in"
          }
        );
      }
    }
  }
}