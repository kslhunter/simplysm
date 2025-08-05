import { ChangeDetectionStrategy, Component, inject, input, model, ViewEncapsulation } from "@angular/core";
import { SdAngularConfigProvider } from "../providers/sd-angular-config.provider";
import { $computed } from "../utils/bindings/$computed";
import { FaIconComponent } from "@fortawesome/angular-fontawesome";

@Component({
  selector: "sd-pagination",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [FaIconComponent],
  host: {
    class: "flex flex-gap-xs",
  },
  template: `
    <a [class.a-disabled]="!hasPrev()" (click)="onGoFirstClick()">
      <fa-icon [icon]="icons.angleDoubleLeft" [fixedWidth]="true" />
    </a>
    <a [class.a-disabled]="!hasPrev()" (click)="onPrevClick()">
      <fa-icon [icon]="icons.angleLeft" [fixedWidth]="true" />
    </a>
    @for (displayPage of displayPages(); track displayPage) {
      <a (click)="onPageClick(displayPage)" [attr.data-sd-selected]="displayPage === currentPage()">
        {{ displayPage + 1 }}
      </a>
    }
    <a [class.a-disabled]="!hasNext()" (click)="onNextClick()">
      <fa-icon [icon]="icons.angleRight" [fixedWidth]="true" />
    </a>
    <a [class.a-disabled]="!hasNext()" (click)="onGoLastClick()">
      <fa-icon [icon]="icons.angleDoubleRight" [fixedWidth]="true" />
    </a>
  `,
  styles: [
    /* language=SCSS */ `
      @use "../scss/mixins";

      sd-pagination {
        > a {
          display: inline-block;
          padding: var(--gap-xs);

          &[data-sd-selected="true"] {
            text-decoration: underline;
          }
        }
      }
    `,
  ],
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
