import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  model,
  ViewEncapsulation,
} from "@angular/core";
import { ObjectUtils } from "@simplysm/sd-core-common";
import { SdSystemConfigProvider } from "../../../core/providers/app/sd-system-config.provider";
import { SdToastProvider } from "../../overlay/toast/sd-toast.provider";
import { $effect } from "../../../core/utils/bindings/$effect";
import { $signal } from "../../../core/utils/bindings/$signal";
import { SdGapControl } from "../../layout/sd-gap.control";
import { SdAnchorControl } from "../button/sd-anchor.control";
import { NgIcon } from "@ng-icons/core";
import { tablerDeviceFloppy, tablerStar, tablerX } from "@ng-icons/tabler-icons";

@Component({
  selector: "sd-state-preset",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [SdGapControl, SdAnchorControl, NgIcon],
  template: `
    <sd-anchor (click)="onAddButtonClick()">
      <ng-icon [svg]="tablerStar" class="tx-theme-warning-default" />
    </sd-anchor>
    <sd-gap [width]="'sm'"></sd-gap>
    @for (preset of presets(); track preset.name) {
      <div>
        <sd-anchor (click)="onItemClick(preset)" class="tx-trans-default">
          {{ preset.name }}
        </sd-anchor>
        <sd-anchor (click)="onSaveButtonClick(preset)">
          <ng-icon [svg]="tablerDeviceFloppy" [size]="'1em'" />
        </sd-anchor>
        <sd-anchor (click)="onRemoveButtonClick(preset)">
          <ng-icon [svg]="tablerX" [size]="'1em'" />
        </sd-anchor>
      </div>
      <sd-gap [width]="'sm'"></sd-gap>
    }
  `,
  styles: [
    /* language=SCSS */ `
      sd-state-preset {
        display: inline-block;
        vertical-align: top;

        > sd-anchor {
          display: inline-block;
          vertical-align: top;
          line-height: var(--line-height);
          border: 1px solid transparent;
          padding: var(--gap-sm) var(--gap-default);
        }

        > div {
          display: inline-block;
          vertical-align: top;
          line-height: var(--line-height);
          border: 1px solid transparent;
          padding: var(--gap-sm) var(--gap-default);

          background: var(--theme-gray-lightest);
          border-radius: var(--border-radius-lg);

          &:hover {
            background: var(--theme-gray-lighter);
          }

          > sd-anchor {
            padding: 0 var(--gap-sm);
          }
        }

        &[data-sd-size="sm"] {
          > sd-anchor,
          > div {
            padding: var(--gap-xs) var(--gap-default);
          }
        }

        &[data-sd-size="lg"] {
          > sd-anchor,
          > div {
            padding: var(--gap-default) var(--gap-lg);
          }
        }
      }
    `,
  ],
  host: {
    "[attr.data-sd-size]": "size()",
  },
})
export class SdStatePresetControl {
  private readonly _sdSystemConfig = inject(SdSystemConfigProvider);
  private readonly _sdToast = inject(SdToastProvider);

  state = model<any>();

  key = input.required<string>();
  size = input<"sm" | "lg">();

  presets = $signal<ISdStatePreset[]>([]);

  constructor() {
    $effect([this.key], async () => {
      this.presets.set(
        (await this._sdSystemConfig.getAsync(`sd-state-preset.${this.key()}`)) ?? [],
      );
    });
  }

  async onAddButtonClick() {
    const newName = prompt("현재 상태를 저장합니다.");
    if (newName == null) return;

    this.presets.update((v) => [
      ...v,
      {
        name: newName,
        state: ObjectUtils.clone(this.state()),
      },
    ]);
    await this._sdSystemConfig.setAsync(`sd-state-preset.${this.key()}`, this.presets());

    this._sdToast.info(`현재 상태가 '${newName}'에 저장되었습니다.`);
  }

  onItemClick(preset: ISdStatePreset) {
    if (!ObjectUtils.equal(this.state(), preset.state)) {
      this.state.set(ObjectUtils.clone(preset.state));
    }
  }

  async onRemoveButtonClick(preset: ISdStatePreset) {
    if (!confirm("저장된 '" + preset.name + "'상태가 삭제됩니다.")) return;

    this.presets.update((v) => v.filter((item) => item !== preset));
    await this._sdSystemConfig.setAsync(`sd-state-preset.${this.key()}`, this.presets());
  }

  async onSaveButtonClick(preset: ISdStatePreset) {
    preset.state = ObjectUtils.clone(this.state());
    await this._sdSystemConfig.setAsync(`sd-state-preset.${this.key()}`, this.presets());

    this._sdToast.info(`현재 상태가 ${preset.name}에 저장되었습니다.`);
  }

  protected readonly tablerStar = tablerStar;
  protected readonly tablerX = tablerX;
  protected readonly tablerDeviceFloppy = tablerDeviceFloppy;
}

export interface ISdStatePreset {
  name: string;
  state: any;
}
