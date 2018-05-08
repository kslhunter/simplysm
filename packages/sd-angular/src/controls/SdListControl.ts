import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  HostBinding,
  HostListener,
  Input,
  Output,
  ViewChild
} from "@angular/core";
import {SdComponentBase} from "../bases/SdComponentBase";
import {SdTypeValidate} from "../commons/SdTypeValidate";
import {SdSizeString} from "../commons/types";

@Component({
  selector: "sd-list",
  template: "<ng-content></ng-content>",
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{provide: SdComponentBase, useExisting: SdListControl}]
})
export class SdListControl extends SdComponentBase {
  @Input()
  @SdTypeValidate("SdSizeString")
  @HostBinding("attr.sd-size")
  public size?: SdSizeString;
}

@Component({
  selector: "sd-list-item",
  template: `
    <div (click)="onTitleClick()"
         tabindex="1"
         (keydown.enter)="onTitleClick()"
         (keydown.ArrowUp)="onTitleArrowUpKeydown($event)"
         (keydown.ArrowDown)="onTitleArrowDownKeydown($event)">
      <ng-content></ng-content>
      <div *ngIf="hasChild">
        <sd-icon icon="angle-down" [fixedWidth]="true"></sd-icon>
      </div>
    </div>
    <div #child>
      <ng-content select="sd-list"></ng-content>
    </div>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{provide: SdComponentBase, useExisting: SdListItemControl}]
})
export class SdListItemControl extends SdComponentBase {
  @Input()
  @SdTypeValidate(Boolean)
  @HostBinding("attr.sd-header")
  public header?: boolean;

  @Input()
  @SdTypeValidate(Boolean)
  @HostBinding("attr.sd-selected")
  public selected?: boolean;

  @Output()
  public readonly click = new EventEmitter<void>();

  @ViewChild("child")
  public readonly child?: ElementRef<HTMLDivElement>;

  @HostBinding("attr.sd-open")
  public open = false;

  public constructor(private readonly _elRef: ElementRef<HTMLElement>) {
    super();
  }

  public get hasChild(): boolean | undefined {
    return this.child && this.child.nativeElement.children.length > 0;
  }

  public onTitleClick(): void {
    this.open = !this.open;
    this.click.emit();
  }

  public onTitleArrowUpKeydown(event: KeyboardEvent): void {
    const thisEl = this._elRef.nativeElement;
    if (thisEl.previousSibling && typeof thisEl.previousSibling["focus"] === "function") {
      const prevEl = thisEl.previousSibling as HTMLElement;
      if (prevEl.isFocusable()) {
        event.preventDefault();
        event.stopPropagation();

        prevEl.focus();
      }
    }
  }

  public onTitleArrowDownKeydown(event: KeyboardEvent): void {
    const thisEl = this._elRef.nativeElement;
    if (thisEl.nextSibling && typeof thisEl.nextSibling["focus"] === "function") {
      event.preventDefault();
      event.stopPropagation();

      const nextEl = thisEl.nextSibling as HTMLElement;
      if (nextEl.isFocusable()) {
        event.preventDefault();
        event.stopPropagation();

        nextEl.focus();
      }
    }
  }

  @HostListener("click", ["$event"])
  public onClick(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }
}
