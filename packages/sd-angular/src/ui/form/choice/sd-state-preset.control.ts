import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  model,
  ViewEncapsulation,
} from "@angular/core";
import { ObjectUtils } from "@simplysm/sd-core-common";
import { SdAngularConfigProvider } from "../../../core/providers/app/sd-angular-config.provider";
import { SdSystemConfigProvider } from "../../../core/providers/app/sd-system-config.provider";
import { SdToastProvider } from "../../overlay/toast/sd-toast.provider";
import { $effect } from "../../../core/utils/bindings/$effect";
import { $signal } from "../../../core/utils/bindings/$signal";
import { SdGapControl } from "../../layout/sd-gap.control";
import { FaIconComponent } from "@fortawesome/angular-fontawesome";
import { SdAnchorControl } from "../button/sd-anchor.control";

@Component({
  selector: "sd-state-preset",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [SdGapControl, FaIconComponent, SdAnchorControl],
  template: `
    <sd-anchor (click)="onAddButtonClick()">
      <fa-icon [icon]="icons.star" class="tx-theme-warning-default" [fixedWidth]="true" />
    </sd-anchor>
    <sd-gap [width]="'sm'"></sd-gap>
    @for (preset of presets(); track preset.name) {
      <div>
        <sd-anchor (click)="onItemClick(preset)" class="tx-trans-default">
          {{ preset.name }}
        </sd-anchor>
        <sd-anchor (click)="onSaveButtonClick(preset)">
          <fa-icon [icon]="icons.save" size="sm" />
        </sd-anchor>
        <sd-anchor (click)="onRemoveButtonClick(preset)">
          <fa-icon [icon]="icons.xmark" size="sm" />
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
  protected readonly icons = inject(SdAngularConfigProvider).icons;

  #sdSystemConfig = inject(SdSystemConfigProvider);
  #sdToast = inject(SdToastProvider);

  state = model<any>();

  key = input.required<string>();
  size = input<"sm" | "lg">();

  presets = $signal<ISdStatePreset[]>([]);

  constructor() {
    $effect([this.key], async () => {
      this.presets.set(
        (await this.#sdSystemConfig.getAsync(`sd-state-preset.${this.key()}`)) ?? [],
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
    await this.#sdSystemConfig.setAsync(`sd-state-preset.${this.key()}`, this.presets());

    this.#sdToast.info(`현재 상태가 '${newName}'에 저장되었습니다.`);
  }

  onItemClick(preset: ISdStatePreset) {
    if (!ObjectUtils.equal(this.state(), preset.state)) {
      this.state.set(ObjectUtils.clone(preset.state));
    }
  }

  async onRemoveButtonClick(preset: ISdStatePreset) {
    if (!confirm("저장된 '" + preset.name + "'상태가 삭제됩니다.")) return;

    this.presets.update((v) => v.filter((item) => item !== preset));
    await this.#sdSystemConfig.setAsync(`sd-state-preset.${this.key()}`, this.presets());
  }

  async onSaveButtonClick(preset: ISdStatePreset) {
    preset.state = ObjectUtils.clone(this.state());
    await this.#sdSystemConfig.setAsync(`sd-state-preset.${this.key()}`, this.presets());

    this.#sdToast.info(`현재 상태가 ${preset.name}에 저장되었습니다.`);
  }
}

export interface ISdStatePreset {
  name: string;
  state: any;
}
