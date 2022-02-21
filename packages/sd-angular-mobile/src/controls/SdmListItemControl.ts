import {
  ChangeDetectionStrategy,
  Component,
  ContentChildren,
  EventEmitter,
  forwardRef,
  HostBinding,
  Input,
  Output,
  QueryList
} from "@angular/core";
import { SdmListControl } from "./SdmListControl";
import { SdInputValidate } from "@simplysm/sd-angular";
import { IconProp } from "@fortawesome/fontawesome-svg-core";

@Component({
  selector: "sdm-list-item",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div [attr.class]="'_content ' + contentClass"
         [attr.style]="contentStyle"
         (click)="onContentClick()">
      <fa-icon class="_selected-icon" *ngIf="selectedIcon && !hasChildren" [icon]="selectedIcon"
               [fixedWidth]="true"></fa-icon>
      <ng-content></ng-content>

      <sd-collapse-icon [open]="open" *ngIf="hasChildren && layout==='accordion'"
                        style="float: right"></sd-collapse-icon>
    </div>
    <sd-collapse class="_child" [open]="layout === 'flat' || open">
      <ng-content select="sdm-list"></ng-content>
    </sd-collapse>`,
  styles: [/* language=SCSS */ `
    @import "../../scss/mixins";

    :host {
      > ._content {
        @include mobile-active-effect(true);

        padding: var(--gap-sm) var(--gap-default);

        > ._selected-icon {
          color: var(--text-brightness-lighter);
        }
      }

      &[sd-layout=accordion] {
        ::ng-deep ._child > sdm-list {
          padding: var(--gap-sm) 0;
        }
      }

      &[sd-layout=flat] {
        > ._content {
          display: none;
        }

        &[sd-has-children=true] {
          > ._content {
            @include mobile-active-effect(false);

            display: block;
            background: transparent;
            cursor: default;
            font-size: var(--font-size-sm);
            opacity: .7;
            margin-top: var(--gap-sm);
          }
        }
      }

      &[sd-selected=true] {
        > ._content {
          background: var(--theme-color-primary-default);
          color: var(--text-brightness-rev-default);

          > ._selected-icon {
            color: var(--theme-color-primary-default);
          }
        }
      }
    }
  `]
})
export class SdmListItemControl {
  @Input("content.style")
  @SdInputValidate(String)
  public contentStyle?: string;

  @Input("content.class")
  @SdInputValidate(String)
  public contentClass?: string;

  @Input()
  @SdInputValidate({
    type: String,
    includes: ["accordion", "flat"],
    notnull: true
  })
  @HostBinding("attr.sd-layout")
  public layout: "accordion" | "flat" = "accordion";

  @Input()
  @SdInputValidate(Boolean)
  @HostBinding("attr.sd-open")
  public open?: boolean;

  @Output()
  public readonly openChange = new EventEmitter<boolean | undefined>();

  @Input()
  @SdInputValidate(Boolean)
  @HostBinding("attr.sd-selected")
  public selected?: boolean;

  @Input()
  public selectedIcon?: IconProp;

  @HostBinding("attr.sd-has-children")
  public get hasChildren(): boolean {
    return this.listControls !== undefined && this.listControls.length > 0;
  }

  @ContentChildren(forwardRef(() => SdmListControl))
  public listControls?: QueryList<SdmListControl>;

  public onContentClick(): void {
    if (this.openChange.observers.length > 0) {
      this.openChange.emit(!this.open);
    }
    else {
      this.open = !this.open;
    }
  }
}
