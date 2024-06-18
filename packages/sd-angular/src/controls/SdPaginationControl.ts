import {
  ChangeDetectionStrategy,
  Component,
  DoCheck,
  EventEmitter,
  inject,
  Injector,
  Input,
  Output
} from "@angular/core";
import {SdAnchorControl} from "./SdAnchorControl";
import {SdIconControl} from "./SdIconControl";
import {coercionNumber} from "../utils/commons";
import {SdNgHelper} from "../utils/SdNgHelper";
import {SdAngularOptionsProvider} from "../providers/SdAngularOptionsProvider";

@Component({
  selector: "sd-pagination",
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    SdAnchorControl,
    SdIconControl
  ],
  template: `
    <sd-anchor [disabled]="!hasPrev" (click)="onGoFirstClick()">
      <sd-icon [icon]="icons.angleDoubleLeft" fixedWidth/>
    </sd-anchor>
    <sd-anchor [disabled]="!hasPrev" (click)="onPrevClick()">
      <sd-icon [icon]="icons.angleLeft" fixedWidth/>
    </sd-anchor>
    @for (displayPage of displayPages; track displayPage) {
      <sd-anchor (click)="onPageClick(displayPage)"
                 [attr.sd-selected]="displayPage === page">
        {{ displayPage + 1 }}
      </sd-anchor>
    }
    <sd-anchor [disabled]="!hasNext" (click)="onNextClick()">
      <sd-icon [icon]="icons.angleRight" fixedWidth/>
    </sd-anchor>
    <sd-anchor [disabled]="!hasNext" (click)="onGoLastClick()">
      <sd-icon [icon]="icons.angleDoubleRight" fixedWidth/>
    </sd-anchor>`,
  styles: [/* language=SCSS */ `
    @import "../scss/mixins";

    :host {
      display: block;

      > sd-anchor {
        display: inline-block;
        padding: var(--gap-xs) var(--gap-sm);
        margin: var(--gap-xs);
        border-radius: var(--border-radius-sm);

        &[sd-selected=true] {
          text-decoration: underline;
        }

        body.sd-theme-modern &,
        body.sd-theme-mobile &,
        body.sd-theme-kiosk & {
          @include active-effect(true);
        }

        &:hover {
          background: var(--theme-grey-lightest);
        }
      }
    }
  `]
})
export class SdPaginationControl implements DoCheck {
  icons = inject(SdAngularOptionsProvider).icons;

  @Input({transform: coercionNumber}) page = 0;
  @Output() pageChange = new EventEmitter<number>();

  @Input({transform: coercionNumber}) pageLength = 0;
  @Input({transform: coercionNumber}) displayPageLength = 10;

  displayPages: number[] = [];

  get hasNext() {
    return (this.displayPages.last() ?? 0) < (this.pageLength - 1);
  };

  get hasPrev() {
    return (this.displayPages[0] ?? 0) > 0;
  }

  #sdNgHelper = new SdNgHelper(inject(Injector));

  ngDoCheck() {
    this.#sdNgHelper.doCheck(run => {
      run({
        pageLength: [this.pageLength],
        page: [this.page],
        displayPageLength: [this.displayPageLength],
      }, () => {
        const pages: number[] = [];
        for (let i = 0; i < this.pageLength; i++) {
          pages.push(i);
        }

        const from = Math.floor(this.page / this.displayPageLength) * this.displayPageLength;
        const to = Math.min(from + this.displayPageLength, this.pageLength);
        this.displayPages = pages.filter((item) => item >= from && item < to);
      });
    });
  }

  onPageClick(page: number) {
    this.#setPage(page);
  }

  onNextClick() {
    const page = (this.displayPages.last() ?? 0) + 1;
    this.#setPage(page);
  }

  onPrevClick() {
    const page = (this.displayPages[0] ?? 0) - 1;
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
      if (this.pageChange.observed) {
        this.pageChange.emit(page);
      }
      else {
        this.page = page;
      }
    }
  }
}
