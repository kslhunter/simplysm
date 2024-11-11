import { ChangeDetectionStrategy, Component, inject, input, model, ViewEncapsulation } from "@angular/core";
import { SdAnchorControl } from "./SdAnchorControl";
import { SdAngularConfigProvider } from "../providers/SdAngularConfigProvider";
import { FaIconComponent } from "@fortawesome/angular-fontawesome";
import { $computed } from "../utils/$hooks";

@Component({
  selector: "sd-pagination",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [SdAnchorControl, FaIconComponent],
  styles: [
    /* language=SCSS */ `
      @import "../scss/mixins";

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
    `
  ],
  template: `
    <sd-anchor [disabled]="!hasPrev()" (click)="onGoFirstClick()">
      <fa-icon [icon]="icons.angleDoubleLeft" [fixedWidth]="true" />
    </sd-anchor>
    <sd-anchor [disabled]="!hasPrev()" (click)="onPrevClick()">
      <fa-icon [icon]="icons.angleLeft" [fixedWidth]="true" />
    </sd-anchor>
    @for (displayPage of displayPages(); track displayPage) {
      <sd-anchor (click)="onPageClick(displayPage)" [attr.sd-selected]="displayPage === page()">
        {{ displayPage + 1 }}
      </sd-anchor>
    }
    <sd-anchor [disabled]="!hasNext()" (click)="onNextClick()">
      <fa-icon [icon]="icons.angleRight" [fixedWidth]="true" />
    </sd-anchor>
    <sd-anchor [disabled]="!hasNext()" (click)="onGoLastClick()">
      <fa-icon [icon]="icons.angleDoubleRight" [fixedWidth]="true" />
    </sd-anchor>
  `
})
export class SdPaginationControl {
  icons = inject(SdAngularConfigProvider).icons;

  //TODO: 모델 쓰지 말기?
  page = model(0);

  pageLength = input(0);
  displayPageLength = input(10);

  displayPages = $computed(() => {
    const pages: number[] = [];
    for (let i = 0; i < this.pageLength(); i++) {
      pages.push(i);
    }

    const from = Math.floor(this.page() / this.displayPageLength()) * this.displayPageLength();
    const to = Math.min(from + this.displayPageLength(), this.pageLength());
    return pages.filter((item) => item >= from && item < to);
  });

  hasNext = $computed(() => {
    return (this.displayPages().last() ?? 0) < this.pageLength() - 1;
  });

  hasPrev = $computed(() => {
    return (this.displayPages().first() ?? 0) > 0;
  });

  onPageClick(page: number) {
    this.page.set(page);
  }

  onNextClick() {
    const page = (this.displayPages().last() ?? 0) + 1;
    this.page.set(page);
  }

  onPrevClick() {
    const page = (this.displayPages().first() ?? 0) - 1;
    this.page.set(page);
  }

  onGoFirstClick() {
    const page = 0;
    this.page.set(page);
  }

  onGoLastClick() {
    const page = this.pageLength() - 1;
    this.page.set(page);
  }
}
