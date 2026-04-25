import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  model,
  type InputSignal,
  ViewEncapsulation,
} from "@angular/core";
import {
  SdModalProvider,
  type SdModalContentDef,
  type SdModalInfo,
  type SdModalOptions,
} from "../../core/modal/sd-modal.provider";
import type { SelectModeValue } from "../select/sd-select";
import { SdAnchor } from "./sd-anchor";
import { SdButton } from "./sd-button";
import { setupInvalid } from "../../core/validation/setupInvalid";
import type { SelectModalOutputResult } from "../../core/select-modal-output-result";
import { NgIcon } from "@ng-icons/core";
import { tablerSearch, tablerEraser } from "@ng-icons/tabler-icons";

/**
 * 모달 선택 컴포넌트가 구현해야 하는 인터페이스
 * SdModalContentDef을 확장하여 selectMode와 selectedKeys를 추가한다.
 */
export interface SdSelectModal<TKey> extends SdModalContentDef<SelectModalOutputResult<TKey>> {
  selectMode: InputSignal<"single" | "multi" | undefined>;
  selectedKeys: InputSignal<TKey[]>;
}

/**
 * 모달 선택 정보 (selectMode/selectedKeys를 제외한 inputs)
 */
export type SdSelectModalInfo<T extends SdSelectModal<any>> = SdModalInfo<
  T,
  "selectMode" | "selectedKeys"
>;

@Component({
  selector: "sd-modal-select-button",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [SdAnchor, SdButton, NgIcon],
  template: `
    <div class="_content">
      <ng-content />
    </div>
    <div class="_button">
      @if (!disabled() && !required() && _hasValue()) {
        <sd-anchor data-sd-eraser [theme]="'danger'" (click)="onEraseClick()">
          <ng-icon [svg]="tablerEraser" />
        </sd-anchor>
      }
      @if (!disabled()) {
        <sd-button [inset]="true" (click)="onSearchClick($event)">
          <ng-icon [svg]="searchIcon()" />
        </sd-button>
      }
    </div>
  `,
  styles: [
    /* language=SCSS */ `
      @use "../../../scss/commons/mixins";

      sd-modal-select-button {
        display: flex;
        flex-direction: row;
        gap: var(--gap-sm);
        position: relative;
        width: 100%;
        min-width: 3em;

        border: 1px solid var(--trans-light);
        border-radius: var(--border-radius-default);
        overflow: hidden;

        > ._content {
          flex: 1;
          padding: var(--gap-sm) var(--gap-default);
        }

        > ._button {
          display: flex;
          flex-wrap: nowrap;
          @include mixins.flex-direction(row);

          > sd-anchor {
            padding: var(--gap-sm) !important;
          }

          > sd-button > button {
            border-left: 1px solid var(--trans-lighter) !important;
            padding: var(--gap-sm) !important;
            height: 100%;
          }
        }

        &[data-sd-inset="true"] {
          border-radius: 0;
          border: none;
        }

        &[data-sd-size="sm"] {
          > ._content {
            padding: var(--gap-xs) var(--gap-default);
          }

          > ._button {
            > sd-anchor {
              padding: var(--gap-xs) var(--gap-sm) !important;
            }

            > sd-button > button {
              padding: var(--gap-xs) var(--gap-sm) !important;
            }
          }
        }

        &[data-sd-size="lg"] {
          > ._content {
            padding: var(--gap-default) var(--gap-xl);
          }

          > ._button {
            > sd-anchor {
              padding: var(--gap-default) !important;
            }

            > sd-button > button {
              padding: var(--gap-default) !important;
            }
          }
        }
      }
    `,
  ],
  host: {
    "[attr.data-sd-size]": "size()",
    "[attr.data-sd-inset]": "inset()",
    "[attr.data-sd-disabled]": "disabled()",
  },
})
export class SdModalSelectButton<
  K,
  M extends keyof SelectModeValue<K> = keyof SelectModeValue<K>,
> {
  private readonly _sdModal = inject(SdModalProvider);

  modal = input.required<SdSelectModalInfo<SdSelectModal<K>>>();

  value = model<SelectModeValue<K>[M]>();

  disabled = input(false, { transform: booleanAttribute });
  required = input(false, { transform: booleanAttribute });
  inset = input(false, { transform: booleanAttribute });
  size = input<"sm" | "lg">();
  selectMode = input<M>("single" as M);
  modalOptions = input<SdModalOptions>();

  searchIcon = input(tablerSearch);

  protected readonly tablerEraser = tablerEraser;

  _hasValue = computed(() => {
    const v = this.value();
    if (v == null) return false;
    if (Array.isArray(v)) return v.length > 0;
    return true;
  });

  constructor() {
    setupInvalid(() => {
      if (!this.required()) return "";
      const v = this.value();
      if (v == null) return "선택된 항목이 없습니다.";
      if (Array.isArray(v) && v.length === 0) return "선택된 항목이 없습니다.";
      return "";
    });
  }

  onEraseClick(): void {
    this.value.set((this.selectMode() === "multi" ? [] : undefined) as any);
  }

  async onSearchClick(event: MouseEvent): Promise<void> {
    event.preventDefault();
    event.stopPropagation();

    const modal = this.modal();
    const result = await this._sdModal.showAsync({
      ...modal,
      inputs: {
        selectMode: this.selectMode(),
        selectedKeys: (this.selectMode() === "multi"
          ? ((this.value() as any[] | undefined) ?? [])
          : [this.value()]
        ).filterExists(),
        ...modal.inputs,
      },
    });

    if (result) {
      const newValue =
        this.selectMode() === "multi" ? result.selectedKeys : result.selectedKeys[0];
      this.value.set(newValue as SelectModeValue<K>[M]);
    }
  }
}
