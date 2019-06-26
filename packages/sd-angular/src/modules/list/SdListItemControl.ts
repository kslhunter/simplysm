import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ContentChildren,
  ElementRef,
  HostBinding,
  Input,
  QueryList,
  ViewChild,
  ViewEncapsulation
} from "@angular/core";
import {SdTypeValidate} from "../../commons/SdTypeValidate";
import {SdListControl} from "./SdListControl";
import {ISdNotifyPropertyChange, SdNotifyPropertyChange} from "../../commons/SdNotifyPropertyChange";

@Component({
  selector: "sd-list-item",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="_content">
      <label (click)="onLabelClick()"
             [attr.tabindex]="(header || !clickable) ? undefined : '0'">
        <ng-content></ng-content>
        <sd-icon class="_angle-icon" [icon]="'chevron-right'" [fw]="true" *ngIf="hasChildren"></sd-icon>
      </label>
      <ng-content select="sd-list-item-button"></ng-content>
    </div>
    <div class="_child">
      <div #childContent class="_child-content">
        <ng-content select="sd-list"></ng-content>
      </div>
    </div>`,
  styles: [/* language=SCSS */ `
    @import "../../../scss/presets";

    sd-list-item {
      display: block;

      > ._content {
        display: flex;
        border-top: 1px solid transparent;

        > label {
          display: block;
          width: 100%;
          padding: var(--gap-sm) var(--gap-default);
          background: white;

          > ._angle-icon {
            float: right;
            transition: transform .1s ease-in;
            color: var(--text-color-light);
          }

          &:focus {
            outline-color: transparent;
          }
        }
      }

      > ._child {
        overflow: hidden;

        > ._child-content {
          transition: margin-top .1s ease-out;
          background: rgba(0, 0, 0, .05);

          > sd-list {
            padding: var(--gap-sm) 0 var(--gap-default) 0;
          }
        }
      }

      &[sd-has-children=true] {
        > ._content {
          border-color: white;
        }
      }

      &[sd-clickable=true] {
        > ._content {
          > label {
            cursor: pointer;
            transition: background .1s ease-in;

            &:hover {
              transition: background .1s ease-out;
              background: rgba(0, 0, 0, .07);
            }
          }
        }
      }

      &[sd-open=true] {
        > ._content {
          > label {
            > ._angle-icon {
              transform: rotate(90deg);
              transition: transform .1s ease-out;
            }
          }
        }

        > ._child > ._child-content {
          transition: margin-top .1s ease-in;
        }
      }

      &[sd-size=sm] > ._content > label {
        font-size: var(--font-size-sm);
        padding: var(--gap-xs) var(--gap-sm);
      }

      &[sd-size=lg] > ._content > label {
        padding: var(--gap-default) var(--gap-lg);
      }

      &[sd-selected=true] > ._content > label {
        color: var(--theme-primary-default);
        font-weight: bold;
      }

      &[sd-disabled=true] {
        pointer-events: none;

        > ._content > label {
          color: var(--text-color-lighter);
          cursor: default;
        }
      }

      &[sd-header=true] {
        > ._content > label {
          cursor: default;
          background: transparent;
          color: var(--text-color-light);
          font-size: var(--font-size-sm);
          font-weight: lighter;

          &:hover {
            background: transparent !important;
          }

          > ._angle-icon {
            display: none;
          }
        }

        > ._child > ._child-content {
          margin-top: 0 !important;
          background: transparent !important;
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

  @Input()
  @SdTypeValidate({type: Boolean, notnull: true})
  @HostBinding("attr.sd-clickable")
  public clickable = true;

  @ContentChildren(SdListControl)
  public listControls?: QueryList<SdListControl>;

  @ViewChild("childContent", {static: true})
  public childContentElRef?: ElementRef<HTMLDivElement>;

  @Input()
  @SdTypeValidate({
    type: String,
    includes: ["sm", "lg"]
  })
  @HostBinding("attr.sd-size")
  public size?: "sm" | "lg";

  @Input()
  @SdTypeValidate(Boolean)
  @HostBinding("attr.sd-selected")
  public selected?: boolean;

  @Input()
  @SdTypeValidate(Boolean)
  @HostBinding("attr.sd-disabled")
  public disabled?: boolean;

  @HostBinding("attr.sd-has-children")
  public get hasChildren(): boolean {
    return !!this.listControls && this.listControls.length > 0;
  }

  public onLabelClick(): void {
    if (this.clickable && this.hasChildren && !this.header) {
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
