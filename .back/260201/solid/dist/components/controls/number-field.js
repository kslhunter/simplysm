import { Show, createSignal, splitProps } from "solid-js";
import { createFieldState } from "../../hooks/createFieldState";
import {
  numberField,
  numberFieldContainer,
  numberFieldContent,
  numberFieldInput,
} from "./number-field.css";
import { objPick, numParseFloat } from "@simplysm/core-common";
import "@simplysm/core-common";
const NumberField = (props) => {
  const [local, rest] = splitProps(props, [
    ...numberField.variants(),
    "class",
    "value",
    "onChange",
    "useNumberComma",
    "minDigits",
    "placeholder",
  ]);
  const [isFocused, setIsFocused] = createSignal(false);
  const fieldState = createFieldState({
    value: () => local.value,
    onChange: () => local.onChange,
  });
  const displayValue = () => {
    const value = fieldState.currentValue();
    if (value === void 0) return "";
    if (isFocused()) {
      return String(value);
    }
    let result;
    if (local.minDigits !== void 0 && local.minDigits > 0) {
      const isNegative = value < 0;
      const absStr = String(Math.abs(value));
      const parts = absStr.split(".");
      let intPart = parts[0].padStart(local.minDigits, "0");
      const decPart = parts[1];
      if (local.useNumberComma) {
        intPart = Number(intPart).toLocaleString();
      }
      const formatted = decPart != null ? `${intPart}.${decPart}` : intPart;
      result = isNegative ? `-${formatted}` : formatted;
    } else if (local.useNumberComma) {
      result = value.toLocaleString(void 0, { maximumFractionDigits: 10 });
    } else {
      result = String(value);
    }
    return result;
  };
  const handleInput = (e) => {
    const input = e.currentTarget;
    const raw = input.value;
    if (raw === "" || raw === "-") {
      fieldState.setValue(void 0);
      return;
    }
    const num = numParseFloat(raw);
    if (num !== void 0) {
      fieldState.setValue(num);
    }
  };
  const handleFocus = (e) => {
    setIsFocused(true);
    if (typeof rest.onFocus === "function") {
      rest.onFocus(e);
    }
  };
  const handleBlur = (e) => {
    setIsFocused(false);
    if (typeof rest.onBlur === "function") {
      rest.onBlur(e);
    }
  };
  const inputProps = () => ({
    "type": "text",
    "inputMode": "decimal",
    "value": displayValue(),
    "onInput": handleInput,
    "onFocus": handleFocus,
    "onBlur": handleBlur,
    "placeholder": local.placeholder,
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
        class: [numberField(objPick(local, numberField.variants())), local.class]
          .filterExists()
          .join(" "),
      }),
    },
    /* @__PURE__ */ React.createElement(
      "div",
      { class: numberFieldContainer },
      /* @__PURE__ */ React.createElement(
        "div",
        { class: numberFieldContent },
        displayValue() !== "" ? displayValue() : (local.placeholder ?? "\xA0"),
      ),
      /* @__PURE__ */ React.createElement("input", {
        ...rest,
        ...inputProps(),
        class: [numberFieldInput, numberField(objPick(local, numberField.variants())), local.class]
          .filterExists()
          .join(" "),
      }),
    ),
  );
};
export { NumberField };
//# sourceMappingURL=number-field.js.map
