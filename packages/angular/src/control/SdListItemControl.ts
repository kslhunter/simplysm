import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ContentChildren,
  ElementRef,
  HostBinding,
  Input,
  QueryList,
  ViewChild
} from "@angular/core";
import {SdTypeValidate} from "../decorator/SdTypeValidate";
import {SdListControl} from "./SdListControl";
import {ISdNotifyPropertyChange, SdNotifyPropertyChange} from "../decorator/SdNotifyPropertyChange";

@Component({
  selector: "sd-list-item",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label (click)="onLabelClick()" [attr.tabindex]="header ? undefined : '0'">
      <ng-content></ng-content>
      <sd-icon [icon]="'angle-left'" *ngIf="hasChildren"></sd-icon>
    </label>
    <div class="_child">
      <div #childContent class="_child-content">
        <ng-content select="sd-list"></ng-content>
      </div>
    </div>`,
  styles: [/* language=SCSS */ `
    @import "../../styles/presets";

    :host {
      display: block;

      > label {
        display: block;
        padding: gap(sm) gap(default);
        cursor: pointer;

        > sd-icon {
          float: right;
          transition: transform .1s ease-in;
        }

        &:hover {
          background: theme-color(primary, lightest);
        }

        &:focus {
          outline: none;
        }
      }

      &[sd-header=true] > label {
        cursor: default;
        background: transparent;
        padding: gap(xs) gap(default);
        color: text-color(darker);
      }

      > ._child {
        overflow: hidden;

        > ._child-content {
          transition: margin-top .1s ease-out;
          /*background: get($trans-color, default);*/
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
    }
  `]
})
export class SdListItemControl implements ISdNotifyPropertyChange, AfterViewInit {
  @Input()
  @SdTypeValidate(Boolean)
  @HostBinding("attr.sd-header")
  public header?: boolean;

  @SdTypeValidate(Boolean)
  @SdNotifyPropertyChange()
  @HostBinding("attr.sd-open")
  public open?: boolean;

  @ContentChildren(SdListControl)
  public listControls?: QueryList<SdListControl>;

  @ViewChild("childContent")
  public childContentElRef?: ElementRef<HTMLDivElement>;

  public get hasChildren(): boolean {
    return !!this.listControls && this.listControls.length > 0;
  }

  public onLabelClick(): void {
    this.open = !this.open;
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
      }
      else {
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