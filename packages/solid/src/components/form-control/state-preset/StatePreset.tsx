import { createSignal, For, Show, splitProps } from "solid-js";
import type { JSX } from "solid-js";
import { twMerge } from "tailwind-merge";
import clsx from "clsx";
import { IconDeviceFloppy, IconStar, IconX } from "@tabler/icons-solidjs";
import { obj } from "@simplysm/core-common";
import { useSyncConfig } from "../../../hooks/useSyncConfig";
import { useNotification } from "../../feedback/notification/NotificationProvider";
import { Icon } from "../../display/Icon";
import { bg, text } from "../../../styles/base.styles";
import { type ComponentSize, gap, pad } from "../../../styles/control.styles";
import { themeTokens } from "../../../styles/theme.styles";
import { Button } from "../Button";
import { useI18n } from "../../../providers/i18n/I18nProvider";

// ── Types ──

interface StatePresetItem<TValue> {
  name: string;
  state: TValue;
}

type StatePresetSize = ComponentSize;

export interface StatePresetProps<TValue> {
  storageKey: string;
  value: TValue;
  onValueChange: (value: TValue) => void;
  size?: StatePresetSize;
  class?: string;
  style?: JSX.CSSProperties;
}

// ── Style constants ──

const chipSizeClasses: Record<StatePresetSize, string> = {
  md: pad.md,
  xs: clsx(pad.xs, "text-sm"),
  sm: pad.sm,
  lg: pad.lg,
  xl: clsx(pad.xl, "text-lg"),
};

const iconBtnSizeClasses: Record<StatePresetSize, string> = {
  md: "p-0.5",
  xs: "p-0",
  sm: "p-0.5",
  lg: "p-1",
  xl: "p-1.5",
};

const starBtnSizeClasses: Record<StatePresetSize, string> = {
  md: "p-1",
  xs: "p-0",
  sm: "p-0.5",
  lg: "p-1.5",
  xl: "p-2",
};

const inputSizeClasses: Record<StatePresetSize, string> = {
  md: clsx(pad.md, "w-24"),
  xs: clsx("w-16", pad.xs, "text-sm"),
  sm: clsx(pad.sm, "w-20"),
  lg: clsx(pad.lg, "w-32"),
  xl: clsx(pad.xl, "w-36 text-lg"),
};

const iconSize = "0.85em";

// ── Component ──

