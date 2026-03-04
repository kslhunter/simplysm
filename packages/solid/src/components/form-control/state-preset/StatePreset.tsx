import { createSignal, For, Show, splitProps } from "solid-js";
import type { JSX } from "solid-js";
import { twMerge } from "tailwind-merge";
import clsx from "clsx";
import { IconDeviceFloppy, IconStar, IconX } from "@tabler/icons-solidjs";
import { objClone, objEqual } from "@simplysm/core-common";
import { useSyncConfig } from "../../../hooks/useSyncConfig";
import { useNotification } from "../../feedback/notification/NotificationProvider";
import { Icon } from "../../display/Icon";
import { text } from "../../../styles/base.styles";
import { type ComponentSize, pad } from "../../../styles/control.styles";
import { Button } from "../Button";
import { useI18n } from "../../../providers/i18n/I18nContext";

// ── Types ──

interface StatePresetItem<TValue> {
  name: string;
  state: TValue;
}

type StatePresetSize = ComponentSize;

export interface StatePresetProps<TValue> {
  presetKey: string;
  value: TValue;
  onValueChange: (value: TValue) => void;
  size?: StatePresetSize;
  class?: string;
  style?: JSX.CSSProperties;
}

// ── Style constants ──

const baseClass = clsx("inline-flex items-center gap-1.5", "flex-wrap");

const chipClass = clsx(
  "inline-flex items-center gap-1",
  "rounded-full",
  "bg-base-200 dark:bg-base-700",
  "text-base-800 dark:text-base-200",
  "cursor-default",
);

const chipSizeClasses: Record<StatePresetSize, string> = {
  default: pad.default,
  xs: clsx(pad.xs, "text-sm"),
  sm: pad.sm,
  lg: pad.lg,
  xl: clsx(pad.xl, "text-lg"),
};

const chipNameBtnClass = clsx("cursor-pointer", "hover:underline", "focus:outline-none");

const iconBtnExtraClass = "rounded-full";

const iconBtnSizeClasses: Record<StatePresetSize, string> = {
  default: "p-0.5",
  xs: "p-0",
  sm: "p-0.5",
  lg: "p-1",
  xl: "p-1.5",
};

const starBtnClass = clsx(
  "inline-flex items-center justify-center",
  "rounded-full",
  "cursor-pointer",
  "transition-colors",
  "focus:outline-none",
  "text-warning-500",
  "hover:bg-warning-100 dark:hover:bg-warning-900/40",
);

const starBtnSizeClasses: Record<StatePresetSize, string> = {
  default: "p-1",
  xs: "p-0",
  sm: "p-0.5",
  lg: "p-1.5",
  xl: "p-2",
};

const inputClass = clsx(
  "rounded-full",
  "bg-base-200 dark:bg-base-700",
  "text-base-800 dark:text-base-200",
  "border border-transparent",
  "focus:ring-1 focus:ring-primary-400",
  "focus:outline-none",
  text.placeholder,
);

const inputSizeClasses: Record<StatePresetSize, string> = {
  default: clsx(pad.default, "w-24"),
  xs: clsx("w-16", pad.xs, "text-sm"),
  sm: clsx(pad.sm, "w-20"),
  lg: clsx(pad.lg, "w-32"),
  xl: clsx(pad.xl, "w-36 text-lg"),
};

const iconSize = "0.85em";

// ── Component ──

function StatePresetInner<TValue>(props: StatePresetProps<TValue>): JSX.Element {
  const [local] = splitProps(props, [
    "presetKey",
    "value",
    "onValueChange",
    "size",
    "class",
    "style",
  ]);

  const notification = useNotification();
  const i18n = useI18n();

  // presetKey is an identifier set only once at mount, evaluate immediately to capture
  /* eslint-disable solid/reactivity */
  const [presets, setPresets] = useSyncConfig<StatePresetItem<TValue>[]>(
    `state-preset.${local.presetKey}`,
    [],
  );
  /* eslint-enable solid/reactivity */
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
      state: objClone(local.value),
    };
    setPresets([...presets(), newPreset]);
    notification.info(i18n.t("statePreset.saved"), i18n.t("statePreset.savedMessage", { name }));
    setAdding(false);
    setInputValue("");
  }

  function handleRestore(preset: StatePresetItem<TValue>): void {
    if (!objEqual(local.value, preset.state)) {
      local.onValueChange(objClone(preset.state));
    }
  }

  function handleOverwrite(index: number): void {
    const snapshot = [...presets()];
    const presetName = snapshot[index].name;

    const updated = snapshot.map((p, i) =>
      i === index ? { ...p, state: objClone(local.value) } : p,
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

  const containerClass = () => twMerge(baseClass, local.class);

  const resolvedChipClass = () => twMerge(chipClass, chipSizeClasses[local.size ?? "default"]);

  const resolvedIconBtnClass = () =>
    twMerge(iconBtnExtraClass, iconBtnSizeClasses[local.size ?? "default"]);

  const resolvedStarBtnClass = () =>
    twMerge(starBtnClass, starBtnSizeClasses[local.size ?? "default"]);

  const resolvedInputClass = () => twMerge(inputClass, inputSizeClasses[local.size ?? "default"]);

  return (
    <div class={containerClass()} style={local.style}>
      {/* Star button - add preset */}
      <button
        type="button"
        class={resolvedStarBtnClass()}
        onClick={handleStartAdd}
        title={i18n.t("statePreset.addPreset")}
      >
        <Icon icon={IconStar} size={iconSize} />
      </button>

      {/* Preset chips */}
      <For each={presets()}>
        {(preset, index) => (
          <span class={resolvedChipClass()}>
            <button
              type="button"
              class={chipNameBtnClass}
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
          class={resolvedInputClass()}
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
