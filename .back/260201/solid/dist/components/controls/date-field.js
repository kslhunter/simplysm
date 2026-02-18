import { Show, splitProps } from "solid-js";
import { createFieldState } from "../../hooks/createFieldState";
import { dateField, dateFieldContainer, dateFieldContent, dateFieldInput } from "./date-field.css";
import { objPick, DateOnly } from "@simplysm/core-common";
import "@simplysm/core-common";
const DateField = (props) => {
  const [local, rest] = splitProps(props, [
    ...dateField.variants(),
    "class",
    "value",
    "onChange",
    "type",
    "min",
    "max",
    "placeholder",
  ]);
  const fieldState = createFieldState({
    value: () => local.value,
    onChange: () => local.onChange,
  });
  const inputType = () => {
    switch (local.type) {
      case "month":
        return "month";
      case "year":
        return "number";
      // 네이티브 year picker가 없으므로 number 사용
      default:
        return "date";
    }
  };
  const inputValue = () => {
    const value = fieldState.currentValue();
    if (value === void 0) return "";
    switch (local.type) {
      case "month":
        return value.toFormatString("yyyy-MM");
      case "year":
        return String(value.year);
      default:
        return value.toFormatString("yyyy-MM-dd");
    }
  };
  const displayValue = () => {
    const value = fieldState.currentValue();
    if (value === void 0) return "";
    switch (local.type) {
      case "month":
        return value.toFormatString("yyyy-MM");
      case "year":
        return String(value.year);
      default:
        return value.toFormatString("yyyy-MM-dd");
    }
  };
  const minValue = () => {
    if (local.min === void 0) return void 0;
    switch (local.type) {
      case "month":
        return local.min.toFormatString("yyyy-MM");
      case "year":
        return String(local.min.year);
      default:
        return local.min.toFormatString("yyyy-MM-dd");
    }
  };
  const maxValue = () => {
    if (local.max === void 0) return void 0;
    switch (local.type) {
      case "month":
        return local.max.toFormatString("yyyy-MM");
      case "year":
        return String(local.max.year);
      default:
        return local.max.toFormatString("yyyy-MM-dd");
    }
  };
  const handleChange = (e) => {
    const input = e.currentTarget;
    if (input.value === "") {
      fieldState.setValue(void 0);
      return;
    }
    try {
      let newValue;
      switch (local.type) {
        case "month": {
          const parts = input.value.split("-").map(Number);
          const year = parts[0];
          const month = parts[1];
          if (
            year != null &&
            month != null &&
            !Number.isNaN(year) &&
            !Number.isNaN(month) &&
            month >= 1 &&
            month <= 12
          ) {
            newValue = new DateOnly(year, month, 1);
          }
          break;
        }
        case "year": {
          const year = Number(input.value);
          if (!Number.isNaN(year) && year > 0 && year <= 9999) {
            newValue = new DateOnly(year, 1, 1);
          }
          break;
        }
        default: {
          newValue = DateOnly.parse(input.value);
        }
      }
      if (newValue !== void 0) {
        fieldState.setValue(newValue);
      }
    } catch {}
  };
  const inputProps = () => ({
    "type": inputType(),
    "value": inputValue(),
    "onChange": handleChange,
    "min": minValue(),
    "max": maxValue(),
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
        class: [dateField(objPick(local, dateField.variants())), local.class]
          .filterExists()
          .join(" "),
      }),
    },
    /* @__PURE__ */ React.createElement(
      "div",
      { class: dateFieldContainer },
      /* @__PURE__ */ React.createElement(
        "div",
        { class: dateFieldContent },
        displayValue() !== "" ? displayValue() : (local.placeholder ?? "\xA0"),
      ),
      /* @__PURE__ */ React.createElement("input", {
        ...rest,
        ...inputProps(),
        class: [dateFieldInput, dateField(objPick(local, dateField.variants())), local.class]
          .filterExists()
          .join(" "),
      }),
    ),
  );
};
export { DateField };
//# sourceMappingURL=date-field.js.map
