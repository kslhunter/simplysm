import { Show, splitProps } from "solid-js";
import { createFieldState } from "../../hooks/createFieldState";
import {
  dateTimeField,
  dateTimeFieldContainer,
  dateTimeFieldContent,
  dateTimeFieldInput,
} from "./datetime-field.css";
import { objPick, DateTime } from "@simplysm/core-common";
import "@simplysm/core-common";
const DateTimeField = (props) => {
  const [local, rest] = splitProps(props, [
    ...dateTimeField.variants(),
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
  const step = () => (local.type === "datetime-sec" ? "1" : void 0);
  const inputValue = () => {
    const value = fieldState.currentValue();
    if (value === void 0) return "";
    if (local.type === "datetime-sec") {
      return value.toFormatString("yyyy-MM-ddTHH:mm:ss");
    }
    return value.toFormatString("yyyy-MM-ddTHH:mm");
  };
  const displayValue = () => {
    const value = fieldState.currentValue();
    if (value === void 0) return "";
    if (local.type === "datetime-sec") {
      return value.toFormatString("yyyy-MM-dd HH:mm:ss");
    }
    return value.toFormatString("yyyy-MM-dd HH:mm");
  };
  const minValue = () => {
    if (local.min === void 0) return void 0;
    if (local.type === "datetime-sec") {
      return local.min.toFormatString("yyyy-MM-ddTHH:mm:ss");
    }
    return local.min.toFormatString("yyyy-MM-ddTHH:mm");
  };
  const maxValue = () => {
    if (local.max === void 0) return void 0;
    if (local.type === "datetime-sec") {
      return local.max.toFormatString("yyyy-MM-ddTHH:mm:ss");
    }
    return local.max.toFormatString("yyyy-MM-ddTHH:mm");
  };
  const handleChange = (e) => {
    const input = e.currentTarget;
    if (input.value === "") {
      fieldState.setValue(void 0);
      return;
    }
    try {
      const splitParts = input.value.split("T");
      const datePart = splitParts[0];
      const timePart = splitParts[1];
      if (datePart != null && datePart !== "" && timePart != null && timePart !== "") {
        const dateComponents = datePart.split("-").map(Number);
        const year = dateComponents[0];
        const month = dateComponents[1];
        const day = dateComponents[2];
        const timeParts = timePart.split(":").map(Number);
        const hour = timeParts[0];
        const minute = timeParts[1];
        const second = timeParts[2] ?? 0;
        if (
          year !== void 0 &&
          month !== void 0 &&
          day !== void 0 &&
          hour !== void 0 &&
          minute !== void 0 &&
          !Number.isNaN(year) &&
          !Number.isNaN(month) &&
          !Number.isNaN(day) &&
          !Number.isNaN(hour) &&
          !Number.isNaN(minute) &&
          !Number.isNaN(second) &&
          month >= 1 &&
          month <= 12 &&
          day >= 1 &&
          day <= 31 &&
          hour >= 0 &&
          hour <= 23 &&
          minute >= 0 &&
          minute <= 59 &&
          second >= 0 &&
          second <= 59
        ) {
          const newValue = new DateTime(year, month, day, hour, minute, second);
          fieldState.setValue(newValue);
        }
      }
    } catch {}
  };
  const inputProps = () => ({
    "type": "datetime-local",
    "value": inputValue(),
    "onChange": handleChange,
    "min": minValue(),
    "max": maxValue(),
    "step": step(),
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
        class: [dateTimeField(objPick(local, dateTimeField.variants())), local.class]
          .filterExists()
          .join(" "),
      }),
    },
    /* @__PURE__ */ React.createElement(
      "div",
      { class: dateTimeFieldContainer },
      /* @__PURE__ */ React.createElement(
        "div",
        { class: dateTimeFieldContent },
        displayValue() !== "" ? displayValue() : (local.placeholder ?? "\xA0"),
      ),
      /* @__PURE__ */ React.createElement("input", {
        ...rest,
        ...inputProps(),
        class: [
          dateTimeFieldInput,
          dateTimeField(objPick(local, dateTimeField.variants())),
          local.class,
        ]
          .filterExists()
          .join(" "),
      }),
    ),
  );
};
export { DateTimeField };
//# sourceMappingURL=datetime-field.js.map
