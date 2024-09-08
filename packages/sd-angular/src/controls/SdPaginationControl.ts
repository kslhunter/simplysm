import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  inject,
  Input,
  Output,
  ViewEncapsulation,
} from "@angular/core";
import { SdAnchorControl } from "./SdAnchorControl";
import { SdIconControl } from "./SdIconControl";
import { coercionNumber } from "../utils/commons";
import { SdAngularOptionsProvider } from "../providers/SdAngularOptionsProvider";
import { sdGetter } from "../utils/hooks";

@Component({
  selector: "sd-pagination",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [SdAnchorControl, SdIconControl],
  template: `
    <sd-anchor [disabled]="!getHasPrev()" (click)="onGoFirstClick()">
      <sd-icon [icon]="icons.angleDoubleLeft" fixedWidth />
    </sd-anchor>
    <sd-anchor [disabled]="!getHasPrev()" (click)="onPrevClick()">
      <sd-icon [icon]="icons.angleLeft" fixedWidth />
    </sd-anchor>
    @for (displayPage of getDisplayPages(); track displayPage) {
      <sd-anchor (click)="onPageClick(displayPage)" [attr.sd-selected]="displayPage === page">
        {{ displayPage + 1 }}
      </sd-anchor>
    }
    <sd-anchor [disabled]="!getHasNext()" (click)="onNextClick()">
      <sd-icon [icon]="icons.angleRight" fixedWidth />
    </sd-anchor>
    <sd-anchor [disabled]="!getHasNext()" (click)="onGoLastClick()">
      <sd-icon [icon]="icons.angleDoubleRight" fixedWidth />
    </sd-anchor>
  `,
  styles: [
    /* language=SCSS */ `
      @import "../scss/mixins";

      sd-pagination {
        //display: block;
        display: flex;
        flex-direction: row;

        > sd-anchor {
          display: inline-block;
          padding: var(--gap-sm);
          //  margin: var(--gap-xs);
          //  border-radius: var(--border-radius-sm);
          //
          &[sd-selected="true"] {
            text-decoration: underline;
          }

          //
          //  @include active-effect(true);
          //
          //  &:hover {
          //    background: var(--theme-grey-lightest);
          //  }
        }
      }
    `,
  ],
})
export class SdPaginationControl {
  icons = inject(SdAngularOptionsProvider).icons;

  @Input({ transform: coercionNumber }) page = 0;
  @Output() pageChange = new EventEmitter<number>();

  @Input({ transform: coercionNumber }) pageLength = 0;
  @Input({ transform: coercionNumber }) displayPageLength = 10;

  getDisplayPages = sdGetter(this, [() => [this.pageLength], () => [this.page], () => [this.displayPageLength]], () => {
    const pages: number[] = [];
    for (let i = 0; i < this.pageLength; i++) {
      pages.push(i);
    }

    const from = Math.floor(this.page / this.displayPageLength) * this.displayPageLength;
    const to = Math.min(from + this.displayPageLength, this.pageLength);
    return pages.filter((item) => item >= from && item < to);
  });

  getHasNext = sdGetter(this, [() => [this.pageLength], () => [this.getDisplayPages()]], () => {
    return (this.getDisplayPages().last() ?? 0) < this.pageLength - 1;
  });

  getHasPrev = sdGetter(this, [() => [this.getDisplayPages()]], () => {
    return (this.getDisplayPages().first() ?? 0) > 0;
  });

  onPageClick(page: number) {
    this.#setPage(page);
  }

  onNextClick() {
    const page = (this.getDisplayPages().last() ?? 0) + 1;
    this.#setPage(page);
  }

  onPrevClick() {
    const page = (this.getDisplayPages().first() ?? 0) - 1;
    this.#setPage(page);
  }

  onGoFirstClick() {
    const page = 0;
    this.#setPage(page);
  }

  onGoLastClick() {
    const page = this.pageLength - 1;
    this.#setPage(page);
  }

  #setPage(page: number) {
    if (this.page !== page) {
      this.page = page;
      this.pageChange.emit(page);
    }
  }
}
