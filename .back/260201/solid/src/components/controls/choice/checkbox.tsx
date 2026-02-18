import { type Component, type JSX, type ParentComponent, Show, splitProps } from "solid-js";
import {
  checkbox,
  checkboxContents,
  checkboxIndicator,
  checkboxIndicatorIcon,
  type CheckboxStyles,
} from "./checkbox.css";
import { ripple } from "../../../directives/ripple";
import "@simplysm/core-common";
import { objPick } from "@simplysm/core-common";
import { IconCheck, IconMinus, type IconProps } from "@tabler/icons-solidjs";
import { createFieldSignal } from "../../../hooks/createFieldSignal";
import { invalid } from "../../../directives/invalid";
import { Dynamic } from "solid-js/web";

void ripple;
void invalid;

export interface CheckboxProps
  extends Omit<JSX.LabelHTMLAttributes<HTMLLabelElement>, "onChange">, CheckboxStyles {
  onChange?: (checked: boolean | "-" | undefined) => void;
  icon?: Component<IconProps>;
  required?: boolean;
}

export const Checkbox: ParentComponent<CheckboxProps> = (props) => {
  const [local, rest] = splitProps(props, [...checkbox.variants(), "children", "onChange", "icon"]);

  const [value, setValue] = createFieldSignal({
    value: () => local.value,
    onChange: () => local.onChange,
  });

  const handleChange = () => setValue((v) => !Boolean(v));

  const invalidMessage = () => {
    const errorMessages: string[] = [];

    if (props.required) {
      errorMessages.push("필수 체크 항목입니다.");
    }

    return errorMessages.join("\r\n");
  };

  return (
    <label
      use:ripple={!local.disabled}
      use:invalid={invalidMessage()}
      tabindex="0"
      {...rest}
      class={[
        checkbox({
          ...objPick(local, checkbox.variants()),
          value: value(),
        }),
        rest.class,
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={handleChange}
    >
      <span class={checkboxIndicator}>
        <span class={checkboxIndicatorIcon}>
          <Show when={local.value === "-"}>
            <IconMinus />
          </Show>
          <Show when={local.value === true}>
            <Dynamic component={local.icon ?? IconCheck} />
          </Show>
        </span>
      </span>
      <span class={checkboxContents}>{local.children}</span>
    </label>
  );
};
