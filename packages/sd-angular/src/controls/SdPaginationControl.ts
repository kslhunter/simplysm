import {ChangeDetectionStrategy, Component, EventEmitter, Input, Output} from "@angular/core";
import {SdComponentBase} from "../bases/SdComponentBase";
import {SdTypeValidate} from "../commons/SdTypeValidate";

@Component({
  selector: "sd-pagination",
  template: `
    <a *ngIf="hasPrev" (click)="goPrev()">
      <sd-icon icon="angle-double-left" [fixedWidth]="true"></sd-icon>
    </a>
    <a *ngFor="let page of cursorPages; trackBy: getTrackByFn()" (click)="onPageClick(page)"
       [attr.sd-selected]="page === value">
      {{ page + 1 }}
    </a>
    <a *ngIf="hasNext" (click)="goNext()">
      <sd-icon icon="angle-double-right" [fixedWidth]="true"></sd-icon>
    </a>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{provide: SdComponentBase, useExisting: SdPaginationControl}]
})
export class SdPaginationControl extends SdComponentBase {
  @Input()
  @SdTypeValidate({
    type: Number,
    notnull: true
  })
  public value = 0;

  @Input()
  @SdTypeValidate({
    type: Number,
    notnull: true
  })
  public length = 0;

  @Output()
  public readonly valueChange = new EventEmitter<number>();

  public get pages(): number[] {
    const result = [];
    for (let i = 0; i < this.length; i++) {
      result.push(i);
    }
    return result;
  }

  public get cursorPages(): number[] {
    const from = Math.floor(this.value / 10) * 10;
    const to = Math.min(from + 10, this.length);
    return this.pages.filter(item => item >= from && item < to);
  }

  public get hasNext(): boolean {
    return (this.cursorPages.last() || 0) < (this.length - 1);
  }

  public get hasPrev(): boolean {
    return (this.cursorPages[0] || 0) > 0;
  }

  public goNext(): void {
    this.value = (this.cursorPages.last() || 0) + 1;
    this.valueChange.emit(this.value);
  }

  public goPrev(): void {
    this.value = (this.cursorPages[0] || 0) - 1;
    this.valueChange.emit(this.value);
  }

  public onPageClick(page: number): void {
    this.value = page;
    this.valueChange.emit(this.value);
  }
}
