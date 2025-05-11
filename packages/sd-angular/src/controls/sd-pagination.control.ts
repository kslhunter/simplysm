import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  model,
  ViewEncapsulation,
} from "@angular/core";
import { SdAnchorControl } from "./sd-anchor.control";
import { SdAngularConfigProvider } from "../providers/sd-angular-config.provider";
import { $computed } from "../utils/hooks/hooks";
import { SdIconControl } from "./sd-icon.control";

@Component({
  selector: "sd-pagination",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [SdAnchorControl, SdIconControl],
  styles: [
    /* language=SCSS */ `
      @use "../scss/mixins";

      sd-pagination {
        display: flex;
        flex-direction: row;

        > sd-anchor {
          display: inline-block;
          padding: var(--gap-sm);

          &[sd-selected="true"] {
            text-decoration: underline;
          }
        }
      }
    `,
  ],
  template: `
    <sd-anchor [disabled]="!hasPrev()" (click)="onGoFirstClick()">
      <sd-icon [icon]="icons.angleDoubleLeft" fixedWidth />
    </sd-anchor>
    <sd-anchor [disabled]="!hasPrev()" (click)="onPrevClick()">
      <sd-icon [icon]="icons.angleLeft" fixedWidth />
    </sd-anchor>
    @for (displayPage of displayPages(); track displayPage) {
      <sd-anchor
        (click)="onPageClick(displayPage)"
        [attr.sd-selected]="displayPage === currentPage()"
      >
        {{ displayPage + 1 }}
      </sd-anchor>
    }
    <sd-anchor [disabled]="!hasNext()" (click)="onNextClick()">
      <sd-icon [icon]="icons.angleRight" fixedWidth />
    </sd-anchor>
    <sd-anchor [disabled]="!hasNext()" (click)="onGoLastClick()">
      <sd-icon [icon]="icons.angleDoubleRight" fixedWidth />
    </sd-anchor>
  `,
})
export class SdPaginationControl {
  protected readonly icons = inject(SdAngularConfigProvider).icons;

  currentPage = model<number>(0);

  totalPageCount = input(0);
  visiblePageCount = input(10);

  displayPages = $computed(() => {
    const pages: number[] = [];
    for (let i = 0; i < this.totalPageCount(); i++) {
      pages.push(i);
    }

    const from = Math.floor(this.currentPage() / this.visiblePageCount()) * this.visiblePageCount();
    const to = Math.min(from + this.visiblePageCount(), this.totalPageCount());
    return pages.filter((item) => item >= from && item < to);
  });

  hasNext = $computed(() => {
    return (this.displayPages().last() ?? 0) < this.totalPageCount() - 1;
  });

  hasPrev = $computed(() => {
    return (this.displayPages().first() ?? 0) > 0;
  });

  onPageClick(page: number) {
    this.currentPage.set(page);
  }

  onNextClick() {
    const page = (this.displayPages().last() ?? 0) + 1;
    this.currentPage.set(page);
  }

  onPrevClick() {
    const page = (this.displayPages().first() ?? 0) - 1;
    this.currentPage.set(page);
  }

  onGoFirstClick() {
    const page = 0;
    this.currentPage.set(page);
  }

  onGoLastClick() {
    const page = this.totalPageCount() - 1;
    this.currentPage.set(page);
  }
}
