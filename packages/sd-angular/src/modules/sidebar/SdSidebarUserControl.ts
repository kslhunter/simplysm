import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostBinding,
  Input,
  ViewChild,
  ViewEncapsulation
} from "@angular/core";
import {SdTypeValidate} from "../../commons/SdTypeValidate";
import {ISdNotifyPropertyChange, SdNotifyPropertyChange} from "../../commons/SdNotifyPropertyChange";

@Component({
  selector: "sd-sidebar-user",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="_content">
      <div class="_content-user">
        <ng-content></ng-content>
      </div>
      <div class="_btn" (click)="open = !open">
        내 계정 정보
        <sd-icon class="_angle-icon" [icon]="'chevron-down'" [fw]="true"></sd-icon>
      </div>
    </div>
    <div class="_child">
      <div #childContent class="_child-content">
        <ng-content select="sd-sidebar-user-menu"></ng-content>
      </div>
    </div>`,
  styles: [/* language=SCSS */ `
    @import "../../../scss/presets";

    sd-sidebar-user {
      > ._content {
        background-image: url(./user_bg.jpg);
        background-size: cover;
        text-shadow: 0 0 1px var(--text-color-default);

        > ._content-user {
          text-align: center;
          padding: var(--gap-default);
        }

        > ._btn {
          padding: var(--gap-sm) var(--gap-default);
          background: var(--trans-color-default);
          cursor: pointer;
          transition: background .1s ease-in;

          > ._angle-icon {
            float: right;
            transition: transform .1s ease-in;
            color: var(--text-reverse-color-dark);
          }

          &:hover {
            transition: background .1s ease-out;
            background: var(--trans-color-dark);
          }

          &:active {
            background: var(--trans-color-darker);
          }
        }
      }

      > ._child {
        overflow: hidden;

        > ._child-content {
          transition: margin-top .1s ease-out;
          padding: var(--gap-sm) 0;
        }
      }

      &[sd-open=true] {
        > ._content {
          > ._btn {
            background: var(--trans-color-dark);

            > ._angle-icon {
              transform: rotate(180deg);
              transition: transform .1s ease-out;
            }

            &:active {
              background: var(--trans-color-darker);
            }
          }
        }

        > ._child > ._child-content {
          transition: margin-top .1s ease-in;
          border-bottom: 1px solid var(--trans-color-light);
        }
      }
    }
  `]
})
export class SdSidebarUserControl implements AfterViewInit, ISdNotifyPropertyChange {
  @Input()
  @SdTypeValidate(Boolean)
  @SdNotifyPropertyChange()
  @HostBinding("attr.sd-open")
  public open?: boolean;

  @ViewChild("childContent", {static: true})
  public childContentElRef?: ElementRef<HTMLDivElement>;

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
