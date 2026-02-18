import { Show, createSignal, splitProps } from "solid-js";
import { createFieldState } from "../../hooks/createFieldState";
import { textField, textFieldContainer, textFieldContent, textFieldInput } from "./text-field.css";
import { objPick } from "@simplysm/core-common";
import "@simplysm/core-common";
const FORMAT_PLACEHOLDERS = /[0Xx*]/;
const PLACEHOLDER_PATTERNS = {
  "0": /[0-9]/,
  "X": /[A-Z0-9]/,
  "x": /[a-z0-9]/,
  "*": /./,
};
function applyFormat(raw, format) {
  let result = "";
  let rawIndex = 0;
  for (const char of format) {
    if (rawIndex >= raw.length) break;
    if (FORMAT_PLACEHOLDERS.test(char)) {
      result += raw[rawIndex++];
    } else {
      result += char;
    }
  }
  return result;
}
function extractRaw(input, format) {
  let result = "";
  let formatIndex = 0;
  for (const inputChar of input) {
    while (formatIndex < format.length && !FORMAT_PLACEHOLDERS.test(format[formatIndex])) {
      formatIndex++;
    }
    if (formatIndex >= format.length) break;
    const placeholder = format[formatIndex];
    const pattern = PLACEHOLDER_PATTERNS[placeholder];
    if (pattern != null && pattern.test(inputChar)) {
      result += inputChar;
      formatIndex++;
    }
  }
  return result;
}
function isNumericFormat(format) {
  for (const char of format) {
    if (FORMAT_PLACEHOLDERS.test(char) && char !== "0") {
      return false;
    }
  }
  return true;
}
const TextField = (props) => {
  const [local, rest] = splitProps(props, [
    ...textField.variants(),
    "class",
    "value",
    "onChange",
    "type",
    "format",
    "placeholder",
  ]);
  const [isFocused, setIsFocused] = createSignal(false);
  const fieldState = createFieldState({
    value: () => local.value,
    onChange: () => local.onChange,
  });
  const displayValue = () => {
    const value = fieldState.currentValue() ?? "";
    if (local.format === void 0 || local.format === "" || isFocused()) {
      return value;
    }
    return applyFormat(value, local.format);
  };
  const inputMode = () => {
    if (local.type === "email") return "email";
    if (local.format !== void 0 && local.format !== "" && isNumericFormat(local.format)) {
      return "numeric";
    }
    return void 0;
  };
  const handleInput = (e) => {
    const input = e.currentTarget;
    let newValue = input.value;
    if (local.format !== void 0 && local.format !== "") {
      newValue = extractRaw(newValue, local.format);
    }
    if (newValue === "") {
      newValue = void 0;
    }
    fieldState.setValue(newValue);
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
    "type": local.type ?? "text",
    "value": displayValue(),
    "onInput": handleInput,
    "onFocus": handleFocus,
    "onBlur": handleBlur,
    "placeholder": local.placeholder,
    "inputMode": inputMode(),
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
        class: [textField(objPick(local, textField.variants())), local.class]
          .filterExists()
          .join(" "),
      }),
    },
    /* @__PURE__ */ React.createElement(
      "div",
      { class: textFieldContainer },
      /* @__PURE__ */ React.createElement(
        "div",
        { class: textFieldContent },
        displayValue() !== "" ? displayValue() : (local.placeholder ?? "\xA0"),
      ),
      /* @__PURE__ */ React.createElement("input", {
        ...rest,
        ...inputProps(),
        class: [textFieldInput, textField(objPick(local, textField.variants())), local.class]
          .filterExists()
          .join(" "),
      }),
    ),
  );
};
export { TextField };
//# sourceMappingURL=text-field.js.map