function StatePresetInner<TValue>(props: StatePresetProps<TValue>): JSX.Element {
  const [local] = splitProps(props, [
    "storageKey",
    "value",
    "onValueChange",
    "size",
    "class",
    "style",
  ]);

  const notification = useNotification();
  const i18n = useI18n();

  // storageKey is an identifier set only once at mount, evaluate immediately to capture
  const [presets, setPresets] = useSyncConfig<StatePresetItem<TValue>[]>(
    `state-preset.${local.storageKey}`,
    [],
  );
  const [adding, setAdding] = createSignal(false);
  const [inputValue, setInputValue] = createSignal("");

  // ── Handlers ──

  function handleStartAdd(): void {
    setAdding(true);
    setInputValue("");
  }

  function handleCancelAdd(): void {
    setAdding(false);
    setInputValue("");
  }

  function handleConfirmAdd(): void {
    const name = inputValue().trim();
    if (!name) {
      handleCancelAdd();
      return;
    }

    if (presets().some((p) => p.name === name)) {
      notification.warning(
        i18n.t("statePreset.duplicateName"),
        i18n.t("statePreset.duplicateMessage"),
      );
      return;
    }

    const newPreset: StatePresetItem<TValue> = {
      name,
      state: obj.clone(local.value),
    };
    setPresets([...presets(), newPreset]);
    notification.info(i18n.t("statePreset.saved"), i18n.t("statePreset.savedMessage", { name }));
    setAdding(false);
    setInputValue("");
  }

  function handleRestore(preset: StatePresetItem<TValue>): void {
    if (!obj.equal(local.value, preset.state)) {
      local.onValueChange(obj.clone(preset.state));
    }
  }

  function handleOverwrite(index: number): void {
    const snapshot = [...presets()];
    const presetName = snapshot[index].name;

    const updated = snapshot.map((p, i) =>
      i === index ? { ...p, state: obj.clone(local.value) } : p,
    );
    setPresets(updated);

    const notiId = notification.info(
      i18n.t("statePreset.overwritten"),
      i18n.t("statePreset.overwrittenMessage", { name: presetName }),
      {
        action: {
          label: i18n.t("statePreset.undo"),
          onClick: () => {
            setPresets(snapshot);
            notification.remove(notiId);
          },
        },
      },
    );
  }

  function handleDelete(index: number): void {
    const snapshot = [...presets()];
    const presetName = snapshot[index].name;

    const updated = snapshot.filter((_, i) => i !== index);
    setPresets(updated);

    const notiId = notification.info(
      i18n.t("statePreset.deleted"),
      i18n.t("statePreset.deletedMessage", { name: presetName }),
      {
        action: {
          label: i18n.t("statePreset.undo"),
          onClick: () => {
            setPresets(snapshot);
            notification.remove(notiId);
          },
        },
      },
    );
  }

  function handleInputKeyDown(e: KeyboardEvent): void {
    if (e.key === "Enter") {
      e.preventDefault();
      handleConfirmAdd();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCancelAdd();
    }
  }

  // ── Render ──

  const resolvedIconBtnClass = () =>
    twMerge("rounded-full", iconBtnSizeClasses[local.size ?? "md"]);

  return (
    <div class={twMerge(clsx("inline-flex items-center", gap.lg, "flex-wrap"), local.class)} style={local.style}>
      {/* Star button - add preset */}
      <button
        type="button"
        class={twMerge(
          clsx("inline-flex cursor-pointer items-center justify-center rounded-full text-warning-500 transition-colors focus:outline-none", themeTokens.warning.hoverBg),
          starBtnSizeClasses[local.size ?? "md"],
        )}
        onClick={handleStartAdd}
        title={i18n.t("statePreset.addPreset")}
      >
        <Icon icon={IconStar} size={iconSize} />
      </button>

      {/* Preset chips */}
      <For each={presets()}>
        {(preset, index) => (
          <span
            class={twMerge(
              clsx("inline-flex items-center", gap.md, "rounded-full", bg.subtle, text.default, "cursor-default"),
              chipSizeClasses[local.size ?? "md"],
            )}
          >
            <button
              type="button"
              class="cursor-pointer hover:underline focus:outline-none"
              onClick={() => handleRestore(preset)}
              title={preset.name}
            >
              {preset.name}
            </button>
            <Button
              variant="ghost"
              size="xs"
              class={resolvedIconBtnClass()}
              onClick={() => handleOverwrite(index())}
              title={i18n.t("statePreset.overwrite")}
            >
              <Icon icon={IconDeviceFloppy} size={iconSize} />
            </Button>
            <Button
              variant="ghost"
              size="xs"
              class={resolvedIconBtnClass()}
              onClick={() => handleDelete(index())}
              title={i18n.t("statePreset.deletePreset")}
            >
              <Icon icon={IconX} size={iconSize} />
            </Button>
          </span>
        )}
      </For>

      {/* Inline input for naming a new preset */}
      <Show when={adding()}>
        <input
          ref={(el) => {
            // Autofocus when input appears
            requestAnimationFrame(() => el.focus());
          }}
          type="text"
          class={twMerge(
            clsx("rounded-full", bg.subtle, text.default, "border border-transparent focus:outline-none focus:ring-1 focus:ring-primary-400", text.placeholder),
            inputSizeClasses[local.size ?? "md"],
          )}
          placeholder={i18n.t("statePreset.namePlaceholder")}
          autocomplete="one-time-code"
          value={inputValue()}
          onInput={(e) => setInputValue(e.currentTarget.value)}
          onKeyDown={handleInputKeyDown}
          onBlur={() => (inputValue().trim() ? handleConfirmAdd() : handleCancelAdd())}
        />
      </Show>
    </div>
  );
}

export const StatePreset = StatePresetInner as <TValue>(
  props: StatePresetProps<TValue>,
) => JSX.Element;
