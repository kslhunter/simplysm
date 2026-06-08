import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  input,
  ViewEncapsulation,
} from "@angular/core";

@Component({
  selector: "sd-list",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  template: `
    <ng-content />
  `,
  styles: [
    /* language=SCSS */ `
      sd-list {
        display: flex;
        flex-direction: column;
        user-select: none;
        background: var(--control-color);
        border: 1px solid var(--border-color-default);
        border-radius: var(--border-radius-default);
        padding: var(--gap-sm);
        gap: var(--gap-xs);

        &[data-sd-inset="true"] {
          background: transparent;
          border: none;

          sd-list {
            background: transparent;
          }
        }

        // 아이템 내부에 중첩된 리스트는 카드 외형(테두리·라운드·배경)을 제거
        sd-list-item sd-list {
          border-color: transparent;
          border-radius: 0;
          padding: var(--gap-xs);
          background: transparent;
        }
      }
    `,
  ],
  host: {
    "[attr.data-sd-inset]": "inset()",
  },
})
export class SdList {
  inset = input(false, { transform: booleanAttribute });
}
