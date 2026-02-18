import { Show, splitProps } from "solid-js";
import {
  colorField,
  colorFieldContainer,
  colorFieldContent,
  colorFieldInput,
} from "./color-field.css";
import { objPick } from "@simplysm/core-common";
import "@simplysm/core-common";
import { createFieldState } from "../../hooks/createFieldState";
const ColorField = (props) => {
  const [local, rest] = splitProps(props, [...colorField.variants(), "class", "value", "onChange"]);
  const fieldState = createFieldState({
    value: () => local.value ?? "#000000",
    onChange: () => local.onChange,
  });
  const inputValue = () => fieldState.currentValue();
  const handleChange = (e) => {
    const input = e.currentTarget;
    const newValue = input.value !== "" ? input.value : void 0;
    fieldState.setValue(newValue);
  };
  const inputProps = () => ({
    "type": "color",
    "value": inputValue(),
    "onChange": handleChange,
    "aria-disabled": rest.disabled ? "true" : void 0,
    "aria-readonly": rest.readOnly ? "true" : void 0,
  });
  return /* @__PURE__ */ React.createElement(
    Show,
    {
      when: local.inline,
      fallback: /* @__PURE__ */ React.createElement("input", {
        ...rest,
        ...inputProps(),
        class: [colorField(objPick(local, colorField.variants())), local.class]
          .filterExists()
          .join(" "),
      }),
    },
    /* @__PURE__ */ React.createElement(
      "div",
      { class: colorFieldContainer },
      /* @__PURE__ */ React.createElement("div", {
        class: colorFieldContent,
        style: { background: inputValue() },
      }),
      /* @__PURE__ */ React.createElement("input", {
        ...rest,
        ...inputProps(),
        class: [colorFieldInput, colorField(objPick(local, colorField.variants())), local.class]
          .filterExists()
          .join(" "),
      }),
    ),
  );
};
export { ColorField };
//# sourceMappingURL=color-field.js.map
